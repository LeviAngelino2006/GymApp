/**
 * Helpers de fecha "de calendario". Convención del proyecto:
 * - una fecha de calendario se guarda como el mediodía UTC de ese día, para que
 *   no se corra de día por zona horaria.
 * - un "día" (para rangos) es el intervalo UTC [00:00, 24:00).
 */

const CALENDAR_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const DAY_MS = 24 * 60 * 60 * 1000;

export type ParsedCalendarDate =
  | { ok: true; date: Date }
  | { ok: false; message: string };

/**
 * Parsea "YYYY-MM-DD" al mediodía UTC de ese día. Rechaza formato inválido,
 * fechas inexistentes (ej. 2024-02-30) y fechas futuras — "futura" se compara
 * por día de calendario en UTC, así elegir "hoy" siempre entra.
 */
export function parseCalendarDateNotFuture(
  value: unknown,
): ParsedCalendarDate {
  if (typeof value !== "string" || !CALENDAR_DATE_RE.test(value)) {
    return { ok: false, message: "Fecha inválida" };
  }

  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day, 12));

  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return { ok: false, message: "Fecha inválida" };
  }

  const now = new Date();
  const chosenDay = Date.UTC(year, month - 1, day);
  const todayDay = Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate(),
  );

  if (chosenDay > todayDay) {
    return { ok: false, message: "La fecha no puede ser futura" };
  }

  return { ok: true, date };
}

/** Rango UTC [inicio, fin) del día de calendario que contiene a `date`. */
export function utcDayRange(date: Date): { start: Date; end: Date } {
  const start = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );
  return { start, end: new Date(start.getTime() + DAY_MS) };
}
