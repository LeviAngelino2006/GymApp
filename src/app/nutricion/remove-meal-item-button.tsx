"use client";

import { removeMealItem } from "./actions";

export function RemoveMealItemButton({
  id,
  foodName,
}: {
  id: string;
  foodName: string;
}) {
  return (
    <form
      action={removeMealItem.bind(null, id)}
      onSubmit={(event) => {
        if (!window.confirm(`Vas a quitar "${foodName}". ¿Seguro?`)) {
          event.preventDefault();
        }
      }}
    >
      <button
        type="submit"
        className="font-mono text-xs uppercase tracking-widest text-mist transition-colors hover:text-accent"
      >
        Quitar
      </button>
    </form>
  );
}
