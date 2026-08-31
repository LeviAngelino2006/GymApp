"use server";

import { revalidatePath } from "next/cache";
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

const SEX_VALUES = ["MALE", "FEMALE", "OTHER"] as const;

const MIN_AGE = 10;
const MAX_AGE = 100;

// "" (campo vacío) -> null: el usuario puede limpiar un dato, y como el form
// viene precargado con los valores actuales, guardar parcial no pisa el resto.
const emptyToNull = <T extends z.ZodTypeAny>(schema: T) =>
  z.preprocess(
    (v) => (v === "" || v == null ? null : v),
    schema.nullable(),
  );

const updateProfileSchema = z.object({
  sex: emptyToNull(z.enum(SEX_VALUES)),
  heightCm: emptyToNull(
    z.coerce
      .number()
      .int("La altura tiene que ser un número entero")
      .min(100, "La altura tiene que estar entre 100 y 250 cm")
      .max(250, "La altura tiene que estar entre 100 y 250 cm"),
  ),
  birthDate: z
    .union([z.literal(""), z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha inválida")])
    .transform((value, ctx) => {
      if (value === "") return null;

      const [year, month, day] = value.split("-").map(Number);
      // Guardamos al mediodía UTC para que la fecha no se corra por zona horaria.
      const date = new Date(Date.UTC(year, month - 1, day, 12));

      if (
        date.getUTCFullYear() !== year ||
        date.getUTCMonth() !== month - 1 ||
        date.getUTCDate() !== day
      ) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Fecha inválida" });
        return z.NEVER;
      }

      const now = new Date();
      let age = now.getUTCFullYear() - year;
      const monthDiff = now.getUTCMonth() - (month - 1);
      if (monthDiff < 0 || (monthDiff === 0 && now.getUTCDate() < day)) {
        age -= 1;
      }

      if (age < MIN_AGE || age > MAX_AGE) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `La fecha tiene que corresponder a una edad entre ${MIN_AGE} y ${MAX_AGE} años`,
        });
        return z.NEVER;
      }

      return date;
    }),
});

export async function updateProfile(formData: FormData) {
  const userId = await requireUserId();

  const parsed = updateProfileSchema.safeParse({
    sex: formData.get("sex") ?? "",
    heightCm: formData.get("heightCm") ?? "",
    birthDate: formData.get("birthDate") ?? "",
  });
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Datos inválidos");
  }

  const { sex, heightCm, birthDate } = parsed.data;

  await prisma.user.update({
    where: { id: userId },
    data: { sex, heightCm, birthDate },
  });

  revalidatePath("/perfil");
}

const optionalCm = emptyToNull(
  z.coerce
    .number()
    .min(0, "El contorno no puede ser negativo")
    .max(300, "Máximo 300 cm"),
);

const measurementSchema = z.object({
  weightKg: z.coerce
    .number()
    .min(30, "El peso tiene que estar entre 30 y 300 kg")
    .max(300, "El peso tiene que estar entre 30 y 300 kg"),
  chestCm: optionalCm,
  waistCm: optionalCm,
  hipCm: optionalCm,
  armCm: optionalCm,
  thighCm: optionalCm,
});

export async function logMeasurement(formData: FormData) {
  const userId = await requireUserId();

  const measuredAt = parseCalendarDateNotFuture(formData.get("date"));
  if (!measuredAt.ok) {
    throw new Error(measuredAt.message);
  }

  const parsed = measurementSchema.safeParse({
    weightKg: formData.get("weightKg"),
    chestCm: formData.get("chestCm") ?? "",
    waistCm: formData.get("waistCm") ?? "",
    hipCm: formData.get("hipCm") ?? "",
    armCm: formData.get("armCm") ?? "",
    thighCm: formData.get("thighCm") ?? "",
  });
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Datos inválidos");
  }

  await prisma.bodyMeasurement.create({
    data: { userId, measuredAt: measuredAt.date, ...parsed.data },
  });

  revalidatePath("/perfil");
}

export async function deleteMeasurement(id: string) {
  const userId = await requireUserId();

  // deleteMany con userId en el filtro: si no es del usuario, no borra nada.
  await prisma.bodyMeasurement.deleteMany({ where: { id, userId } });

  revalidatePath("/perfil");
}
