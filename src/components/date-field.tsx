"use client";

import { useEffect, useState } from "react";

/** Fecha local de hoy como "YYYY-MM-DD" (según la zona horaria del navegador). */
function localToday(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * <input type="date"> con default "hoy" y max "hoy" (bloquea fechas futuras en
 * el browser; el server igual revalida). El valor de "hoy" se resuelve recién
 * en el cliente para no romper la hidratación si el server está en otra TZ.
 */
export function DateField({
  name = "date",
  label = "Fecha",
  labelClassName = "flex flex-col gap-1 text-xs text-mist",
}: {
  name?: string;
  label?: string;
  labelClassName?: string;
}) {
  const [value, setValue] = useState("");
  const [today, setToday] = useState("");

  useEffect(() => {
    const current = localToday();
    setToday(current);
    setValue((previous) => previous || current);
  }, []);

  return (
    <label className={labelClassName}>
      {label}
      <input
        type="date"
        name={name}
        required
        value={value}
        max={today || undefined}
        onChange={(event) => setValue(event.target.value)}
        className="rounded-lg border border-border bg-background px-3 py-2 font-mono text-sm text-ink outline-none focus:border-accent"
      />
    </label>
  );
}
