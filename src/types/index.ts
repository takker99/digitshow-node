import { z } from "zod";

// Calibration factor schema: variable-length array for polynomial coefficients
// [a0, a1, a2, ...] represents a0 + a1*x + a2*x^2 + ...
export const CalibrationFactorSchema = z.array(z.number()).min(1);

// Calibration config for a single channel
export const ChannelCalibrationSchema = z.object({
  factors: CalibrationFactorSchema,
  name: z.string().optional(),
});

// Full calibration config
export const CalibrationConfigSchema = z.object({
  inputs: z.record(z.string(), ChannelCalibrationSchema).optional(),
  outputs: z.record(z.string(), ChannelCalibrationSchema).optional(),
});

/** Polynomial coefficients `[a₀, a₁, a₂, ...]` for `a₀ + a₁x + a₂x² + ...` */
export type CalibrationFactor = z.infer<typeof CalibrationFactorSchema>;

/** Calibration data for a single channel. */
export type ChannelCalibration = z.infer<typeof ChannelCalibrationSchema>;

/** Full calibration configuration containing per-channel calibration data. */
export type CalibrationConfig = z.infer<typeof CalibrationConfigSchema>;

/** Hardware chip type associated with a channel. */
export type ChipType = "HX711" | "ADS1115" | "GP8403";

/** Represents a single sensor or actuator channel with its calibration state. */
export interface ChannelData {
  /** Human-readable channel identifier (e.g., `"AI00"` or `"AO03"`). */
  channelId: string;
  /** Zero-based index into the raw register array. */
  index: number;
  /** Raw register value before calibration. */
  raw: number;
  /** Calibrated value; equals `raw` when no calibration is configured. */
  calibrated: number;
  /** Hardware chip type associated with this channel. */
  chip: ChipType;
  /** Optional human-readable channel name from the calibration config. */
  name?: string;
}

/** Display mode that determines which value variant is shown in the UI. */
export type DisplayMode = "raw" | "calibrated";

/** Identifies the active screen in the terminal UI. */
export type Screen = "main" | "config" | "manual";
