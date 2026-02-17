import { z } from "zod";

// Calibration factor schema: [a, b, c] for a + bx + cx²
export const CalibrationFactorSchema = z.tuple([z.number(), z.number(), z.number()]);

// Calibration config for a single channel
export const ChannelCalibrationSchema = z.object({
  name: z.string().optional(),
  factors: CalibrationFactorSchema,
  enabled: z.boolean().default(true),
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
