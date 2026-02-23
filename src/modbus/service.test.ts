import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { CalibrationConfig } from "../types/index.ts";
import type { IModbusClient } from "./client.ts";
import { ModbusService } from "./service.ts";

const testConfig: CalibrationConfig = {
  inputs: {
    AI00: { factors: [0, 1], name: "Moisture" },
  },
  outputs: {
    AO00: { factors: [0, 1], name: "Valve" },
  },
};

const makeClient = (): IModbusClient => ({
  connect: vi.fn().mockResolvedValue(undefined),
  disconnect: vi.fn().mockResolvedValue(undefined),
  getConnectionStatus: vi.fn().mockReturnValue(true),
  readInputs: vi.fn().mockResolvedValue(Array(16).fill(0)),
  reconnect: vi.fn().mockResolvedValue(undefined),
  writeOutputs: vi.fn().mockResolvedValue(undefined),
});

let client: IModbusClient;
let service: ModbusService;

beforeEach(() => {
  client = makeClient();
  service = new ModbusService(client, testConfig);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("ModbusService", () => {
  describe("constructor injection", () => {
    it("should accept an IModbusClient and CalibrationConfig", () => {
      expect(service).toBeDefined();
    });

    it("should delegate getConnectionStatus to the client", () => {
      vi.mocked(client.getConnectionStatus).mockReturnValue(true);
      expect(service.getConnectionStatus()).toBe(true);
      expect(client.getConnectionStatus).toHaveBeenCalled();
    });

    it("should return false when client is disconnected", () => {
      vi.mocked(client.getConnectionStatus).mockReturnValue(false);
      expect(service.getConnectionStatus()).toBe(false);
    });
  });

  describe("getInputData", () => {
    it("should return 16 channels with default raw values of 0", () => {
      const inputs = service.getInputData();
      expect(inputs).toHaveLength(16);
      for (const ch of inputs) {
        expect(ch.raw).toBe(0);
      }
    });

    it("should assign HX711 to channels 0-7", () => {
      const inputs = service.getInputData();
      for (let i = 0; i <= 7; i++) {
        expect(inputs[i].chip).toBe("HX711");
      }
    });

    it("should assign ADS1115 to channels 8-15", () => {
      const inputs = service.getInputData();
      for (let i = 8; i <= 15; i++) {
        expect(inputs[i].chip).toBe("ADS1115");
      }
    });

    it("should apply calibration when configured", () => {
      // AI00 has factors [0, 1] — calibrated = raw
      // With raw 0 and calibration [0, 1], calibrated = 0 + 1*0 = 0
      const inputs = service.getInputData();
      const ai00 = inputs.find((ch) => ch.channelId === "AI00");
      expect(ai00?.name).toBe("Moisture");
    });

    it("should generate correct channel IDs", () => {
      const inputs = service.getInputData();
      expect(inputs[0].channelId).toBe("AI00");
      expect(inputs[15].channelId).toBe("AI15");
    });
  });

  describe("getOutputData", () => {
    it("should return 8 channels with default raw values of 0", () => {
      const outputs = service.getOutputData();
      expect(outputs).toHaveLength(8);
      for (const ch of outputs) {
        expect(ch.raw).toBe(0);
      }
    });

    it("should assign GP8403 to all output channels", () => {
      const outputs = service.getOutputData();
      for (const ch of outputs) {
        expect(ch.chip).toBe("GP8403");
      }
    });

    it("should generate correct channel IDs", () => {
      const outputs = service.getOutputData();
      expect(outputs[0].channelId).toBe("AO00");
      expect(outputs[7].channelId).toBe("AO07");
    });
  });

  describe("setOutput", () => {
    it("should update the raw value of the given output channel", () => {
      service.setOutput(0, 5000);
      const outputs = service.getOutputData();
      expect(outputs[0].raw).toBe(5000);
    });

    it("should ignore out-of-range index", () => {
      service.setOutput(-1, 9999);
      service.setOutput(8, 9999);
      const outputs = service.getOutputData();
      for (const ch of outputs) {
        expect(ch.raw).toBe(0);
      }
    });
  });

  describe("onChange", () => {
    it("should register a listener and return an unsubscribe function", () => {
      const listener = vi.fn();
      const unsubscribe = service.onChange(listener);
      expect(typeof unsubscribe).toBe("function");
    });

    it("should remove the listener when unsubscribe is called", async () => {
      vi.useFakeTimers();
      const listener = vi.fn();
      const unsubscribe = service.onChange(listener);

      // Simulate starting to get poll calls
      vi.mocked(client.readInputs).mockResolvedValue(Array(16).fill(100));
      await service.start();

      unsubscribe();

      // Advance timer to trigger a poll
      await vi.advanceTimersByTimeAsync(150);

      expect(listener).not.toHaveBeenCalled();

      await service.stop();
      vi.useRealTimers();
    });
  });

  describe("start / stop", () => {
    it("should call client.connect on start", async () => {
      await service.start();
      expect(client.connect).toHaveBeenCalledOnce();
      await service.stop();
    });

    it("should call client.disconnect on stop", async () => {
      await service.start();
      await service.stop();
      expect(client.disconnect).toHaveBeenCalledOnce();
    });

    it("should notify listeners after a successful poll", async () => {
      vi.useFakeTimers();
      const listener = vi.fn();
      service.onChange(listener);

      vi.mocked(client.readInputs).mockResolvedValue(Array(16).fill(42));
      await service.start();

      await vi.advanceTimersByTimeAsync(150);

      expect(listener).toHaveBeenCalled();
      const [inputs] = listener.mock.calls[0] as [ReturnType<ModbusService["getInputData"]>];
      expect(inputs[0].raw).toBe(42);

      await service.stop();
      vi.useRealTimers();
    });

    it("should attempt reconnect when client disconnects during poll", async () => {
      vi.useFakeTimers();
      vi.mocked(client.readInputs).mockRejectedValue(new Error("disconnected"));
      vi.mocked(client.getConnectionStatus).mockReturnValue(false);

      await service.start();
      await vi.advanceTimersByTimeAsync(150);

      expect(client.reconnect).toHaveBeenCalled();

      await service.stop();
      vi.useRealTimers();
    });
  });
});
