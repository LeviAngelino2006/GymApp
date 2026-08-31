"use client";

import { removeSetLog } from "../../actions";

export function RemoveSetButton({ setLogId }: { setLogId: string }) {
  return (
    <form
      action={removeSetLog.bind(null, setLogId)}
      onSubmit={(event) => {
        if (!window.confirm("Vas a quitar esta serie. ¿Seguro?")) {
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
