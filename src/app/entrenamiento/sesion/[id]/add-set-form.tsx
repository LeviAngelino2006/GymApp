"use client";

import { useEffect, useState } from "react";

import { addSetLog } from "../../actions";

type ExerciseOption = { id: string; name: string };
type ExerciseGroup = { label: string; options: ExerciseOption[] };

const SET_TYPES = [
  { value: "WARMUP", label: "Calentamiento" },
  { value: "WORKING", label: "Trabajo" },
  { value: "FAILURE", label: "Fallo" },
  { value: "DROPSET", label: "Dropset" },
];

const inputClass =
  "rounded-lg border border-border bg-background px-3 py-2 font-mono text-sm outline-none focus:border-accent";

export function AddSetForm({
  sessionId,
  groups,
}: {
  sessionId: string;
  groups: ExerciseGroup[];
}) {
  const storageKey = `bitacora:add-set:${sessionId}`;

  const [advanced, setAdvanced] = useState(false);
  const [exerciseId, setExerciseId] = useState("");
  const [weightKg, setWeightKg] = useState("");
  const [reps, setReps] = useState("");
  const [hydrated, setHydrated] = useState(false);

  // Recordá el último ejercicio / peso / reps usados en esta sesión, así
  // cargar series consecutivas es apretar un botón.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        const saved = JSON.parse(raw) as {
          exerciseId?: string;
          weightKg?: string;
          reps?: string;
          advanced?: boolean;
        };
        if (saved.exerciseId) setExerciseId(saved.exerciseId);
        if (saved.weightKg) setWeightKg(saved.weightKg);
        if (saved.reps) setReps(saved.reps);
        if (typeof saved.advanced === "boolean") setAdvanced(saved.advanced);
      }
    } catch {
      // localStorage no disponible: seguimos con los defaults vacíos.
    }
    setHydrated(true);
  }, [storageKey]);

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(
        storageKey,
        JSON.stringify({ exerciseId, weightKg, reps, advanced }),
      );
    } catch {
      // idem
    }
  }, [hydrated, storageKey, exerciseId, weightKg, reps, advanced]);

  return (
    <form action={addSetLog} className="mt-4 space-y-3">
      <input type="hidden" name="sessionId" value={sessionId} />

      <div className="grid gap-3 sm:grid-cols-[1fr_auto_auto]">
        <label className="flex flex-col gap-1 text-xs text-mist">
          Ejercicio
          <select
            name="exerciseId"
            required
            value={exerciseId}
            onChange={(event) => setExerciseId(event.target.value)}
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-ink outline-none focus:border-accent"
          >
            <option value="" disabled>
              Elegí un ejercicio
            </option>
            {groups.map((group) => (
              <optgroup key={group.label} label={group.label}>
                {group.options.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.name}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1 text-xs text-mist">
          Peso (kg)
          <input
            type="number"
            name="weightKg"
            required
            step="0.5"
            min="0.5"
            max="500"
            value={weightKg}
            onChange={(event) => setWeightKg(event.target.value)}
            className={`w-24 ${inputClass}`}
          />
        </label>

        <label className="flex flex-col gap-1 text-xs text-mist">
          Reps
          <input
            type="number"
            name="reps"
            required
            min="1"
            max="100"
            value={reps}
            onChange={(event) => setReps(event.target.value)}
            className={`w-20 ${inputClass}`}
          />
        </label>
      </div>

      <button
        type="button"
        onClick={() => setAdvanced((value) => !value)}
        className="font-mono text-xs uppercase tracking-widest text-mist transition-colors hover:text-accent"
      >
        {advanced ? "− Modo avanzado" : "+ Modo avanzado"}
      </button>

      {advanced && (
        <div className="grid gap-3 sm:grid-cols-3">
          <label className="flex flex-col gap-1 text-xs text-mist">
            RPE (1-10)
            <input
              type="number"
              name="rpe"
              step="0.5"
              min="1"
              max="10"
              placeholder="—"
              className={inputClass}
            />
          </label>
          <label className="flex flex-col gap-1 text-xs text-mist">
            Descanso (s)
            <input
              type="number"
              name="restSeconds"
              min="0"
              max="600"
              placeholder="—"
              className={inputClass}
            />
          </label>
          <label className="flex flex-col gap-1 text-xs text-mist">
            Tipo de serie
            <select
              name="setType"
              defaultValue=""
              className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-ink outline-none focus:border-accent"
            >
              <option value="">Sin especificar</option>
              {SET_TYPES.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      )}

      <button
        type="submit"
        className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-surface transition-opacity hover:opacity-90"
      >
        Agregar serie
      </button>
    </form>
  );
}
