"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export type ChartPoint = { x: string; y: number };

const COLORS = {
  accent: "#2452E8",
  border: "#DEDDD3",
  mist: "#5B635F",
  surface: "#FFFFFF",
  ink: "#14181A",
};

const axisTick = {
  fill: COLORS.mist,
  fontSize: 11,
  fontFamily: "var(--font-mono), monospace",
};

function TooltipBox({
  active,
  payload,
  label,
  yUnit,
}: {
  active?: boolean;
  payload?: { value: number }[];
  label?: string;
  yUnit: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-border bg-surface px-3 py-2 text-xs shadow-sm">
      <p className="font-mono text-mist">{label}</p>
      <p className="mt-0.5 font-mono font-medium text-ink">
        {Math.round(payload[0].value * 10) / 10} {yUnit}
      </p>
    </div>
  );
}

/**
 * Gráfico de línea genérico para las series de /progreso. Recibe los puntos ya
 * ordenados y con el eje X formateado como texto desde el server.
 */
export function ProgressLineChart({
  points,
  yUnit = "kg",
}: {
  points: ChartPoint[];
  yUnit?: string;
}) {
  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={points}
          margin={{ top: 8, right: 12, bottom: 4, left: 4 }}
        >
          <CartesianGrid stroke={COLORS.border} strokeDasharray="3 3" />
          <XAxis
            dataKey="x"
            tick={axisTick}
            tickLine={{ stroke: COLORS.border }}
            axisLine={{ stroke: COLORS.border }}
            minTickGap={16}
          />
          <YAxis
            tick={axisTick}
            tickLine={{ stroke: COLORS.border }}
            axisLine={{ stroke: COLORS.border }}
            domain={["dataMin - 2", "dataMax + 2"]}
            width={44}
            tickFormatter={(value: number) => `${Math.round(value)}`}
          />
          <Tooltip
            content={<TooltipBox yUnit={yUnit} />}
            cursor={{ stroke: COLORS.mist, strokeDasharray: "3 3" }}
          />
          <Line
            type="monotone"
            dataKey="y"
            stroke={COLORS.accent}
            strokeWidth={2}
            dot={{ r: 3, fill: COLORS.accent, strokeWidth: 0 }}
            activeDot={{ r: 5 }}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
