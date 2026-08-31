import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/**
 * Catálogo cerrado de ejercicios comunes de gimnasio.
 *
 * - `muscleGroup`: uno de Pecho | Espalda | Piernas | Hombros | Brazos | Core
 * - `equipment`: uno de Barra | Mancuernas | Máquina | Peso corporal | Polea | Kettlebell
 *
 * `name` es único (ver @unique en prisma/schema.prisma), así el seed puede
 * correr N veces sin duplicar filas.
 */
type ExerciseSeed = {
  name: string;
  muscleGroup: "Pecho" | "Espalda" | "Piernas" | "Hombros" | "Brazos" | "Core";
  equipment:
    | "Barra"
    | "Mancuernas"
    | "Máquina"
    | "Peso corporal"
    | "Polea"
    | "Kettlebell";
};

const exercises: ExerciseSeed[] = [
  // --- Pecho ---
  { name: "Press de banca con barra", muscleGroup: "Pecho", equipment: "Barra" },
  { name: "Press inclinado con mancuernas", muscleGroup: "Pecho", equipment: "Mancuernas" },
  { name: "Aperturas con mancuernas", muscleGroup: "Pecho", equipment: "Mancuernas" },
  { name: "Press de pecho en máquina", muscleGroup: "Pecho", equipment: "Máquina" },
  { name: "Fondos en paralelas", muscleGroup: "Pecho", equipment: "Peso corporal" },
  { name: "Cruce de poleas", muscleGroup: "Pecho", equipment: "Polea" },

  // --- Espalda ---
  { name: "Dominadas", muscleGroup: "Espalda", equipment: "Peso corporal" },
  { name: "Remo con barra", muscleGroup: "Espalda", equipment: "Barra" },
  { name: "Peso muerto convencional", muscleGroup: "Espalda", equipment: "Barra" },
  { name: "Remo con mancuerna a una mano", muscleGroup: "Espalda", equipment: "Mancuernas" },
  { name: "Jalón al pecho en polea", muscleGroup: "Espalda", equipment: "Polea" },
  { name: "Remo en máquina", muscleGroup: "Espalda", equipment: "Máquina" },
  { name: "Swing con kettlebell", muscleGroup: "Espalda", equipment: "Kettlebell" },

  // --- Piernas ---
  { name: "Sentadilla con barra", muscleGroup: "Piernas", equipment: "Barra" },
  { name: "Peso muerto rumano con barra", muscleGroup: "Piernas", equipment: "Barra" },
  { name: "Hip thrust con barra", muscleGroup: "Piernas", equipment: "Barra" },
  { name: "Zancadas con mancuernas", muscleGroup: "Piernas", equipment: "Mancuernas" },
  { name: "Prensa de piernas", muscleGroup: "Piernas", equipment: "Máquina" },
  { name: "Extensión de cuádriceps en máquina", muscleGroup: "Piernas", equipment: "Máquina" },
  { name: "Curl femoral en máquina", muscleGroup: "Piernas", equipment: "Máquina" },
  { name: "Elevación de gemelos de pie", muscleGroup: "Piernas", equipment: "Máquina" },
  { name: "Sentadilla goblet con kettlebell", muscleGroup: "Piernas", equipment: "Kettlebell" },

  // --- Hombros ---
  { name: "Press militar con barra", muscleGroup: "Hombros", equipment: "Barra" },
  { name: "Press de hombros con mancuernas", muscleGroup: "Hombros", equipment: "Mancuernas" },
  { name: "Elevaciones laterales con mancuernas", muscleGroup: "Hombros", equipment: "Mancuernas" },
  { name: "Elevaciones frontales con mancuernas", muscleGroup: "Hombros", equipment: "Mancuernas" },
  { name: "Pájaros para deltoide posterior", muscleGroup: "Hombros", equipment: "Mancuernas" },
  { name: "Face pull en polea", muscleGroup: "Hombros", equipment: "Polea" },

  // --- Brazos ---
  { name: "Curl de bíceps con barra", muscleGroup: "Brazos", equipment: "Barra" },
  { name: "Curl de bíceps con mancuernas", muscleGroup: "Brazos", equipment: "Mancuernas" },
  { name: "Curl martillo con mancuernas", muscleGroup: "Brazos", equipment: "Mancuernas" },
  { name: "Press francés con barra", muscleGroup: "Brazos", equipment: "Barra" },
  { name: "Extensión de tríceps en polea", muscleGroup: "Brazos", equipment: "Polea" },
  { name: "Fondos de tríceps en banco", muscleGroup: "Brazos", equipment: "Peso corporal" },

  // --- Core ---
  { name: "Plancha abdominal", muscleGroup: "Core", equipment: "Peso corporal" },
  { name: "Crunch abdominal", muscleGroup: "Core", equipment: "Peso corporal" },
  { name: "Elevación de piernas colgado", muscleGroup: "Core", equipment: "Peso corporal" },
  { name: "Rueda abdominal", muscleGroup: "Core", equipment: "Peso corporal" },
  { name: "Giro ruso con kettlebell", muscleGroup: "Core", equipment: "Kettlebell" },
  { name: "Crunch en polea alta", muscleGroup: "Core", equipment: "Polea" },
];

async function main() {
  let created = 0;
  let updated = 0;

  for (const exercise of exercises) {
    const existing = await prisma.exercise.findUnique({
      where: { name: exercise.name },
      select: { id: true },
    });

    await prisma.exercise.upsert({
      where: { name: exercise.name },
      update: {
        muscleGroup: exercise.muscleGroup,
        equipment: exercise.equipment,
      },
      create: exercise,
    });

    if (existing) updated++;
    else created++;
  }

  // Catálogo cerrado: quitar ejercicios que ya no están en la lista.
  // Solo se borran los que no están referenciados por rutinas ni series
  // registradas, para no romper datos de usuarios.
  const catalogNames = exercises.map((e) => e.name);
  const stale = await prisma.exercise.findMany({
    where: {
      name: { notIn: catalogNames },
      routineExercises: { none: {} },
      setLogs: { none: {} },
    },
    select: { id: true, name: true },
  });
  if (stale.length > 0) {
    await prisma.exercise.deleteMany({ where: { id: { in: stale.map((s) => s.id) } } });
    console.log(
      `Eliminados ${stale.length} ejercicios fuera del catálogo: ${stale
        .map((s) => s.name)
        .join(", ")}`,
    );
  }

  const byGroup = await prisma.exercise.groupBy({
    by: ["muscleGroup"],
    _count: { _all: true },
    orderBy: { muscleGroup: "asc" },
  });

  console.log(`Seed de ejercicios completado: ${created} creados, ${updated} actualizados.`);
  console.log("Desglose por grupo muscular:");
  for (const row of byGroup) {
    console.log(`  ${row.muscleGroup}: ${row._count._all}`);
  }
  const total = byGroup.reduce((acc, row) => acc + row._count._all, 0);
  console.log(`Total en la tabla Exercise: ${total}`);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
