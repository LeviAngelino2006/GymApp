import { prisma } from "@/lib/prisma";
import {
  calculateAge,
  calculateBMR,
  calculateDailyGoal,
  determineActivityMultiplier,
  type DailyGoal,
} from "@/lib/nutrition";

const DAY_MS = 24 * 60 * 60 * 1000;
const RECENT_WINDOW_DAYS = 6;

export type TodayGoalResult =
  | { status: "incomplete-profile"; missing: string[] }
  | {
      status: "ok";
      goal: DailyGoal;
      isTrainingDay: boolean;
      activityMultiplier: number;
    };

/** Fecha de hoy normalizada a mediodía UTC (mismo criterio que birthDate). */
function todayAtNoonUTC(now: Date = new Date()): Date {
  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 12),
  );
}

/**
 * Calcula (o recalcula) el objetivo nutricional de hoy para un usuario y lo
 * persiste con upsert sobre @@unique([userId, goalDate]). Idempotente: correrla
 * dos veces el mismo día actualiza el mismo registro.
 */
export async function getOrCalculateTodayGoal(
  userId: string,
): Promise<TodayGoalResult> {
  const [user, latestWeight] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { sex: true, heightCm: true, birthDate: true },
    }),
    prisma.bodyMeasurement.findFirst({
      where: { userId, weightKg: { not: null } },
      orderBy: { measuredAt: "desc" },
      select: { weightKg: true },
    }),
  ]);

  const missing: string[] = [];
  if (!user?.sex) missing.push("sexo");
  if (user?.heightCm == null) missing.push("altura");
  if (!user?.birthDate) missing.push("fecha de nacimiento");
  if (latestWeight?.weightKg == null) missing.push("una medición de peso");

  if (
    !user ||
    !user.sex ||
    user.heightCm == null ||
    !user.birthDate ||
    !latestWeight ||
    latestWeight.weightKg == null
  ) {
    return { status: "incomplete-profile", missing };
  }

  const now = new Date();
  const startOfToday = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  );
  const endOfToday = new Date(startOfToday.getTime() + DAY_MS);
  const recentWindowStart = new Date(
    startOfToday.getTime() - RECENT_WINDOW_DAYS * DAY_MS,
  );

  const [sessionToday, sessionRecent] = await Promise.all([
    prisma.workoutSession.findFirst({
      where: {
        userId,
        sessionDate: { gte: startOfToday, lt: endOfToday },
      },
      select: { id: true },
    }),
    prisma.workoutSession.findFirst({
      where: { userId, sessionDate: { gte: recentWindowStart } },
      select: { id: true },
    }),
  ]);

  const hasSessionToday = sessionToday !== null;
  const hasSessionInLastNDays = sessionRecent !== null;

  const weightKg = latestWeight.weightKg;
  const age = calculateAge(user.birthDate, now);
  const bmr = calculateBMR(user.sex, weightKg, user.heightCm, age);
  const activityMultiplier = determineActivityMultiplier(
    hasSessionToday,
    hasSessionInLastNDays,
  );
  const computed = calculateDailyGoal(bmr, activityMultiplier, weightKg);

  const goalDate = todayAtNoonUTC(now);

  const goal = await prisma.nutritionGoal.upsert({
    where: { userId_goalDate: { userId, goalDate } },
    create: { userId, goalDate, ...computed },
    update: { ...computed },
    select: {
      calorieTarget: true,
      proteinTargetG: true,
      carbsTargetG: true,
      fatTargetG: true,
    },
  });

  return {
    status: "ok",
    goal: {
      calorieTarget: goal.calorieTarget,
      proteinTargetG: goal.proteinTargetG ?? computed.proteinTargetG,
      carbsTargetG: goal.carbsTargetG ?? computed.carbsTargetG,
      fatTargetG: goal.fatTargetG ?? computed.fatTargetG,
    },
    isTrainingDay: hasSessionToday,
    activityMultiplier,
  };
}
