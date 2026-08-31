"use client";

import { useEffect, useRef, useState } from "react";

import { DateField } from "@/components/date-field";

import { logMealItem, searchFood, type FoodResult } from "./actions";

const MEAL_TYPE_OPTIONS = [
  { value: "BREAKFAST", label: "Desayuno" },
  { value: "LUNCH", label: "Almuerzo" },
  { value: "DINNER", label: "Cena" },
  { value: "SNACK", label: "Snack" },
];

const inputClass =
  "rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent";
const numberClass = `${inputClass} font-mono`;

function round(n: number): number {
  return Math.round(n * 10) / 10;
}

export function FoodLogger({
  defaultMealType,
}: {
  defaultMealType: string;
}) {
  const [mode, setMode] = useState<"search" | "manual">("search");

  return (
    <section className="rounded-xl border border-border bg-surface p-6">
      <div className="flex items-center justify-between gap-4">
        <h2 className="font-display text-lg font-medium">Agregar comida</h2>
        <div className="flex gap-1 text-xs">
          <button
            type="button"
            onClick={() => setMode("search")}
            className={`rounded-lg px-3 py-1 font-mono uppercase tracking-widest transition-colors ${
              mode === "search"
                ? "bg-accent text-surface"
                : "text-mist hover:text-ink"
            }`}
          >
            Buscar
          </button>
          <button
            type="button"
            onClick={() => setMode("manual")}
            className={`rounded-lg px-3 py-1 font-mono uppercase tracking-widest transition-colors ${
              mode === "manual"
                ? "bg-accent text-surface"
                : "text-mist hover:text-ink"
            }`}
          >
            Manual
          </button>
        </div>
      </div>

      {mode === "search" ? (
        <SearchPanel defaultMealType={defaultMealType} />
      ) : (
        <ManualPanel defaultMealType={defaultMealType} />
      )}
    </section>
  );
}

