import Link from "next/link";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { calculateE1RM } from "@/lib/progress";

import { ProgressLineChart } from "./line-chart";

const dateFormatter = new Intl.DateTimeFormat("es-AR", {
  day: "2-digit",
  month: "short",
  timeZone: "UTC",
});

function PageHeader() {
  return (
    <div>
      <p className="font-mono text-xs uppercase tracking-widest text-mist">
        Progreso
      </p>
      <h1 className="mt-2 font-display text-2xl font-medium tracking-tight">
        Evolución de fuerza y composición corporal
      </h1>
    </div>
  );
}

export default async function ProgresoPage({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined };
}) {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;

  if (!userId) {
    return (
      <div className="space-y-6">
        <PageHeader />
        <div className="rounded-xl border border-border bg-surface p-6">
          <h2 className="font-display text-lg font-medium">
            Entrá para ver tu progreso
          </h2>
          <p className="mt-2 text-sm text-mist">
            Necesitás una cuenta para ver la evolución de tu fuerza y tu peso.
          </p>
          <div className="mt-4 flex gap-3">
            <Link
              href="/login"
              className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-surface transition-opacity hover:opacity-90"
            >
              Iniciar sesión
            </Link>
            <Link
              href="/register"
              className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-ink transition-colors hover:border-ink"
            >
              Crear cuenta
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const setLogs = await prisma.setLog.findMany({
    where: { session: { userId } },
    select: {
      exerciseId: true,
      weightKg: true,
      reps: true,
      setType: true,
      session: { select: { id: true, sessionDate: true } },
      exercise: { select: { name: true } },
    },
    orderBy: { session: { sessionDate: "asc" } },
  });

  if (setLogs.length === 0) {
    return (
      <div className="space-y-6">
        <PageHeader />
        <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-mist">
          Todavía no registraste ningún entrenamiento. Cargá tu primera sesión en{" "}
          <Link href="/entrenamiento" className="text-accent hover:underline">
            Entrenamiento
          </Link>{" "}
          y acá vas a ver cómo evoluciona tu fuerza.
        </div>
      </div>
    );
  }

  // Ejercicios distintos con series registradas + cuál fue el último entrenado.
  const exerciseMap = new Map<
    string,
    { id: string; name: string; lastDate: Date }
  >();
  for (const row of setLogs) {
    const prev = exerciseMap.get(row.exerciseId);
    if (!prev || row.session.sessionDate > prev.lastDate) {
      exerciseMap.set(row.exerciseId, {
        id: row.exerciseId,
        name: row.exercise.name,
        lastDate: row.session.sessionDate,
      });
    }
  }

  const exercises = [...exerciseMap.values()].sort((a, b) =>
    a.name.localeCompare(b.name, "es"),
  );
  const mostRecent = [...exerciseMap.values()].reduce((a, b) =>
    b.lastDate > a.lastDate ? b : a,
  );

  const requested =
    typeof searchParams.ejercicio === "string"
      ? searchParams.ejercicio
      : undefined;
  const selectedId =
    requested && exerciseMap.has(requested) ? requested : mostRecent.id;
  const selected = exerciseMap.get(selectedId)!;

  // e1RM máximo por sesión para el ejercicio elegido, en orden cronológico.
  // Se excluyen SOLO las series de calentamiento (setType === "WARMUP"). Las
  // series en modo básico (setType === null, el caso más común) y las
  // WORKING/FAILURE/DROPSET sí cuentan — el filtro se hace acá en JS, donde
  // `null === "WARMUP"` es false, y no en la query (donde el manejo de null de
  // un `not` de Prisma es ambiguo).
  const bySession = new Map<string, { date: Date; maxE1RM: number }>();
  for (const row of setLogs) {
    if (row.exerciseId !== selectedId) continue;
    if (row.setType === "WARMUP") continue;
    const e1rm = calculateE1RM(row.weightKg, row.reps);
    const current = bySession.get(row.session.id);
    if (!current) {
      bySession.set(row.session.id, {
        date: row.session.sessionDate,
        maxE1RM: e1rm,
      });
    } else if (e1rm > current.maxE1RM) {
      current.maxE1RM = e1rm;
    }
  }

  const strengthPoints = [...bySession.values()]
    .sort((a, b) => a.date.getTime() - b.date.getTime())
    .map((entry) => ({
      x: dateFormatter.format(entry.date),
      y: Math.round(entry.maxE1RM * 100) / 100,
    }));

  const measurements = await prisma.bodyMeasurement.findMany({
    where: { userId, weightKg: { not: null } },
    orderBy: { measuredAt: "asc" },
    select: { measuredAt: true, weightKg: true },
  });

  const weightPoints = measurements.map((measurement) => ({
    x: dateFormatter.format(measurement.measuredAt),
    y: Math.round((measurement.weightKg ?? 0) * 10) / 10,
  }));

  return (
    <div className="space-y-8">
      <PageHeader />

      <section className="space-y-4">
        <h2 className="font-display text-lg font-medium">
          Progresión de fuerza
        </h2>

        <div className="flex flex-wrap gap-2">
          {exercises.map((exercise) => (
            <Link
              key={exercise.id}
              href={`/progreso?ejercicio=${exercise.id}`}
              className={`rounded-lg border px-3 py-1.5 text-sm transition-colors ${
                exercise.id === selectedId
                  ? "border-accent bg-accent text-surface"
                  : "border-border text-mist hover:border-ink hover:text-ink"
              }`}
            >
              {exercise.name}
            </Link>
          ))}
        </div>

        <div className="rounded-xl border border-border bg-surface p-5">
          <div className="flex items-baseline justify-between gap-4">
            <p className="text-sm font-medium">{selected.name}</p>
            <p className="font-mono text-xs text-mist">
              1RM estimado (Epley) · {strengthPoints.length}{" "}
              {strengthPoints.length === 1 ? "sesión" : "sesiones"}
            </p>
          </div>
          <div className="mt-3">
            <ProgressLineChart points={strengthPoints} yUnit="kg" />
          </div>
          {strengthPoints.length === 1 && (
            <p className="mt-2 font-mono text-xs text-mist">
              Con una sola sesión todavía no hay tendencia — cargá más
              entrenamientos de este ejercicio.
            </p>
          )}
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="font-display text-lg font-medium">Peso corporal</h2>

        {weightPoints.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-mist">
            Todavía no registraste ningún peso. Cargá una medición en{" "}
            <Link href="/perfil" className="text-accent hover:underline">
              Perfil
            </Link>{" "}
            y acá vas a ver la evolución.
          </div>
        ) : (
          <div className="rounded-xl border border-border bg-surface p-5">
            <div className="flex items-baseline justify-between gap-4">
              <p className="text-sm font-medium">Peso</p>
              <p className="font-mono text-xs text-mist">
                {weightPoints.length}{" "}
                {weightPoints.length === 1 ? "medición" : "mediciones"}
              </p>
            </div>
            <div className="mt-3">
              <ProgressLineChart points={weightPoints} yUnit="kg" />
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
