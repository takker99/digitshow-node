import fs from "node:fs";
import path from "node:path";
import yaml from "js-yaml";
import { type CalibrationConfig, CalibrationConfigSchema } from "../types/index.js";

/**
 * Load calibration config from a file
 * Supports both YAML and JSON formats
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
 * Get chip type based on channel index
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
