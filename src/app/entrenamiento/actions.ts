"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { z } from "zod";

import { authOptions } from "@/lib/auth";
import { parseCalendarDateNotFuture } from "@/lib/day";
import { prisma } from "@/lib/prisma";

async function requireUserId(): Promise<string> {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  if (!userId) {
    throw new Error("Necesitás iniciar sesión para hacer esto.");
  }
  return userId;
}

/** Confirma que la rutina pertenece al usuario actual. Devuelve el id o null. */
async function ownedRoutineId(
  routineId: string,
  userId: string,
): Promise<string | null> {
  const routine = await prisma.routine.findFirst({
    where: { id: routineId, userId },
    select: { id: true },
  });
  return routine?.id ?? null;
}

const createRoutineSchema = z.object({
  name: z.string().trim().min(1, "Poné un nombre").max(80, "Nombre demasiado largo"),
});

export async function createRoutine(formData: FormData) {
  const userId = await requireUserId();

  const parsed = createRoutineSchema.safeParse({ name: formData.get("name") });
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Datos inválidos");
  }

  await prisma.routine.create({
    data: { name: parsed.data.name, userId },
  });

  revalidatePath("/entrenamiento");
}

export async function deleteRoutine(formData: FormData) {
  const userId = await requireUserId();
  const routineId = String(formData.get("routineId") ?? "");

  // deleteMany con el userId en el filtro: si la rutina no es del usuario,
  // no borra nada (y no filtra la existencia de rutinas ajenas).
  await prisma.routine.deleteMany({ where: { id: routineId, userId } });

  revalidatePath("/entrenamiento");
}

const addExerciseSchema = z.object({
  routineId: z.string().min(1),
  exerciseId: z.string().min(1, "Elegí un ejercicio"),
  targetSets: z.coerce.number().int().min(1, "Mínimo 1 serie").max(20, "Máximo 20 series"),
  targetReps: z
    .union([z.literal(""), z.coerce.number().int().min(1).max(100)])
    .transform((v) => (v === "" ? null : v)),
});

export async function addExerciseToRoutine(formData: FormData) {
  const userId = await requireUserId();

  const parsed = addExerciseSchema.safeParse({
    routineId: formData.get("routineId"),
    exerciseId: formData.get("exerciseId"),
    targetSets: formData.get("targetSets"),
    targetReps: formData.get("targetReps") ?? "",
  });
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Datos inválidos");
  }

  const { routineId, exerciseId, targetSets, targetReps } = parsed.data;

  if (!(await ownedRoutineId(routineId, userId))) {
    throw new Error("Esa rutina no existe o no es tuya.");
  }

  const last = await prisma.routineExercise.findFirst({
    where: { routineId },
    orderBy: { order: "desc" },
    select: { order: true },
  });
  const nextOrder = (last?.order ?? -1) + 1;

  await prisma.routineExercise.create({
    data: { routineId, exerciseId, targetSets, targetReps, order: nextOrder },
  });

  revalidatePath("/entrenamiento");
}

export async function removeRoutineExercise(formData: FormData) {
  const userId = await requireUserId();
  const routineExerciseId = String(formData.get("routineExerciseId") ?? "");

  // Sólo borra si el RoutineExercise cuelga de una rutina del usuario.
  await prisma.routineExercise.deleteMany({
    where: { id: routineExerciseId, routine: { userId } },
  });

  revalidatePath("/entrenamiento");
}

// --- Registro de entrenamiento en vivo ---

/** Confirma que el WorkoutSession pertenece al usuario actual. */
async function ownedWorkoutSessionId(
  sessionId: string,
  userId: string,
): Promise<string | null> {
  const workout = await prisma.workoutSession.findFirst({
    where: { id: sessionId, userId },
    select: { id: true },
  });
  return workout?.id ?? null;
}

export async function startWorkoutSession(
  routineId: string | undefined,
  formData: FormData,
) {
  const userId = await requireUserId();

  const sessionDate = parseCalendarDateNotFuture(formData.get("date"));
  if (!sessionDate.ok) {
    throw new Error(sessionDate.message);
  }

  let linkedRoutineId: string | null = null;
  if (routineId) {
    if (!(await ownedRoutineId(routineId, userId))) {
      throw new Error("Esa rutina no existe o no es tuya.");
    }
    linkedRoutineId = routineId;
  }

  const workout = await prisma.workoutSession.create({
    data: {
      userId,
      routineId: linkedRoutineId,
      sessionDate: sessionDate.date,
    },
    select: { id: true },
  });

  revalidatePath("/entrenamiento");
  redirect(`/entrenamiento/sesion/${workout.id}`);
}

const setTypeEnum = z.enum(["WARMUP", "WORKING", "FAILURE", "DROPSET"]);

const optionalNumber = (schema: z.ZodTypeAny) =>
  z.union([z.literal(""), schema]).transform((v) => (v === "" ? null : v));

const addSetLogSchema = z.object({
  sessionId: z.string().min(1),
  exerciseId: z.string().min(1, "Elegí un ejercicio"),
  weightKg: z.coerce
    .number()
    .gt(0, "El peso tiene que ser mayor a 0")
    .max(500, "Máximo 500 kg"),
  reps: z.coerce
    .number()
    .int()
    .min(1, "Mínimo 1 repetición")
    .max(100, "Máximo 100 repeticiones"),
  rpe: optionalNumber(
    z.coerce.number().min(1, "RPE entre 1 y 10").max(10, "RPE entre 1 y 10"),
  ),
  restSeconds: optionalNumber(
    z.coerce
      .number()
      .int()
      .min(0, "El descanso no puede ser negativo")
      .max(600, "Máximo 600 segundos"),
  ),
  setType: z
    .union([z.literal(""), setTypeEnum])
    .transform((v) => (v === "" ? null : v)),
});

export async function addSetLog(formData: FormData) {
  const userId = await requireUserId();

  const parsed = addSetLogSchema.safeParse({
    sessionId: formData.get("sessionId"),
    exerciseId: formData.get("exerciseId"),
    weightKg: formData.get("weightKg"),
    reps: formData.get("reps"),
    rpe: formData.get("rpe") ?? "",
    restSeconds: formData.get("restSeconds") ?? "",
    setType: formData.get("setType") ?? "",
  });
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Datos inválidos");
  }

  const { sessionId, exerciseId, weightKg, reps, rpe, restSeconds, setType } =
    parsed.data;

  if (!(await ownedWorkoutSessionId(sessionId, userId))) {
    throw new Error("Esa sesión no existe o no es tuya.");
  }

  await prisma.setLog.create({
    data: { sessionId, exerciseId, weightKg, reps, rpe, restSeconds, setType },
  });

  revalidatePath(`/entrenamiento/sesion/${sessionId}`);
}

export async function removeSetLog(setLogId: string) {
  const userId = await requireUserId();

  // Sólo toca el SetLog si cuelga de una sesión del usuario.
  const setLog = await prisma.setLog.findFirst({
    where: { id: setLogId, session: { userId } },
    select: { sessionId: true },
  });
  if (!setLog) return;

  await prisma.setLog.delete({ where: { id: setLogId } });

  revalidatePath(`/entrenamiento/sesion/${setLog.sessionId}`);
}
