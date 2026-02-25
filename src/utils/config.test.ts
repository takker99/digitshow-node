import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  channelIdToIndex,
  getChipType,
  indexToChannelId,
  isOutputChannel,
  loadCalibrationConfig,
} from "../utils/config.ts";

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
      expect(config.inputs?.AI00).toBeDefined();
      expect(config.inputs?.AI00?.name).toBe("Moisture Sensor 1");
      expect(config.inputs?.AI00?.factors).toEqual([0, 0.1, 0.0001]);
    });

    it("should load JSON config", () => {
      const config = loadCalibrationConfig("calibration.example.json");
      expect(config.inputs).toBeDefined();
      expect(config.inputs?.AI00).toBeDefined();
      expect(config.inputs?.AI00?.name).toBe("Moisture Sensor 1");
    });

    it("should throw for invalid file path", () => {
      expect(() => loadCalibrationConfig("nonexistent.yaml")).toThrow();
    });

    it("should throw for invalid YAML schema", () => {
      const tmp = path.join(os.tmpdir(), "invalid-schema.yaml");
      fs.writeFileSync(tmp, "inputs:\n  AI00:\n    name: 123\n    factors: not-an-array\n");
      try {
        expect(() => loadCalibrationConfig(tmp)).toThrow();
      } finally {
        fs.unlinkSync(tmp);
      }
    });
  });

  describe("indexToChannelId", () => {
    it("should return AO-prefixed ID for output channels", () => {
      expect(indexToChannelId(0, true)).toBe("AO00");
      expect(indexToChannelId(5, true)).toBe("AO05");
      expect(indexToChannelId(16, true)).toBe("AO16");
    });

    it("should return AI-prefixed ID for input channels", () => {
      expect(indexToChannelId(0, false)).toBe("AI00");
      expect(indexToChannelId(8, false)).toBe("AI08");
      expect(indexToChannelId(15, false)).toBe("AI15");
    });
  });

  describe("channelIdToIndex", () => {
    it("should parse numeric index from a valid channel ID", () => {
      expect(channelIdToIndex("AI00")).toBe(0);
      expect(channelIdToIndex("AO05")).toBe(5);
      expect(channelIdToIndex("AO16")).toBe(16);
    });

    it("should throw for invalid channel ID format", () => {
      expect(() => channelIdToIndex("invalid")).toThrow("Invalid channel ID format: invalid");
      expect(() => channelIdToIndex("A1")).toThrow();
    });
  });

  describe("isOutputChannel", () => {
    it("should return true for AO-prefixed channel IDs", () => {
      expect(isOutputChannel("AO00")).toBe(true);
      expect(isOutputChannel("AO16")).toBe(true);
    });

    it("should return false for non-AO channel IDs", () => {
      expect(isOutputChannel("AI00")).toBe(false);
      expect(isOutputChannel("HX00")).toBe(false);
    });
  });
});