function SearchPanel({ defaultMealType }: { defaultMealType: string }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<FoodResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [selected, setSelected] = useState<FoodResult | null>(null);
  const requestId = useRef(0);

  useEffect(() => {
    const term = query.trim();
    if (term.length < 2) {
      setResults([]);
      setHasSearched(false);
      setSearchError(false);
      return;
    }

    const id = ++requestId.current;
    setSearching(true);
    const timeout = setTimeout(async () => {
      const response = await searchFood(term);
      if (id !== requestId.current) return;
      setResults(response.results);
      setSearchError(response.error);
      setSearching(false);
      setHasSearched(true);
    }, 400);

    return () => clearTimeout(timeout);
  }, [query]);

  async function handleAdd(formData: FormData) {
    await logMealItem(formData);
    setSelected(null);
    setQuery("");
    setResults([]);
    setHasSearched(false);
  }

  return (
    <div className="mt-4 space-y-3">
      <input
        type="text"
        value={query}
        onChange={(event) => {
          setQuery(event.target.value);
          setSelected(null);
        }}
        placeholder="Buscá un alimento: banana, pollo, arroz…"
        className={`w-full ${inputClass}`}
      />

      {searching && <p className="text-xs text-mist">Buscando…</p>}

      {searchError && !searching && (
        <p className="text-sm text-mist">
          No pudimos conectar con la base de alimentos. Probá de nuevo o cargalo
          a mano con la pestaña &quot;Manual&quot;.
        </p>
      )}

      {!searching &&
        !searchError &&
        hasSearched &&
        results.length === 0 &&
        query.trim().length >= 2 && (
          <p className="text-sm text-mist">
            Sin resultados para &quot;{query.trim()}&quot;. Cargalo a mano.
          </p>
        )}

      {!selected && results.length > 0 && (
        <ul className="divide-y divide-border border-y border-border">
          {results.map((food) => (
            <li key={food.code || food.name}>
              <button
                type="button"
                onClick={() => setSelected(food)}
                className="flex w-full items-center justify-between gap-4 py-2 text-left transition-colors hover:text-accent"
              >
                <span className="text-sm">
                  {food.name}
                  {food.brand && (
                    <span className="text-mist"> · {food.brand}</span>
                  )}
                </span>
                <span className="shrink-0 font-mono text-xs text-mist">
                  {food.kcalPer100g} kcal/100g
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {selected && (
        <ConfirmForm
          key={selected.code || selected.name}
          food={selected}
          defaultMealType={defaultMealType}
          onCancel={() => setSelected(null)}
          onAdd={handleAdd}
        />
      )}
    </div>
  );
}

function ConfirmForm({
  food,
  defaultMealType,
  onCancel,
  onAdd,
}: {
  food: FoodResult;
  defaultMealType: string;
  onCancel: () => void;
  onAdd: (formData: FormData) => Promise<void>;
}) {
  const [grams, setGrams] = useState(100);
  const factor = grams > 0 ? grams / 100 : 0;

  const displayName = food.brand ? `${food.name} (${food.brand})` : food.name;

  return (
    <form action={onAdd} className="rounded-lg border border-border bg-background p-4">
      <p className="text-sm font-medium">{displayName}</p>
      <p className="mt-1 font-mono text-xs text-mist">
        por 100 g: {food.kcalPer100g} kcal · P {food.proteinPer100g ?? "—"} · C{" "}
        {food.carbsPer100g ?? "—"} · G {food.fatPer100g ?? "—"}
      </p>

      <input type="hidden" name="scaleByQuantity" value="1" />
      <input type="hidden" name="foodName" value={displayName} />
      <input type="hidden" name="kcalPer100g" value={food.kcalPer100g} />
      <input
        type="hidden"
        name="proteinPer100g"
        value={food.proteinPer100g ?? ""}
      />
      <input type="hidden" name="carbsPer100g" value={food.carbsPer100g ?? ""} />
      <input type="hidden" name="fatPer100g" value={food.fatPer100g ?? ""} />

      <div className="mt-3 flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1 text-xs text-mist">
          Cantidad (g)
          <input
            type="number"
            name="quantityGrams"
            required
            min={1}
            max={3000}
            step="1"
            value={grams}
            onChange={(event) => setGrams(Number(event.target.value))}
            className={`w-24 ${numberClass}`}
          />
        </label>

        <label className="flex flex-col gap-1 text-xs text-mist">
          Comida
          <select
            name="mealType"
            defaultValue={defaultMealType}
            className={inputClass}
          >
            {MEAL_TYPE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <DateField label="Fecha" />

        <div className="flex gap-2">
          <button
            type="submit"
            className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-surface transition-opacity hover:opacity-90"
          >
            Agregar
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg border border-border px-3 py-2 text-sm text-ink transition-colors hover:border-accent"
          >
            Cancelar
          </button>
        </div>
      </div>

      <p className="mt-3 font-mono text-xs text-mist">
        Vas a cargar: {Math.round((food.kcalPer100g ?? 0) * factor)} kcal
        {food.proteinPer100g != null &&
          ` · P ${round(food.proteinPer100g * factor)}`}
        {food.carbsPer100g != null &&
          ` · C ${round(food.carbsPer100g * factor)}`}
        {food.fatPer100g != null && ` · G ${round(food.fatPer100g * factor)}`}
      </p>
    </form>
  );
}

function ManualPanel({ defaultMealType }: { defaultMealType: string }) {
  const formRef = useRef<HTMLFormElement>(null);

  async function handleAdd(formData: FormData) {
    await logMealItem(formData);
    formRef.current?.reset();
  }

  return (
    <form ref={formRef} action={handleAdd} className="mt-4 space-y-3">
      {/* Alimento manual: lo que se escribe es lo que se come, sin escalar. */}
      <input type="hidden" name="scaleByQuantity" value="0" />

      <label className="block text-sm">
        <span className="text-mist">Nombre</span>
        <input
          type="text"
          name="foodName"
          required
          maxLength={200}
          placeholder="Ej: Milanesa casera de la abuela"
          className={`mt-1 w-full ${inputClass}`}
        />
      </label>

      <div className="grid gap-3 sm:grid-cols-4">
        <label className="flex flex-col gap-1 text-xs text-mist">
          Calorías
          <input
            type="number"
            name="kcalPer100g"
            required
            min={0}
            max={10000}
            step="1"
            className={numberClass}
          />
        </label>
        <label className="flex flex-col gap-1 text-xs text-mist">
          Proteína (g)
          <input
            type="number"
            name="proteinPer100g"
            min={0}
            max={10000}
            step="0.1"
            placeholder="—"
            className={numberClass}
          />
        </label>
        <label className="flex flex-col gap-1 text-xs text-mist">
          Carbos (g)
          <input
            type="number"
            name="carbsPer100g"
            min={0}
            max={10000}
            step="0.1"
            placeholder="—"
            className={numberClass}
          />
        </label>
        <label className="flex flex-col gap-1 text-xs text-mist">
          Grasas (g)
          <input
            type="number"
            name="fatPer100g"
            min={0}
            max={10000}
            step="0.1"
            placeholder="—"
            className={numberClass}
          />
        </label>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1 text-xs text-mist">
          Comida
          <select
            name="mealType"
            defaultValue={defaultMealType}
            className={inputClass}
          >
            {MEAL_TYPE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs text-mist">
          Cantidad (g) · opcional
          <input
            type="number"
            name="quantityGrams"
            min={1}
            max={3000}
            step="1"
            placeholder="—"
            className={`w-28 ${numberClass}`}
          />
        </label>
        <DateField label="Fecha" />
        <button
          type="submit"
          className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-surface transition-opacity hover:opacity-90"
        >
          Agregar
        </button>
      </div>

      <p className="font-mono text-xs text-mist">
        Cargá las calorías y macros de la porción que comiste. La cantidad en
        gramos es opcional y sólo queda como referencia.
      </p>
    </form>
  );
}
