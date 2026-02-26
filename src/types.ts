import { z } from "zod";

/**
 * Variable-length polynomial coefficients schema.
 * [a0, a1, a2, ...] represents a0 + a1*x + a2*x^2 + ...
 */
export const CalibrationFactorSchema = z.array(z.number()).min(1);

/** Calibration schema for a single channel. */
export const ChannelCalibrationSchema = z.object({
  factors: CalibrationFactorSchema,
  name: z.string().optional(),
});

/** Full calibration configuration schema for inputs and outputs. */
export const CalibrationConfigSchema = z.object({
  inputs: z.record(z.string(), ChannelCalibrationSchema).optional(),
  outputs: z.record(z.string(), ChannelCalibrationSchema).optional(),
});

/** Inferred calibration factor type. */
export type CalibrationFactor = z.infer<typeof CalibrationFactorSchema>;
/** Inferred channel calibration type. */
export type ChannelCalibration = z.infer<typeof ChannelCalibrationSchema>;
/** Inferred full calibration configuration type. */
export type CalibrationConfig = z.infer<typeof CalibrationConfigSchema>;

/** Supported hardware chip types. */
export type ChipType = "HX711" | "ADS1115" | "GP8403";

/** Data model for a single channel value and metadata. */
export interface ChannelData {
  channelId: string;
  index: number;
  raw: number;
  calibrated: number;
  chip: ChipType;
  name?: string;
}

/** Display mode for channel values in the UI. */
export type DisplayMode = "raw" | "calibrated";

/** Application screen identifiers. */
export type Screen = "main" | "config" | "manual" | "connection";
