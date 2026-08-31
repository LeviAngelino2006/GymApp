"use client";

import { deleteMeasurement } from "./actions";

export function DeleteMeasurementButton({
  id,
  label,
}: {
  id: string;
  label: string;
}) {
  return (
    <form
      action={deleteMeasurement.bind(null, id)}
      onSubmit={(event) => {
        if (!window.confirm(`Vas a borrar la medición del ${label}. ¿Seguro?`)) {
          event.preventDefault();
        }
      }}
    >
      <button
        type="submit"
        className="font-mono text-xs uppercase tracking-widest text-mist transition-colors hover:text-accent"
      >
        Borrar
      </button>
    </form>
  );
}
