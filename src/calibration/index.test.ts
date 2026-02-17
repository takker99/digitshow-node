import { describe, expect, it } from "vitest";
import { applyCalibration, clamp, int16ToNumber, numberToUint16 } from "../calibration/index.js";

describe("Calibration", () => {
  describe("applyCalibration", () => {
    it("should apply linear calibration (a + bx)", () => {
      const factors: [number, number, number] = [10, 2, 0];
      expect(applyCalibration(0, factors)).toBe(10);
      expect(applyCalibration(5, factors)).toBe(20);
      expect(applyCalibration(10, factors)).toBe(30);
    });

    it("should apply quadratic calibration (a + bx + cx²)", () => {
      const factors: [number, number, number] = [0, 0, 1];
      expect(applyCalibration(0, factors)).toBe(0);
      expect(applyCalibration(2, factors)).toBe(4);
      expect(applyCalibration(5, factors)).toBe(25);
    });

    it("should apply full calibration formula", () => {
      const factors: [number, number, number] = [1, 2, 3];
      // 1 + 2*4 + 3*16 = 1 + 8 + 48 = 57
      expect(applyCalibration(4, factors)).toBe(57);
    });
  });

  describe("clamp", () => {
    it("should clamp value within range", () => {
      expect(clamp(5, 0, 10)).toBe(5);
      expect(clamp(-5, 0, 10)).toBe(0);
      expect(clamp(15, 0, 10)).toBe(10);
    });
  });

  describe("int16ToNumber", () => {
    it("should convert positive int16 values", () => {
      expect(int16ToNumber(0)).toBe(0);
      expect(int16ToNumber(100)).toBe(100);
      expect(int16ToNumber(32767)).toBe(32767);
    });

    it("should convert negative int16 values", () => {
      expect(int16ToNumber(65535)).toBe(-1);
      expect(int16ToNumber(65436)).toBe(-100);
      expect(int16ToNumber(32768)).toBe(-32768);
    });
  });

  describe("numberToUint16", () => {
    it("should convert and clamp to uint16 range (0-10000)", () => {
      expect(numberToUint16(5000)).toBe(5000);
      expect(numberToUint16(-100)).toBe(0);
      expect(numberToUint16(15000)).toBe(10000);
    });

    it("should round decimal values", () => {
      expect(numberToUint16(123.4)).toBe(123);
      expect(numberToUint16(123.6)).toBe(124);
    });
  });
});
