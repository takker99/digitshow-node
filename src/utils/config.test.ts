import { describe, expect, it } from "vitest";
import { getChipType, loadCalibrationConfig } from "../utils/config.ts";

describe("Configuration Utils", () => {
  describe("getChipType", () => {
    it("should return HX711 for channels 0-7", () => {
      expect(getChipType(0)).toBe("HX711");
      expect(getChipType(7)).toBe("HX711");
    });

    it("should return ADS1115 for channels 8-15", () => {
      expect(getChipType(8)).toBe("ADS1115");
      expect(getChipType(15)).toBe("ADS1115");
    });

    it("should return GP8403 for other channels", () => {
      expect(getChipType(16)).toBe("GP8403");
      expect(getChipType(100)).toBe("GP8403");
    });
  });

  describe("loadCalibrationConfig", () => {
    it("should load YAML config", () => {
      const config = loadCalibrationConfig("calibration.example.yaml");
      expect(config.inputs).toBeDefined();
      expect(config.inputs?.["0"]).toBeDefined();
      expect(config.inputs?.["0"]?.name).toBe("Moisture Sensor 1");
      expect(config.inputs?.["0"]?.factors).toEqual([0, 0.1, 0.0001]);
    });

    it("should load JSON config", () => {
      const config = loadCalibrationConfig("calibration.example.json");
      expect(config.inputs).toBeDefined();
      expect(config.inputs?.["0"]).toBeDefined();
      expect(config.inputs?.["0"]?.name).toBe("Moisture Sensor 1");
    });

    it("should validate config schema", () => {
      expect(() => {
        loadCalibrationConfig("calibration.example.yaml");
      }).not.toThrow();
    });
  });
});
