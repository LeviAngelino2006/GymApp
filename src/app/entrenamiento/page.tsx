import Link from "next/link";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { DateField } from "@/components/date-field";

import {
  addExerciseToRoutine,
  createRoutine,
  removeRoutineExercise,
  startWorkoutSession,
} from "./actions";
import { DeleteRoutineButton } from "./delete-routine-button";

const dateFormatter = new Intl.DateTimeFormat("es-AR", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

const MUSCLE_GROUP_ORDER = [
  "Pecho",
  "Espalda",
  "Piernas",
  "Hombros",
  "Brazos",
  "Core",
];

function PageHeader() {
  return (
    <div>
      <p className="font-mono text-xs uppercase tracking-widest text-mist">
        Entrenamiento
      </p>
      <h1 className="mt-2 font-display text-2xl font-medium tracking-tight">
        Rutinas y registro de series
      </h1>
    </div>
  );
}

export default async function EntrenamientoPage() {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;

  if (!userId) {
    return (
      <div className="space-y-6">
        <PageHeader />
        <div className="rounded-xl border border-border bg-surface p-6">
          <h2 className="font-display text-lg font-medium">
            Entrá para ver tus rutinas
          </h2>
          <p className="mt-2 text-sm text-mist">
            Necesitás una cuenta para armar rutinas y registrar tus series.
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

  const [routines, catalog, recentSessions] = await Promise.all([
    prisma.routine.findMany({
      where: { userId },
      orderBy: { createdAt: "asc" },
      include: {
        routineExercises: {
          orderBy: { order: "asc" },
          include: { exercise: true },
        },
      },
    }),
    prisma.exercise.findMany({
      orderBy: [{ muscleGroup: "asc" }, { name: "asc" }],
    }),
    prisma.workoutSession.findMany({
      where: { userId },
      orderBy: { sessionDate: "desc" },
      take: 5,
      include: {
        routine: { select: { name: true } },
        _count: { select: { setLogs: true } },
      },
    }),
  ]);

  const catalogByGroup = new Map<string, typeof catalog>();
  for (const exercise of catalog) {
    const list = catalogByGroup.get(exercise.muscleGroup) ?? [];
    list.push(exercise);
    catalogByGroup.set(exercise.muscleGroup, list);
  }
  const groupedCatalog = [...catalogByGroup.entries()].sort((a, b) => {
    const ia = MUSCLE_GROUP_ORDER.indexOf(a[0]);
    const ib = MUSCLE_GROUP_ORDER.indexOf(b[0]);
    return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
  });

  return (
    <div className="space-y-8">
      <PageHeader />

      <section className="rounded-xl border border-border bg-surface p-6">
        <h2 className="font-display text-lg font-medium">
          Registrar entrenamiento
        </h2>
        <p className="mt-1 text-sm text-mist">
          Arrancá una sesión y andá cargando las series a medida que entrenás.
          Podés cambiar la fecha si estás cargando un entreno pasado.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <form
            action={startWorkoutSession.bind(null, undefined)}
            className="flex items-end gap-2 rounded-lg border border-border p-3"
          >
            <DateField />
            <button
              type="submit"
              className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-surface transition-opacity hover:opacity-90"
            >
              Entreno libre
            </button>
          </form>
          {routines.map((routine) => (
            <form
              key={routine.id}
              action={startWorkoutSession.bind(null, routine.id)}
              className="flex items-end gap-2 rounded-lg border border-border p-3"
            >
              <DateField />
              <button
                type="submit"
                className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-ink transition-colors hover:border-accent"
              >
                Empezar: {routine.name}
              </button>
            </form>
          ))}
        </div>
      </section>

      <section className="rounded-xl border border-border bg-surface p-6">
        <h2 className="font-display text-lg font-medium">
          Entrenamientos recientes
        </h2>
        {recentSessions.length === 0 ? (
          <p className="mt-2 text-sm text-mist">
            Todavía no registraste ningún entrenamiento.
          </p>
        ) : (
          <ul className="mt-4 divide-y divide-border border-y border-border">
            {recentSessions.map((workout) => (
              <li key={workout.id}>
                <Link
                  href={`/entrenamiento/sesion/${workout.id}`}
                  className="flex items-center justify-between gap-4 py-3 transition-colors hover:text-accent"
                >
                  <span>
                    <span className="text-sm font-medium">
                      {workout.routine?.name ?? "Libre"}
                    </span>
                    <span className="mt-0.5 block font-mono text-xs text-mist">
                      {dateFormatter.format(workout.sessionDate)}
                    </span>
                  </span>
                  <span className="font-mono text-xs uppercase tracking-widest text-mist">
                    {workout._count.setLogs}{" "}
                    {workout._count.setLogs === 1 ? "serie" : "series"}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-xl border border-border bg-surface p-6">
        <h2 className="font-display text-lg font-medium">Nueva rutina</h2>
        <p className="mt-1 text-sm text-mist">
          Empezá con un nombre. Después le agregás ejercicios.
        </p>
        <form
          action={createRoutine}
          className="mt-4 flex flex-col gap-3 sm:flex-row"
        >
          <input
            type="text"
            name="name"
            required
            maxLength={80}
            placeholder="Ej: Empuje A, Full body lunes…"
            className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent"
          />
          <button
            type="submit"
            className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-surface transition-opacity hover:opacity-90"
          >
            Crear rutina
          </button>
        </form>
      </section>

      {routines.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-mist">
          Todavía no tenés rutinas. Creá la primera arriba.
        </div>
      ) : (
        <div className="space-y-6">
          {routines.map((routine) => (
            <section
              key={routine.id}
              className="rounded-xl border border-border bg-surface p-6"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="font-display text-lg font-medium">
                    {routine.name}
                  </h2>
                  <p className="mt-1 font-mono text-xs uppercase tracking-widest text-mist">
                    {routine.routineExercises.length}{" "}
                    {routine.routineExercises.length === 1
                      ? "ejercicio"
                      : "ejercicios"}
                  </p>
                </div>
                <DeleteRoutineButton
                  routineId={routine.id}
                  routineName={routine.name}
                />
              </div>

              {routine.routineExercises.length > 0 && (
                <ul className="mt-4 divide-y divide-border border-y border-border">
                  {routine.routineExercises.map((item) => (
                    <li
                      key={item.id}
                      className="flex items-center justify-between gap-4 py-3"
                    >
                      <div>
                        <p className="text-sm font-medium">
                          {item.exercise.name}
                        </p>
                        <p className="mt-0.5 text-xs text-mist">
                          {item.exercise.muscleGroup}
                          {item.exercise.equipment
                            ? ` · ${item.exercise.equipment}`
                            : ""}
                        </p>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="font-mono text-sm">
                          {item.targetSets}
                          <span className="text-mist">
                            {" "}
                            × {item.targetReps ?? "—"}
                          </span>
                        </span>
                        <form action={removeRoutineExercise}>
                          <input
                            type="hidden"
                            name="routineExerciseId"
                            value={item.id}
                          />
                          <button
                            type="submit"
                            className="font-mono text-xs uppercase tracking-widest text-mist transition-colors hover:text-accent"
                          >
                            Quitar
                          </button>
                        </form>
                      </div>
                    </li>
                  ))}
                </ul>
              )}

              <form
                action={addExerciseToRoutine}
                className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto_auto_auto] sm:items-end"
              >
                <input type="hidden" name="routineId" value={routine.id} />
                <label className="flex flex-col gap-1 text-xs text-mist">
                  Ejercicio
                  <select
                    name="exerciseId"
                    required
                    defaultValue=""
                    className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-ink outline-none focus:border-accent"
                  >
                    <option value="" disabled>
                      Elegí un ejercicio
                    </option>
                    {groupedCatalog.map(([group, exercises]) => (
                      <optgroup key={group} label={group}>
                        {exercises.map((exercise) => (
                          <option key={exercise.id} value={exercise.id}>
                            {exercise.name}
                          </option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                </label>
                <label className="flex flex-col gap-1 text-xs text-mist">
                  Series
                  <input
                    type="number"
                    name="targetSets"
                    required
                    min={1}
                    max={20}
                    defaultValue={3}
                    className="w-20 rounded-lg border border-border bg-background px-3 py-2 font-mono text-sm outline-none focus:border-accent"
                  />
                </label>
                <label className="flex flex-col gap-1 text-xs text-mist">
                  Reps (opcional)
                  <input
                    type="number"
                    name="targetReps"
                    min={1}
                    max={100}
                    placeholder="—"
                    className="w-24 rounded-lg border border-border bg-background px-3 py-2 font-mono text-sm outline-none focus:border-accent"
                  />
                </label>
                <button
                  type="submit"
                  className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-ink transition-colors hover:border-ink"
                >
                  Agregar
                </button>
              </form>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
