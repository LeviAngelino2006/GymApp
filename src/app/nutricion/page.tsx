import Link from "next/link";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { getOrCalculateTodayGoal } from "@/lib/nutrition-goal";
import { prisma } from "@/lib/prisma";

import { FoodLogger } from "./food-logger";
import { RemoveMealItemButton } from "./remove-meal-item-button";

const MEAL_SECTIONS = [
  { type: "BREAKFAST", label: "Desayuno" },
  { type: "LUNCH", label: "Almuerzo" },
  { type: "DINNER", label: "Cena" },
  { type: "SNACK", label: "Snack" },
] as const;

function todayRangeUTC(): { start: Date; end: Date } {
  const now = new Date();
  const start = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  );
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
  return { start, end };
}

function suggestedMealType(): string {
  const hour = new Date().getHours();
  if (hour < 11) return "BREAKFAST";
  if (hour < 16) return "LUNCH";
  if (hour < 21) return "DINNER";
  return "SNACK";
}

function PageHeader() {
  return (
    <div>
      <p className="font-mono text-xs uppercase tracking-widest text-mist">
        Nutrición
      </p>
      <h1 className="mt-2 font-display text-2xl font-medium tracking-tight">
        Objetivo calórico del día
      </h1>
    </div>
  );
}

const macroFormatter = new Intl.NumberFormat("es-AR", {
  maximumFractionDigits: 0,
});

