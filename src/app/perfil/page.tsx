import Link from "next/link";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { DateField } from "@/components/date-field";

import { logMeasurement, updateProfile } from "./actions";
import { DeleteMeasurementButton } from "./delete-measurement-button";

const SEX_OPTIONS = [
  { value: "MALE", label: "Masculino" },
  { value: "FEMALE", label: "Femenino" },
  { value: "OTHER", label: "Otro" },
];

const MEASUREMENT_FIELDS = [
  { name: "weightKg", label: "Peso", unit: "kg", min: 30, max: 300, required: true },
  { name: "chestCm", label: "Pecho", unit: "cm", min: 0, max: 300, required: false },
  { name: "waistCm", label: "Cintura", unit: "cm", min: 0, max: 300, required: false },
  { name: "hipCm", label: "Cadera", unit: "cm", min: 0, max: 300, required: false },
  { name: "armCm", label: "Brazo", unit: "cm", min: 0, max: 300, required: false },
  { name: "thighCm", label: "Muslo", unit: "cm", min: 0, max: 300, required: false },
] as const;

const dateFormatter = new Intl.DateTimeFormat("es-AR", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

function toDateInputValue(date: Date | null): string {
  if (!date) return "";
  // birthDate se guarda al mediodía UTC, así que el slice es seguro.
  return date.toISOString().slice(0, 10);
}

function PageHeader() {
  return (
    <div>
      <p className="font-mono text-xs uppercase tracking-widest text-mist">
        Perfil
      </p>
      <h1 className="mt-2 font-display text-2xl font-medium tracking-tight">
        Datos personales y mediciones
      </h1>
    </div>
  );
}

const fieldClass =
  "mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 font-mono text-sm outline-none focus:border-accent";

export default async function PerfilPage() {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;

  if (!userId) {
    return (
      <div className="space-y-6">
        <PageHeader />
        <div className="rounded-xl border border-border bg-surface p-6">
          <h2 className="font-display text-lg font-medium">
            Entrá para ver tu perfil
          </h2>
          <p className="mt-2 text-sm text-mist">
            Necesitás una cuenta para guardar tus datos y registrar mediciones.
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

  const [user, measurements] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { sex: true, heightCm: true, birthDate: true },
    }),
    prisma.bodyMeasurement.findMany({
      where: { userId },
      orderBy: { measuredAt: "desc" },
      take: 10,
    }),
  ]);

  return (
    <div className="space-y-8">
      <PageHeader />

      <section className="rounded-xl border border-border bg-surface p-6">
        <h2 className="font-display text-lg font-medium">Datos personales</h2>
        <p className="mt-1 text-sm text-mist">
          Todo opcional. Guardá lo que tengas y completá el resto después.
        </p>
        <form
          action={updateProfile}
          className="mt-4 grid gap-4 sm:grid-cols-3"
        >
          <label className="block text-sm">
            <span className="text-mist">Sexo</span>
            <select
              name="sex"
              defaultValue={user?.sex ?? ""}
              className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-ink outline-none focus:border-accent"
            >
              <option value="">Sin especificar</option>
              {SEX_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="block text-sm">
            <span className="text-mist">Altura (cm)</span>
            <input
              type="number"
              name="heightCm"
              min={100}
              max={250}
              step={1}
              defaultValue={user?.heightCm ?? ""}
              className={fieldClass}
            />
          </label>

          <label className="block text-sm">
            <span className="text-mist">Fecha de nacimiento</span>
            <input
              type="date"
              name="birthDate"
              defaultValue={toDateInputValue(user?.birthDate ?? null)}
              className={fieldClass}
            />
          </label>

          <div className="sm:col-span-3">
            <button
              type="submit"
              className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-surface transition-opacity hover:opacity-90"
            >
              Guardar datos
            </button>
          </div>
        </form>
      </section>

      <section className="rounded-xl border border-border bg-surface p-6">
        <h2 className="font-display text-lg font-medium">Mediciones</h2>
        <p className="mt-1 text-sm text-mist">
          El peso es obligatorio. Los contornos, opcionales.
        </p>
        <form
          action={logMeasurement}
          className="mt-4 grid gap-4 sm:grid-cols-3"
        >
          <DateField label="Fecha de la medición" />
          {MEASUREMENT_FIELDS.map((field) => (
            <label key={field.name} className="block text-sm">
              <span className="text-mist">
                {field.label} ({field.unit})
                {field.required ? "" : " · opcional"}
              </span>
              <input
                type="number"
                name={field.name}
                min={field.min}
                max={field.max}
                step="0.1"
                required={field.required}
                placeholder={field.required ? "" : "—"}
                className={fieldClass}
              />
            </label>
          ))}
          <div className="sm:col-span-3">
            <button
              type="submit"
              className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-surface transition-opacity hover:opacity-90"
            >
              Registrar medición
            </button>
          </div>
        </form>

        {measurements.length === 0 ? (
          <p className="mt-6 text-sm text-mist">
            Todavía no registraste ninguna medición.
          </p>
        ) : (
          <ul className="mt-6 divide-y divide-border border-y border-border">
            {measurements.map((measurement) => {
              const values = [
                { label: "Peso", value: measurement.weightKg, unit: "kg" },
                { label: "Pecho", value: measurement.chestCm, unit: "cm" },
                { label: "Cintura", value: measurement.waistCm, unit: "cm" },
                { label: "Cadera", value: measurement.hipCm, unit: "cm" },
                { label: "Brazo", value: measurement.armCm, unit: "cm" },
                { label: "Muslo", value: measurement.thighCm, unit: "cm" },
              ].filter((entry) => entry.value != null);

              const formattedDate = dateFormatter.format(measurement.measuredAt);

              return (
                <li
                  key={measurement.id}
                  className="flex items-start justify-between gap-4 py-3"
                >
                  <div>
                    <p className="font-mono text-xs uppercase tracking-widest text-mist">
                      {formattedDate}
                    </p>
                    {values.length > 0 ? (
                      <p className="mt-1 flex flex-wrap gap-x-4 gap-y-1 font-mono text-sm">
                        {values.map((entry) => (
                          <span key={entry.label}>
                            <span className="text-mist">{entry.label} </span>
                            {entry.value} {entry.unit}
                          </span>
                        ))}
                      </p>
                    ) : (
                      <p className="mt-1 text-sm text-mist">Sin valores</p>
                    )}
                  </div>
                  <DeleteMeasurementButton
                    id={measurement.id}
                    label={formattedDate}
                  />
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
