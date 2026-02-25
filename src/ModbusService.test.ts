import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Logger } from "./logger.ts";
import { ModbusService } from "./ModbusService.ts";
import type { IModbusClient } from "./modbus/client.ts";

/** Create a fake IModbusClient with all methods stubbed. */
const makeFakeClient = (overrides?: Partial<IModbusClient>): IModbusClient => ({
  connect: vi.fn().mockResolvedValue(undefined),
  disconnect: vi.fn().mockResolvedValue(undefined),
  isConnected: vi.fn().mockReturnValue(true),
  readInputs: vi.fn().mockResolvedValue(Array(16).fill(0)),
  writeOutputs: vi.fn().mockResolvedValue(undefined),
  ...overrides,
});

/** Create a fake Logger with all methods stubbed. */
const makeLogger = (): Logger => ({
  debug: vi.fn(),
  error: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
});

describe("ModbusService", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(async () => {
    vi.useRealTimers();
  });

  // Bug1 regression: no "Polling error" during initial connect
  it("should not log polling errors while initial connection is in progress", async () => {
    const logger = makeLogger();
    // Client.connect() never resolves — simulates pending initial connection
    const client = makeFakeClient({
      connect: vi.fn().mockImplementation(() => new Promise(() => {})),
      isConnected: vi.fn().mockReturnValue(false),
    });
    const service = new ModbusService("/dev/fake", {}, logger, client, 0);
    service.start();

    // Advance 200ms: 2 poll intervals fire, but connecting flag is true so they skip
    await vi.advanceTimersByTimeAsync(200);

    expect(logger.error).not.toHaveBeenCalledWith(expect.stringContaining("Polling error"));
    await service.stop();
  });

  // Bug2 regression: no false "Reconnection successful" when device never connects
  it("should log 'Reconnection failed' (not 'Reconnection successful') when device is never available", async () => {
    const logger = makeLogger();
    const client = makeFakeClient({
      connect: vi.fn().mockRejectedValue(new Error("ENOENT: no such file")),
      isConnected: vi.fn().mockReturnValue(false),
      readInputs: vi.fn().mockRejectedValue(new Error("Modbus client not connected")),
    });
    // reconnectDelay=0 skips all delays; maxReconnectAttempts=2 to speed up test
    const service = new ModbusService("/dev/fake", {}, logger, client, 0, 2);
    service.start();

    // Advance enough: initial 2 attempts (0-delay) + poll interval (100ms) + 2 reconnect attempts
    await vi.advanceTimersByTimeAsync(500);

    expect(logger.info).not.toHaveBeenCalledWith("Reconnection successful");
    expect(logger.error).toHaveBeenCalledWith(expect.stringContaining("Reconnection failed"));
    await service.stop();
  });

  // Happy path: connected client should result in "Connected" log
  it("should log 'Connected' when client connects successfully", async () => {
    const logger = makeLogger();
    const client = makeFakeClient();
    const service = new ModbusService("/dev/fake", {}, logger, client, 0);
    service.start();

    await vi.advanceTimersByTimeAsync(50);

    expect(logger.info).toHaveBeenCalledWith(expect.stringContaining("Connected to Modbus device"));
    await service.stop();
  });
});
