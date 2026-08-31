import Link from "next/link";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";

function StatCard({
  label,
  value,
  unit,
}: {
  label: string;
  value: string;
  unit: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-surface p-5">
      <p className="text-xs uppercase tracking-widest text-mist">{label}</p>
      <p className="mt-2 font-mono text-3xl font-medium">
        {value}
        <span className="ml-1 text-sm text-mist">{unit}</span>
      </p>
    </div>
  );
}

export default async function HomePage() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    return (
      <div className="space-y-6">
        <section>
          <p className="font-mono text-xs uppercase tracking-widest text-mist">
            Bitácora
          </p>
          <h1 className="mt-2 font-display text-3xl font-medium tracking-tight">
            Todo lo que registrás, en un solo lugar.
          </h1>
          <p className="mt-2 max-w-xl text-mist">
            Rutinas, series, comidas y progreso. Creá una cuenta o entrá para
            empezar.
          </p>
        </section>

        <section className="flex gap-3">
          <Link
            href="/login"
            className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-surface transition-opacity hover:opacity-90"
          >
            Iniciar sesión
          </Link>
          <Link
            href="/register"
            className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-ink transition-colors hover:border-accent"
          >
            Crear cuenta
          </Link>
        </section>
      </div>
    );
  }

  const greetingName = session.user.name ?? session.user.email ?? "de nuevo";

  return (
    <div className="space-y-10">
      <section>
        <p className="font-mono text-xs uppercase tracking-widest text-mist">
          Hoy
        </p>
        <h1 className="mt-2 font-display text-3xl font-medium tracking-tight">
          Hola, {greetingName}.
        </h1>
        <p className="mt-2 max-w-xl text-mist">
          Rutinas, series, comidas y progreso — la base para tu próxima etapa
          de hipertrofia y fuerza.
        </p>
      </section>

      <section className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Entrenamientos esta semana" value="0" unit="sesiones" />
        <StatCard label="Calorías hoy" value="0" unit="/ 0 kcal" />
        <StatCard label="Racha actual" value="0" unit="días" />
      </section>

      <section className="rounded-xl border border-border bg-surface p-6">
        <h2 className="font-display text-lg font-medium">Próximo paso</h2>
        <p className="mt-2 text-sm text-mist">
          Estas pantallas son el punto de partida. Conectá la base de datos y
          seguimos cableando rutinas, registro de series y comidas reales.
        </p>
      </section>
    </div>
  );
}
