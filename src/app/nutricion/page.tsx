export default function NutricionPage() {
  return (
    <div className="space-y-6">
      <div>
        <p className="font-mono text-xs uppercase tracking-widest text-mist">
          Nutrición
        </p>
        <h1 className="mt-2 font-display text-2xl font-medium tracking-tight">
          Comidas y objetivos diarios
        </h1>
      </div>
      <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-mist">
        Acá van a vivir el registro de comidas y el objetivo calórico/macro
        del día. Falta conectar{" "}
        <code className="font-mono text-ink">Meal</code>,{" "}
        <code className="font-mono text-ink">MealItem</code> y{" "}
        <code className="font-mono text-ink">NutritionGoal</code>, además de
        la búsqueda de alimentos vía Open Food Facts.
      </div>
    </div>
  );
}
