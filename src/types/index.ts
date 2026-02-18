import { z } from "zod";

// Calibration factor schema: variable-length array for polynomial coefficients
// [a0, a1, a2, ...] represents a0 + a1*x + a2*x^2 + ...
export const CalibrationFactorSchema = z.array(z.number()).min(1);

// Calibration config for a single channel
export const ChannelCalibrationSchema = z.object({
  name: z.string().optional(),
  factors: CalibrationFactorSchema,
});

// Full calibration config
export const CalibrationConfigSchema = z.object({
  inputs: z.record(z.string(), ChannelCalibrationSchema).optional(),
  outputs: z.record(z.string(), ChannelCalibrationSchema).optional(),
});

export type CalibrationFactor = z.infer<typeof CalibrationFactorSchema>;
export type ChannelCalibration = z.infer<typeof ChannelCalibrationSchema>;
export type CalibrationConfig = z.infer<typeof CalibrationConfigSchema>;

// Chip types
export type ChipType = "HX711" | "ADS1115" | "GP8403";

// Channel data
export interface ChannelData {
  index: number;
  raw: number;
  calibrated: number;
  chip: ChipType;
  name?: string;
}

// Display mode
export type DisplayMode = "raw" | "calibrated";

// Screen types
export type Screen = "main" | "config" | "manual";
