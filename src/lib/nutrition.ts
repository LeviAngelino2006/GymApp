import type { Sex } from "@prisma/client";

/**
 * Utilidades puras de nutrición. Sin acceso a base de datos ni side-effects.
 */

/** Edad en años cumplidos entre `birthDate` y `atDate` (default: ahora). */
export function calculateAge(birthDate: Date, atDate: Date = new Date()): number {
  // Se usa el calendario UTC para ser consistente con birthDate, que se
  // guarda al mediodía UTC.
  let age = atDate.getUTCFullYear() - birthDate.getUTCFullYear();
  const monthDiff = atDate.getUTCMonth() - birthDate.getUTCMonth();
  if (
    monthDiff < 0 ||
    (monthDiff === 0 && atDate.getUTCDate() < birthDate.getUTCDate())
  ) {
    age -= 1;
  }
  return age;
}

/**
 * Metabolismo basal según Mifflin-St Jeor.
 * Referencia: hombre, 30 años, 80 kg, 180 cm → 1780.
 */
export function calculateBMR(
  sex: Sex,
  weightKg: number,
  heightCm: number,
  age: number,
): number {
  const base = 10 * weightKg + 6.25 * heightCm - 5 * age;
  const male = base + 5;
  const female = base - 161;

  switch (sex) {
    case "MALE":
      return male;
    case "FEMALE":
      return female;
    case "OTHER":
      return (male + female) / 2;
  }
}

/**
 * Multiplicador de actividad:
 * - entreno hoy → 1.55
 * - sin entreno hoy pero con alguna sesión en los últimos 6 días → 1.375
 * - sin sesiones recientes → 1.2
 */
export function determineActivityMultiplier(
  hasSessionToday: boolean,
  hasSessionInLastNDays: boolean,
): number {
  if (hasSessionToday) return 1.55;
  if (hasSessionInLastNDays) return 1.375;
  return 1.2;
}

export interface DailyGoal {
  calorieTarget: number;
  proteinTargetG: number;
  carbsTargetG: number;
  fatTargetG: number;
}

/**
 * Objetivo diario de calorías y macros.
 * - calorías = round(bmr × multiplicador)
 * - proteína = peso × 2 g (fase de fuerza/hipertrofia: se prioriza proteína)
 * - grasa = 25% de las calorías / 9
 * - carbos = calorías restantes / 4
 *
 * Si los carbos dieran negativo (proteína + grasa ya superan las calorías),
 * se bajan los carbos a 0 y se recorta la grasa a lo que quede después de la
 * proteína — es decir, el % de grasa se ajusta hacia abajo.
 */
export function calculateDailyGoal(
  bmr: number,
  multiplier: number,
  weightKg: number,
): DailyGoal {
  const calorieTarget = Math.round(bmr * multiplier);
  const proteinTargetG = weightKg * 2;

  let fatTargetG = (calorieTarget * 0.25) / 9;
  let carbsTargetG =
    (calorieTarget - proteinTargetG * 4 - fatTargetG * 9) / 4;

  if (carbsTargetG < 0) {
    carbsTargetG = 0;
    const caloriesLeftForFat = calorieTarget - proteinTargetG * 4;
    fatTargetG = caloriesLeftForFat > 0 ? caloriesLeftForFat / 9 : 0;
  }

  return { calorieTarget, proteinTargetG, carbsTargetG, fatTargetG };
}
