export default function EntrenamientoPage() {
  return (
    <div className="space-y-6">
      <div>
        <p className="font-mono text-xs uppercase tracking-widest text-mist">
          Entrenamiento
        </p>
        <h1 className="mt-2 font-display text-2xl font-medium tracking-tight">
          Rutinas y registro de series
        </h1>
      </div>
      <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-mist">
        Acá van a vivir tus rutinas y la pantalla de registro en vivo (peso,
        reps, RPE). Falta conectar el modelo de datos —{" "}
        <code className="font-mono text-ink">Routine</code>,{" "}
        <code className="font-mono text-ink">WorkoutSession</code> y{" "}
        <code className="font-mono text-ink">SetLog</code>.
      </div>
    </div>
  );
}
