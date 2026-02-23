import type { CalibrationFactor } from "./types/index.ts";

/**
 * Applies a variable-length polynomial calibration to a raw sensor reading.
 *
 * The polynomial is evaluated as: a₀ + a₁x + a₂x² + ...
 *
 * @param raw - The raw sensor value (int16 converted to number).
 * @param factors - Polynomial coefficients [a₀, a₁, a₂, ...].
 * @returns The calibrated value.
 *
 * @example
 * applyCalibration(10, [0, 2]);    // 20  (linear: 2x)
 * applyCalibration(3, [1, 0, 2]);  // 19  (quadratic: 1 + 2x²)
 */
export const applyCalibration = (raw: number, factors: CalibrationFactor): number =>
  factors.reduce((sum, coeff, power) => sum + coeff * raw ** power, 0);

/**
 * Clamps a value to the inclusive range [min, max].
 *
 * @param value - The value to clamp.
 * @param min - Lower bound.
 * @param max - Upper bound.
 * @returns The clamped value.
 */
export const clamp = (value: number, min: number, max: number): number =>
  Math.max(min, Math.min(max, value));

/**
 * Converts a raw uint16 register value to a signed int16 number.
 *
 * @param value - The raw register value (0–65535).
 * @returns A signed integer in the range -32768–32767.
 */
export const int16ToNumber = (value: number): number =>
  // If value is greater than 32767, it's negative in int16
  value > 32767 ? value - 65536 : value;

/**
 * Converts a floating-point number to a clamped uint16 value (0–10000).
 *
 * @param value - The value to convert.
 * @returns An integer in the range 0–10000.
 */
export const numberToUint16 = (value: number): number => clamp(Math.round(value), 0, 10000);
