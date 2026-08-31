"use client";

import { deleteRoutine } from "./actions";

export function DeleteRoutineButton({
  routineId,
  routineName,
}: {
  routineId: string;
  routineName: string;
}) {
  return (
    <form
      action={deleteRoutine}
      onSubmit={(event) => {
        if (
          !window.confirm(
            `Vas a eliminar la rutina "${routineName}" y todos sus ejercicios. ¿Seguro?`,
          )
        ) {
          event.preventDefault();
        }
      }}
    >
      <input type="hidden" name="routineId" value={routineId} />
      <button
        type="submit"
        className="font-mono text-xs uppercase tracking-widest text-mist transition-colors hover:text-accent"
      >
        Eliminar rutina
      </button>
    </form>
  );
}
