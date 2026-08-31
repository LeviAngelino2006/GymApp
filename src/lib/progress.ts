/**
 * Utilidades de progreso. Funciones puras, sin acceso a base de datos.
 */

/**
 * 1RM estimado según la fórmula de Epley: `weightKg × (1 + reps / 30)`.
 *
 * Referencia: 100 kg × 5 reps → 116.67 kg.
 */
export function calculateE1RM(weightKg: number, reps: number): number {
  return weightKg * (1 + reps / 30);
}
