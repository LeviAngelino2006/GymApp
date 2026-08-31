"use server";

import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { z } from "zod";

import { authOptions } from "@/lib/auth";
import { parseCalendarDateNotFuture, utcDayRange } from "@/lib/day";
import { prisma } from "@/lib/prisma";

async function requireUserId(): Promise<string> {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  if (!userId) {
    throw new Error("Necesitás iniciar sesión para hacer esto.");
  }
  return userId;
}

const MEAL_TYPES = ["BREAKFAST", "LUNCH", "DINNER", "SNACK"] as const;

// --- Búsqueda de alimentos (Open Food Facts) ---

export interface FoodResult {
  code: string;
  name: string;
  brand: string | null;
  kcalPer100g: number;
  proteinPer100g: number | null;
  carbsPer100g: number | null;
  fatPer100g: number | null;
}

export interface SearchFoodResult {
  results: FoodResult[];
  error: boolean;
}

function toNumber(value: unknown): number | null {
  const n =
    typeof value === "number"
      ? value
      : typeof value === "string"
        ? Number.parseFloat(value)
        : NaN;
  return Number.isFinite(n) ? n : null;
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

/** Macro por 100g: descarta valores no numéricos o negativos. */
function macroPer100g(value: unknown): number | null {
  const n = toNumber(value);
  if (n == null || n < 0) return null;
  return round1(n);
}

export async function searchFood(query: string): Promise<SearchFoodResult> {
  const term = query.trim();
  if (term.length < 2) return { results: [], error: false };

  try {
    const url =
      "https://world.openfoodfacts.org/cgi/search.pl" +
      `?search_terms=${encodeURIComponent(term)}` +
      "&search_simple=1&action=process&json=1&page_size=15" +
      "&fields=code,product_name,brands,nutriments";

    const response = await fetch(url, {
      headers: { "User-Agent": "Bitacora/0.1 (uso personal)" },
      cache: "no-store",
    });

    if (!response.ok) return { results: [], error: true };

    const data: unknown = await response.json();
    const products =
      data && typeof data === "object" && Array.isArray((data as any).products)
        ? ((data as any).products as unknown[])
        : [];

    const seen = new Set<string>();
    const results: FoodResult[] = [];

    for (const raw of products) {
      if (!raw || typeof raw !== "object") continue;
      const product = raw as Record<string, unknown>;

      const name =
        typeof product.product_name === "string"
          ? product.product_name.trim()
          : "";
      const nutriments =
        product.nutriments && typeof product.nutriments === "object"
          ? (product.nutriments as Record<string, unknown>)
          : {};

      const kcal = toNumber(nutriments["energy-kcal_100g"]);
      if (!name || kcal == null || kcal <= 0) continue;

      const code = String(product.code ?? "");
      const dedupeKey = code || name.toLowerCase();
      if (seen.has(dedupeKey)) continue;
      seen.add(dedupeKey);

      const brandRaw =
        typeof product.brands === "string" ? product.brands.trim() : "";
      const brand = brandRaw ? brandRaw.split(",")[0].trim() : null;

      results.push({
        code,
        name,
        brand: brand || null,
        kcalPer100g: round1(kcal),
        proteinPer100g: macroPer100g(nutriments.proteins_100g),
        carbsPer100g: macroPer100g(nutriments.carbohydrates_100g),
        fatPer100g: macroPer100g(nutriments.fat_100g),
      });
    }

    return { results, error: false };
  } catch {
    return { results: [], error: true };
  }
}

// --- Registro de comidas ---

const optionalPer100g = z
  .union([
    z.literal(""),
    z.coerce
      .number()
      .min(0, "Los valores por 100 g no pueden ser negativos")
      .max(10000, "Valor por 100 g demasiado alto"),
  ])
  .transform((v) => (v === "" ? null : v));

const optionalGrams = z
  .union([
    z.literal(""),
    z.coerce
      .number()
      .gt(0, "La cantidad tiene que ser mayor a 0")
      .max(3000, "Máximo 3000 g"),
  ])
  .transform((v) => (v === "" ? null : v));

const logMealItemSchema = z.object({
  mealType: z.enum(MEAL_TYPES),
  foodName: z
    .string()
    .trim()
    .min(1, "Poné el nombre del alimento")
    .max(200, "Nombre demasiado largo"),
  quantityGrams: optionalGrams,
  kcalPer100g: optionalPer100g,
  proteinPer100g: optionalPer100g,
  carbsPer100g: optionalPer100g,
  fatPer100g: optionalPer100g,
});

export async function logMealItem(formData: FormData) {
  const userId = await requireUserId();

  const mealDate = parseCalendarDateNotFuture(formData.get("date"));
  if (!mealDate.ok) {
    throw new Error(mealDate.message);
  }

  // "scaled": los valores vienen por 100 g y se escalan por la cantidad (buscador).
  // "direct": los valores ya son de la porción (carga manual); la cantidad, si
  // viene, es sólo informativa.
  const scaled = formData.get("scaleByQuantity") === "1";

  const parsed = logMealItemSchema.safeParse({
    mealType: formData.get("mealType"),
    foodName: formData.get("foodName"),
    quantityGrams: formData.get("quantityGrams") ?? "",
    kcalPer100g: formData.get("kcalPer100g") ?? "",
    proteinPer100g: formData.get("proteinPer100g") ?? "",
    carbsPer100g: formData.get("carbsPer100g") ?? "",
    fatPer100g: formData.get("fatPer100g") ?? "",
  });
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Datos inválidos");
  }

  const {
    mealType,
    foodName,
    quantityGrams,
    kcalPer100g,
    proteinPer100g,
    carbsPer100g,
    fatPer100g,
  } = parsed.data;

  if (scaled && quantityGrams == null) {
    throw new Error("Poné la cantidad en gramos");
  }

  // Recalculado server-side: no se confía en totales que mande el cliente.
  const factor = scaled && quantityGrams != null ? quantityGrams / 100 : 1;
  const calories = Math.round((kcalPer100g ?? 0) * factor);
  const proteinG = proteinPer100g == null ? null : round1(proteinPer100g * factor);
  const carbsG = carbsPer100g == null ? null : round1(carbsPer100g * factor);
  const fatG = fatPer100g == null ? null : round1(fatPer100g * factor);

  const { start, end } = utcDayRange(mealDate.date);

  let meal = await prisma.meal.findFirst({
    where: { userId, mealType, mealDate: { gte: start, lt: end } },
    select: { id: true },
  });
  if (!meal) {
    meal = await prisma.meal.create({
      data: { userId, mealType, mealDate: mealDate.date },
      select: { id: true },
    });
  }

  await prisma.mealItem.create({
    data: {
      mealId: meal.id,
      foodName,
      quantityGrams,
      calories,
      proteinG,
      carbsG,
      fatG,
    },
  });

  revalidatePath("/nutricion");
}

export async function removeMealItem(id: string) {
  const userId = await requireUserId();

  // Sólo borra si el item cuelga de un Meal del usuario.
  await prisma.mealItem.deleteMany({ where: { id, meal: { userId } } });

  revalidatePath("/nutricion");
}
