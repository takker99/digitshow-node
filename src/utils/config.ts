import fs from "node:fs";
import path from "node:path";
import yaml from "js-yaml";
import { type CalibrationConfig, CalibrationConfigSchema } from "../types/index.ts";

/**
 * Loads and validates a calibration configuration file.
 *
 * Supports both YAML (`.yaml` / `.yml`) and JSON formats.
 *
 * @param filePath - Path to the configuration file (relative or absolute).
 * @returns The validated calibration configuration.
 */
export const loadCalibrationConfig = (filePath: string): CalibrationConfig => {
  const fullPath = path.resolve(filePath);
  const content = fs.readFileSync(fullPath, "utf-8");

  let data: unknown;
  if (filePath.endsWith(".yaml") || filePath.endsWith(".yml")) {
    data = yaml.load(content);
  } else {
    data = JSON.parse(content);
  }

  // Validate and parse with schema
  return CalibrationConfigSchema.parse(data);
};

/**
 * Converts a zero-based channel array index to a human-readable channel ID.
 *
 * Input channels use the prefix `AI` (e.g., `AI00`–`AI15`).
 * Output channels use the prefix `AO` (e.g., `AO00`–`AO07`).
 *
 * @param index - Zero-based channel index.
 * @param isOutput - `true` for output channels, `false` for input channels.
 * @returns The channel ID string (e.g., `"AI03"` or `"AO01"`).
 */
export const indexToChannelId = (index: number, isOutput: boolean): string => {
  const prefix = isOutput ? "AO" : "AI";
  return `${prefix}${index.toString().padStart(2, "0")}`;
};

/**
 * Converts a channel ID string to its zero-based array index.
 *
 * @param channelId - A channel ID in the format `AI##` or `AO##`.
 * @returns The zero-based index.
 * @throws If the channel ID format is invalid.
 */
export const channelIdToIndex = (channelId: string): number => {
  const match = channelId.match(/^[A-Z]{2}(\d+)$/);
  if (!match) {
    throw new Error(`Invalid channel ID format: ${channelId}`);
  }
  return parseInt(match[1], 10);
};

/**
 * Returns `true` when the given channel ID represents an output channel (prefix `AO`).
 *
 * @param channelId - A channel ID string (e.g., `"AO00"` or `"AI03"`).
 */
export const isOutputChannel = (channelId: string): boolean => channelId.startsWith("AO");

/**
 * Determines the chip type associated with a given input channel index.
 *
 * Channels 0–7 correspond to HX711, channels 8–15 to ADS1115.
 * Any other index is treated as GP8403 (output chip).
 *
 * @param index - Zero-based channel index.
 * @returns The chip type string.
 */
export const getChipType = (index: number): "HX711" | "ADS1115" | "GP8403" => {
  if (index >= 0 && index <= 7) {
    return "HX711";
  }
  if (index >= 8 && index <= 15) {
    return "ADS1115";
  }
  return "GP8403";
};
