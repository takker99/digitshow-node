import type { CalibrationFactor } from "./types.ts";

/**
 * Apply polynomial calibration
 * @param raw Raw sensor value
 * @param factors Calibration factors [a0, a1, a2, ...] for a0 + a1*x + a2*x^2 + ...
 * @returns Calibrated value
 */
export function applyCalibration(raw: number, factors: CalibrationFactor): number {
  return factors.reduce((sum, coeff, power) => sum + coeff * raw ** power, 0);
}

/**
 * Clamp value between min and max.
 * @param value Value to clamp.
 * @param min Inclusive lower bound.
 * @param max Inclusive upper bound.
 * @returns Clamped value.
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/**
 * Convert int16 register value to signed number.
 * @param value Raw uint16 register value.
 * @returns Signed int16 numeric value.
 */
export function int16ToNumber(value: number): number {
  // If value is greater than 32767, it's negative in int16
  return value > 32767 ? value - 65536 : value;
}

/**
 * Convert number to uint16 domain used by device outputs.
 * @param value Value to convert.
 * @returns Rounded and clamped uint16-compatible value.
 */
export function numberToUint16(value: number): number {
  return clamp(Math.round(value), 0, 10000);
}
