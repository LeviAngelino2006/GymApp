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

export default function HomePage() {
  return (
    <div className="space-y-10">
      <section>
        <p className="font-mono text-xs uppercase tracking-widest text-mist">
          Hoy
        </p>
        <h1 className="mt-2 font-display text-3xl font-medium tracking-tight">
          Todo lo que registrás, en un solo lugar.
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
