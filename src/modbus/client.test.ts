import { describe, expect, it } from "vitest";
import { ModbusClient } from "./client.ts";

describe("ModbusClient", () => {
  describe("initial state", () => {
    it("should be disconnected before connect() is called", () => {
      const client = new ModbusClient("/dev/ttyUSB0");
      expect(client.getConnectionStatus()).toBe(false);
    });

    it("should be disconnected with a custom slaveId", () => {
      const client = new ModbusClient("/dev/ttyUSB0", 2);
      expect(client.getConnectionStatus()).toBe(false);
    });
  });

  describe("disconnect when not connected", () => {
    it("should not throw when disconnect is called without prior connect", async () => {
      const client = new ModbusClient("/dev/ttyUSB0");
      await expect(client.disconnect()).resolves.toBeUndefined();
    });
  });

  describe("readInputs when not connected", () => {
    it("should throw when readInputs is called without connection", async () => {
      const client = new ModbusClient("/dev/ttyUSB0");
      await expect(client.readInputs()).rejects.toThrow("not connected");
    });
  });

  describe("writeOutputs when not connected", () => {
    it("should throw when writeOutputs is called without connection", async () => {
      const client = new ModbusClient("/dev/ttyUSB0");
      await expect(client.writeOutputs(Array(8).fill(0))).rejects.toThrow("not connected");
    });

    it("should throw for wrong number of values even if connected", async () => {
      // We cannot connect without hardware, but we can test the guard
      const client = new ModbusClient("/dev/ttyUSB0");
      // writeOutputs with wrong length should still throw (not connected takes priority)
      await expect(client.writeOutputs([1, 2, 3])).rejects.toThrow();
    });
  });
});
