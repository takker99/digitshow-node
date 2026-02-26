import fs from "node:fs";
import path from "node:path";
import yaml from "js-yaml";
import { type CalibrationConfig, CalibrationConfigSchema } from "../types.ts";

/**
 * Load calibration config from a file
 * Supports both YAML and JSON formats
 * @param filePath Path to a YAML or JSON configuration file.
 * @returns Parsed and validated calibration config.
 * @throws {Error} If file reading/parsing fails or schema validation fails.
 */
export function loadCalibrationConfig(filePath: string): CalibrationConfig {
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
}

/**
 * Convert channel index to channel ID
 * Input channels: AI00 (0), AI01 (1), ..., AI15 (15)
 * Output channels: AO00 (0), AO01 (1), ..., AO07 (7)
 * @param index Zero-based channel index.
 * @param isOutput True for output channels, false for input channels.
 * @returns Channel ID string.
 */
export function indexToChannelId(index: number, isOutput: boolean): string {
  const prefix = isOutput ? "AO" : "AI";
  return `${prefix}${index.toString().padStart(2, "0")}`;
}

/**
 * Convert channel ID to index.
 * @param channelId Channel ID string such as AI00 or AO07.
 * @returns Zero-based channel index.
 * @throws {Error} If the channel ID format is invalid.
 */
export function channelIdToIndex(channelId: string): number {
  const match = channelId.match(/^[A-Z]{2}(\d+)$/);
  if (!match) {
    throw new Error(`Invalid channel ID format: ${channelId}`);
  }
  return parseInt(match[1], 10);
}

/**
 * Check if channel ID is an output channel.
 * @param channelId Channel ID string.
 * @returns True when channel ID starts with AO.
 */
export function isOutputChannel(channelId: string): boolean {
  return channelId.startsWith("AO");
}

/**
 * Get chip type based on channel index.
 * @param index Zero-based input channel index.
 * @returns Chip type for the given channel.
 */
export function getChipType(index: number): "HX711" | "ADS1115" | "GP8403" {
  if (index >= 0 && index <= 7) {
    return "HX711";
  }
  if (index >= 8 && index <= 15) {
    return "ADS1115";
  }
  return "GP8403";
}
