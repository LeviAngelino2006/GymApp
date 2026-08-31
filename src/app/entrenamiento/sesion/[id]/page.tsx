import Link from "next/link";
import { notFound } from "next/navigation";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

import { AddSetForm } from "./add-set-form";
import { RemoveSetButton } from "./remove-set-button";

const MUSCLE_GROUP_ORDER = [
  "Pecho",
  "Espalda",
  "Piernas",
  "Hombros",
  "Brazos",
  "Core",
];

const SET_TYPE_LABEL: Record<string, string> = {
  WARMUP: "Calentamiento",
  WORKING: "Trabajo",
  FAILURE: "Fallo",
  DROPSET: "Dropset",
};

const dateFormatter = new Intl.DateTimeFormat("es-AR", {
  weekday: "long",
  day: "2-digit",
  month: "long",
  year: "numeric",
});

export default async function SesionPage({
  params,
}: {
  params: { id: string };
}) {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;

  if (!userId) {
    return (
      <div className="space-y-6">
        <div className="rounded-xl border border-border bg-surface p-6">
          <h1 className="font-display text-lg font-medium">
            Entrá para registrar tu entrenamiento
          </h1>
          <p className="mt-2 text-sm text-mist">
            Necesitás una cuenta para cargar y ver tus sesiones.
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

  const workout = await prisma.workoutSession.findFirst({
    where: { id: params.id, userId },
    include: {
      routine: {
        include: {
          routineExercises: {
            orderBy: { order: "asc" },
            include: { exercise: true },
          },
        },
      },
      setLogs: {
        orderBy: { createdAt: "asc" },
        include: { exercise: true },
      },
    },
  });

  if (!workout) {
    notFound();
  }

  const catalog = await prisma.exercise.findMany({
    orderBy: [{ muscleGroup: "asc" }, { name: "asc" }],
  });

  // Ejercicios de la rutina primero en el select, después el resto del
  // catálogo agrupado por grupo muscular.
  const routineExercises = workout.routine?.routineExercises ?? [];
  const routineExerciseIds = new Set(
    routineExercises.map((item) => item.exerciseId),
  );

  const groups: { label: string; options: { id: string; name: string }[] }[] =
    [];

  if (routineExercises.length > 0) {
    const seen = new Set<string>();
    const options = routineExercises
      .filter((item) => {
        if (seen.has(item.exerciseId)) return false;
        seen.add(item.exerciseId);
        return true;
      })
      .map((item) => ({ id: item.exercise.id, name: item.exercise.name }));
    groups.push({ label: "De la rutina", options });
  }

  const restByGroup = new Map<string, { id: string; name: string }[]>();
  for (const exercise of catalog) {
    if (routineExerciseIds.has(exercise.id)) continue;
    const list = restByGroup.get(exercise.muscleGroup) ?? [];
    list.push({ id: exercise.id, name: exercise.name });
    restByGroup.set(exercise.muscleGroup, list);
  }
  [...restByGroup.entries()]
    .sort((a, b) => {
      const ia = MUSCLE_GROUP_ORDER.indexOf(a[0]);
      const ib = MUSCLE_GROUP_ORDER.indexOf(b[0]);
      return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
    })
    .forEach(([label, options]) => groups.push({ label, options }));

  // Series cargadas, agrupadas por ejercicio en orden de primera aparición.
  const setsByExercise = new Map<
    string,
    { name: string; muscleGroup: string; sets: typeof workout.setLogs }
  >();
  for (const setLog of workout.setLogs) {
    const entry = setsByExercise.get(setLog.exerciseId) ?? {
      name: setLog.exercise.name,
      muscleGroup: setLog.exercise.muscleGroup,
      sets: [],
    };
    entry.sets.push(setLog);
    setsByExercise.set(setLog.exerciseId, entry);
  }

  return (
    <div className="space-y-8">
      <div>
        <Link
          href="/entrenamiento"
          className="font-mono text-xs uppercase tracking-widest text-mist transition-colors hover:text-accent"
        >
          ← Volver a entrenamiento
        </Link>
        <h1 className="mt-3 font-display text-2xl font-medium tracking-tight">
          {workout.routine?.name ?? "Entreno libre"}
        </h1>
        <p className="mt-1 font-mono text-xs uppercase tracking-widest text-mist">
          {dateFormatter.format(workout.sessionDate)}
        </p>
      </div>

      {routineExercises.length > 0 && (
        <section className="rounded-xl border border-border bg-surface p-5">
          <h2 className="font-display text-lg font-medium">Plan de la rutina</h2>
          <ul className="mt-3 space-y-2">
            {routineExercises.map((item) => (
              <li
                key={item.id}
                className="flex items-center justify-between gap-4 text-sm"
              >
                <span>{item.exercise.name}</span>
                <span className="font-mono text-xs text-mist">
                  Plan: {item.targetSets} × {item.targetReps ?? "—"}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="rounded-xl border border-border bg-surface p-6">
        <h2 className="font-display text-lg font-medium">Series cargadas</h2>
        {setsByExercise.size === 0 ? (
          <p className="mt-2 text-sm text-mist">
            Todavía no cargaste ninguna serie. Usá el formulario de abajo.
          </p>
        ) : (
          <div className="mt-4 space-y-5">
            {[...setsByExercise.values()].map((entry) => (
              <div key={entry.name}>
                <p className="text-sm font-medium">
                  {entry.name}
                  <span className="ml-2 text-xs font-normal text-mist">
                    {entry.muscleGroup}
                  </span>
                </p>
                <ul className="mt-2 divide-y divide-border border-y border-border">
                  {entry.sets.map((setLog, index) => (
                    <li
                      key={setLog.id}
                      className="flex items-center justify-between gap-4 py-2"
                    >
                      <div className="flex items-baseline gap-3">
                        <span className="font-mono text-xs text-mist">
                          {index + 1}
                        </span>
                        <span className="font-mono text-sm">
                          {setLog.weightKg} kg × {setLog.reps}
                        </span>
                        <span className="font-mono text-xs text-mist">
                          {[
                            setLog.rpe != null ? `RPE ${setLog.rpe}` : null,
                            setLog.restSeconds != null
                              ? `${setLog.restSeconds}s`
                              : null,
                            setLog.setType
                              ? SET_TYPE_LABEL[setLog.setType]
                              : null,
                          ]
                            .filter(Boolean)
                            .join(" · ")}
                        </span>
                      </div>
                      <RemoveSetButton setLogId={setLog.id} />
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="rounded-xl border border-border bg-surface p-6">
        <h2 className="font-display text-lg font-medium">Agregar serie</h2>
        <AddSetForm sessionId={workout.id} groups={groups} />
      </section>
    </div>
  );
}
