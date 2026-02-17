import type { CalibrationFactor } from "../types/index.js";

/**
 * Apply calibration using the formula: a + bx + cx²
 * @param raw Raw sensor value
 * @param factors Calibration factors [a, b, c]
 * @returns Calibrated value
 */
export function applyCalibration(raw: number, factors: CalibrationFactor): number {
  const [a, b, c] = factors;
  return a + b * raw + c * raw * raw;
}

/**
 * Clamp value between min and max
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/**
 * Convert int16 to number
 */
export function int16ToNumber(value: number): number {
  // If value is greater than 32767, it's negative in int16
  return value > 32767 ? value - 65536 : value;
}

/**
 * Convert number to uint16 with clamping
 */
export function numberToUint16(value: number): number {
  return clamp(Math.round(value), 0, 10000);
}
