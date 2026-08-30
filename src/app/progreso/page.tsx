export default function ProgresoPage() {
  return (
    <div className="space-y-6">
      <div>
        <p className="font-mono text-xs uppercase tracking-widest text-mist">
          Progreso
        </p>
        <h1 className="mt-2 font-display text-2xl font-medium tracking-tight">
          Evolución de fuerza y composición corporal
        </h1>
      </div>
      <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-mist">
        Acá van a vivir los gráficos de progreso a lo largo del tiempo,
        basados en <code className="font-mono text-ink">SetLog</code> (fuerza
        por ejercicio) y <code className="font-mono text-ink">
          BodyMeasurement
        </code>{" "}
        (peso, medidas, fotos).
      </div>
    </div>
  );
}