export default async function NutricionPage() {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;

  if (!userId) {
    return (
      <div className="space-y-6">
        <PageHeader />
        <div className="rounded-xl border border-border bg-surface p-6">
          <h2 className="font-display text-lg font-medium">
            Entrá para ver tu objetivo del día
          </h2>
          <p className="mt-2 text-sm text-mist">
            Necesitás una cuenta para calcular tus calorías y macros.
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

  const result = await getOrCalculateTodayGoal(userId);

  if (result.status === "incomplete-profile") {
    return (
      <div className="space-y-6">
        <PageHeader />
        <div className="rounded-xl border border-border bg-surface p-6">
          <h2 className="font-display text-lg font-medium">
            Completá tu perfil para calcular el objetivo
          </h2>
          <p className="mt-2 text-sm text-mist">
            Para estimar tus calorías y macros nos falta que cargues:{" "}
            {result.missing.join(", ")}.
          </p>
          <Link
            href="/perfil"
            className="mt-4 inline-block rounded-lg bg-accent px-4 py-2 text-sm font-medium text-surface transition-opacity hover:opacity-90"
          >
            Ir al perfil
          </Link>
        </div>
      </div>
    );
  }

  const { goal, isTrainingDay, activityMultiplier } = result;

  const macros = [
    { label: "Proteínas", value: goal.proteinTargetG },
    { label: "Carbohidratos", value: goal.carbsTargetG },
    { label: "Grasas", value: goal.fatTargetG },
  ];

  const { start, end } = todayRangeUTC();
  const meals = await prisma.meal.findMany({
    where: { userId, mealDate: { gte: start, lt: end } },
    include: { mealItems: { orderBy: { id: "asc" } } },
  });

  const items = meals.flatMap((meal) =>
    meal.mealItems.map((item) => ({ ...item, mealType: meal.mealType })),
  );

  const consumed = items.reduce(
    (acc, item) => ({
      kcal: acc.kcal + item.calories,
      protein: acc.protein + (item.proteinG ?? 0),
      carbs: acc.carbs + (item.carbsG ?? 0),
      fat: acc.fat + (item.fatG ?? 0),
    }),
    { kcal: 0, protein: 0, carbs: 0, fat: 0 },
  );

  const progress = [
    { label: "Calorías", unit: "kcal", value: consumed.kcal, target: goal.calorieTarget },
    { label: "Proteínas", unit: "g", value: consumed.protein, target: goal.proteinTargetG },
    { label: "Carbohidratos", unit: "g", value: consumed.carbs, target: goal.carbsTargetG },
    { label: "Grasas", unit: "g", value: consumed.fat, target: goal.fatTargetG },
  ];

  return (
    <div className="space-y-6">
      <PageHeader />

      <div className="rounded-xl border border-border bg-surface p-6">
        <div className="flex items-center justify-between">
          <p className="font-mono text-xs uppercase tracking-widest text-mist">
            {isTrainingDay ? "Día de entreno" : "Día de descanso"}
          </p>
          <p className="font-mono text-xs text-mist">
            ×{activityMultiplier}
          </p>
        </div>

        <p className="mt-3 font-mono text-5xl font-medium tracking-tight">
          {macroFormatter.format(goal.calorieTarget)}
          <span className="ml-2 text-base text-mist">kcal</span>
        </p>

        <div className="mt-6 grid grid-cols-3 gap-4 border-t border-border pt-4">
          {macros.map((macro) => (
            <div key={macro.label}>
              <p className="font-mono text-2xl font-medium">
                {macroFormatter.format(macro.value)}
                <span className="ml-1 text-sm text-mist">g</span>
              </p>
              <p className="mt-1 text-xs uppercase tracking-widest text-mist">
                {macro.label}
              </p>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-border bg-surface p-6">
        <h2 className="font-display text-lg font-medium">Consumido hoy</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-4">
          {progress.map((row) => {
            const pct =
              row.target > 0
                ? Math.min(100, Math.round((row.value / row.target) * 100))
                : 0;
            const remaining = Math.round(row.target - row.value);
            return (
              <div key={row.label}>
                <p className="text-xs uppercase tracking-widest text-mist">
                  {row.label}
                </p>
                <p className="mt-1 font-mono text-xl font-medium">
                  {macroFormatter.format(row.value)}
                  <span className="text-sm text-mist">
                    {" "}
                    / {macroFormatter.format(row.target)} {row.unit}
                  </span>
                </p>
                <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-background">
                  <div
                    className="h-full bg-accent"
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <p className="mt-1 font-mono text-xs text-mist">
                  {remaining >= 0
                    ? `Te quedan ${macroFormatter.format(remaining)} ${row.unit}`
                    : `Te pasaste ${macroFormatter.format(-remaining)} ${row.unit}`}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      <FoodLogger defaultMealType={suggestedMealType()} />

      <div className="rounded-xl border border-border bg-surface p-6">
        <h2 className="font-display text-lg font-medium">Comidas de hoy</h2>
        {items.length === 0 ? (
          <p className="mt-2 text-sm text-mist">
            Todavía no cargaste nada hoy. Usá el buscador de arriba.
          </p>
        ) : (
          <div className="mt-4 space-y-5">
            {MEAL_SECTIONS.map((section) => {
              const sectionItems = items.filter(
                (item) => item.mealType === section.type,
              );
              if (sectionItems.length === 0) return null;

              const sectionKcal = sectionItems.reduce(
                (sum, item) => sum + item.calories,
                0,
              );

              return (
                <div key={section.type}>
                  <div className="flex items-baseline justify-between">
                    <p className="text-sm font-medium">{section.label}</p>
                    <p className="font-mono text-xs text-mist">
                      {macroFormatter.format(sectionKcal)} kcal
                    </p>
                  </div>
                  <ul className="mt-2 divide-y divide-border border-y border-border">
                    {sectionItems.map((item) => (
                      <li
                        key={item.id}
                        className="flex items-center justify-between gap-4 py-2"
                      >
                        <div>
                          <p className="text-sm">{item.foodName}</p>
                          <p className="mt-0.5 font-mono text-xs text-mist">
                            {item.quantityGrams != null &&
                              `${macroFormatter.format(item.quantityGrams)} g · `}
                            {macroFormatter.format(item.calories)} kcal
                            {item.proteinG != null &&
                              ` · P ${macroFormatter.format(item.proteinG)}`}
                            {item.carbsG != null &&
                              ` · C ${macroFormatter.format(item.carbsG)}`}
                            {item.fatG != null &&
                              ` · G ${macroFormatter.format(item.fatG)}`}
                          </p>
                        </div>
                        <RemoveMealItemButton
                          id={item.id}
                          foodName={item.foodName}
                        />
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
