import { render } from "ink-testing-library";
import { describe, expect, it, vi } from "vitest";
import type { ObservableLogger } from "../logger.ts";
import type { IModbusService } from "../ModbusService.ts";
import type { CalibrationConfig, ChannelData } from "../types.ts";
import { App } from "./App.tsx";
import { stripFrame } from "./test-utils.ts";

const wait = (ms = 50) => new Promise((resolve) => setTimeout(resolve, ms));

function createMockService(overrides?: Partial<IModbusService>): IModbusService {
  const mockInputs: ChannelData[] = [
    { calibrated: 100, channelId: "AI00", chip: "HX711", index: 0, name: "Moisture", raw: 1000 },
    { calibrated: 25, channelId: "AI08", chip: "ADS1115", index: 8, name: "pH", raw: 2500 },
  ];
  const mockOutputs: ChannelData[] = [
    { calibrated: 50, channelId: "AO00", chip: "GP8403", index: 0, name: "Valve", raw: 500 },
  ];

  return {
    getConnectionState: vi.fn(() => ({
      attemptNumber: 0,
      maxAttempts: 0,
      port: "/dev/mock",
      state: "connected" as const,
    })),
    getConnectionStatus: vi.fn(() => true),
    getInputData: vi.fn(() => mockInputs),
    getOutputData: vi.fn(() => mockOutputs),
    onChange: vi.fn(() => () => {}),
    onConnectionStateChange: vi.fn(() => () => {}),
    restart: vi.fn(),
    setOutput: vi.fn(),
    start: vi.fn(),
    stop: vi.fn(),
    ...overrides,
  };
}

function createMockLogger(overrides?: Partial<ObservableLogger>): ObservableLogger {
  return {
    debug: vi.fn(),
    error: vi.fn(),
    getLogs: vi.fn(() => []),
    info: vi.fn(),
    subscribe: vi.fn(() => () => {}),
    warn: vi.fn(),
    ...overrides,
  };
}

const mockConfig: CalibrationConfig = {
  inputs: {
    AI00: { factors: [0, 0.1], name: "Moisture" },
  },
  outputs: {
    AO00: { factors: [0, 1], name: "Valve" },
  },
};

describe("App", () => {
  it("should render main screen by default", () => {
    const service = createMockService();
    const logger = createMockLogger();
    const { lastFrame } = render(<App config={mockConfig} logger={logger} service={service} />);

    const output = stripFrame(lastFrame());
    expect(output).toContain("Modbus RTU Soil Testing Monitor");
  });

  it("should show connection status from service", () => {
    const service = createMockService({ getConnectionStatus: vi.fn(() => true) });
    const logger = createMockLogger();
    const { lastFrame } = render(<App config={mockConfig} logger={logger} service={service} />);

    expect(stripFrame(lastFrame())).toContain("● Connected");
  });

  it("should show disconnected status when service is not connected", () => {
    const service = createMockService({
      getConnectionState: vi.fn(() => ({
        attemptNumber: 1,
        errorMessage: "Test error",
        maxAttempts: 10,
        port: "/dev/mock",
        state: "error" as const,
      })),
      getConnectionStatus: vi.fn(() => false),
    });
    const logger = createMockLogger();
    const { lastFrame } = render(<App config={mockConfig} logger={logger} service={service} />);

    expect(stripFrame(lastFrame())).toContain("Connection failed");
  });

  it("should subscribe to onChange on mount", () => {
    const service = createMockService();
    const logger = createMockLogger();
    render(<App config={mockConfig} logger={logger} service={service} />);

    expect(service.onChange).toHaveBeenCalledOnce();
  });

  it("should call start on mount", () => {
    const service = createMockService();
    const logger = createMockLogger();
    render(<App config={mockConfig} logger={logger} service={service} />);

    expect(service.start).toHaveBeenCalledOnce();
  });

  it("should unsubscribe from onChange on unmount", () => {
    const unsubscribe = vi.fn();
    const service = createMockService({ onChange: vi.fn(() => unsubscribe) });
    const { unmount } = render(
      <App config={mockConfig} logger={createMockLogger()} service={service} />,
    );

    unmount();

    expect(unsubscribe).toHaveBeenCalled();
  });

  it("should navigate to config screen on C key", async () => {
    const service = createMockService();
    const { lastFrame, stdin } = render(
      <App config={mockConfig} logger={createMockLogger()} service={service} />,
    );

    stdin.write("c");
    await wait();

    expect(stripFrame(lastFrame())).toContain("Calibration Configuration");
  });

  it("should navigate to manual screen on O key", async () => {
    const service = createMockService();
    const { lastFrame, stdin } = render(
      <App config={mockConfig} logger={createMockLogger()} service={service} />,
    );

    stdin.write("o");
    await wait();

    expect(stripFrame(lastFrame())).toContain("Manual Output Control");
  });

  it("should navigate back to main screen on M key from config", async () => {
    const service = createMockService();
    const { lastFrame, stdin } = render(
      <App config={mockConfig} logger={createMockLogger()} service={service} />,
    );

    stdin.write("c");
    await wait();
    stdin.write("m");
    await wait();

    expect(stripFrame(lastFrame())).toContain("Modbus RTU Soil Testing Monitor");
  });

  it("should switch to raw mode on R key", async () => {
    const service = createMockService();
    const { lastFrame, stdin } = render(
      <App config={mockConfig} logger={createMockLogger()} service={service} />,
    );

    stdin.write("r");
    await wait();

    expect(stripFrame(lastFrame())).toContain("Mode: RAW");
  });

  it("should switch to calibrated mode on L key", async () => {
    const service = createMockService();
    const { lastFrame, stdin } = render(
      <App config={mockConfig} logger={createMockLogger()} service={service} />,
    );

    stdin.write("l");
    await wait();

    expect(stripFrame(lastFrame())).toContain("Mode: CALIBRATED");
  });

  it("should update display when onChange listener is triggered", async () => {
    const listeners: Array<(inputs: ChannelData[], outputs: ChannelData[]) => void> = [];
    const service = createMockService({
      onChange: vi.fn((listener) => {
        listeners.push(listener);
        return () => {};
      }),
    });

    const { lastFrame } = render(
      <App config={mockConfig} logger={createMockLogger()} service={service} />,
    );

    const newInputs: ChannelData[] = [
      {
        calibrated: 999,
        channelId: "AI00",
        chip: "HX711",
        index: 0,
        name: "Updated",
        raw: 9999,
      },
    ];
    const newOutputs: ChannelData[] = [
      { calibrated: 0, channelId: "AO00", chip: "GP8403", index: 0, name: "Valve", raw: 0 },
    ];

    for (const listener of listeners) {
      listener(newInputs, newOutputs);
    }
    await wait();

    expect(stripFrame(lastFrame())).toContain("9999");
  });

  it("should call setOutput on service when output is changed in manual screen", async () => {
    const service = createMockService();
    const { lastFrame, stdin } = render(
      <App config={mockConfig} logger={createMockLogger()} service={service} />,
    );

    stdin.write("o");
    await wait();

    // Verify we're on manual screen before typing
    expect(stripFrame(lastFrame())).toContain("Manual Output Control");

    stdin.write("5");
    stdin.write("0");
    stdin.write("0");
    stdin.write("0");
    stdin.write("\r");
    await wait();

    expect(service.setOutput).toHaveBeenCalled();
  });

  it("should not navigate to config screen on C key when on manual screen", async () => {
    const service = createMockService();
    const { lastFrame, stdin } = render(
      <App config={mockConfig} logger={createMockLogger()} service={service} />,
    );

    stdin.write("o");
    await wait();

    // Verify we're on manual screen first
    expect(stripFrame(lastFrame())).toContain("Manual Output Control");

    stdin.write("c");
    await wait();

    // C on manual screen sets value to 10000, should not switch to config
    expect(stripFrame(lastFrame())).toContain("Manual Output Control");
  });

  it("should display input channel data on main screen", () => {
    const service = createMockService();
    const { lastFrame } = render(
      <App config={mockConfig} logger={createMockLogger()} service={service} />,
    );

    const output = stripFrame(lastFrame());
    expect(output).toContain("AI00");
  });

  it("should display output channel data on main screen", () => {
    const service = createMockService();
    const { lastFrame } = render(
      <App config={mockConfig} logger={createMockLogger()} service={service} />,
    );

    const output = stripFrame(lastFrame());
    expect(output).toContain("AO00");
  });

  it("should call start with an AbortSignal", () => {
    const service = createMockService();
    render(<App config={mockConfig} logger={createMockLogger()} service={service} />);

    expect(service.start).toHaveBeenCalledWith(expect.any(AbortSignal));
  });

  it("should abort the signal when unmounted", () => {
    const service = createMockService();
    const { unmount } = render(
      <App config={mockConfig} logger={createMockLogger()} service={service} />,
    );

    const signal = vi.mocked(service.start).mock.calls[0]?.[0] as AbortSignal;
    expect(signal.aborted).toBe(false);

    unmount();

    expect(signal.aborted).toBe(true);
  });

  it("should show connection screen when connecting", () => {
    const service = createMockService({
      getConnectionState: vi.fn(() => ({
        attemptNumber: 1,
        maxAttempts: 10,
        port: "/dev/mock",
        state: "connecting" as const,
      })),
    });
    const { lastFrame } = render(
      <App config={mockConfig} logger={createMockLogger()} service={service} />,
    );

    expect(stripFrame(lastFrame())).toContain("Connecting");
  });

  it("should call restart when R is pressed on connection screen", async () => {
    const service = createMockService({
      getConnectionState: vi.fn(() => ({
        attemptNumber: 1,
        errorMessage: "err",
        maxAttempts: 10,
        port: "/dev/mock",
        state: "error" as const,
      })),
      restart: vi.fn().mockResolvedValue(undefined),
    });
    const { stdin } = render(
      <App config={mockConfig} logger={createMockLogger()} service={service} />,
    );

    await wait(); // allow useEffect to set screen to "connection"
    stdin.write("r");
    await wait();

    expect(service.restart).toHaveBeenCalled();
  });

  it("should log error when restart fails", async () => {
    const service = createMockService({
      getConnectionState: vi.fn(() => ({
        attemptNumber: 1,
        errorMessage: "err",
        maxAttempts: 10,
        port: "/dev/mock",
        state: "error" as const,
      })),
      restart: vi.fn().mockRejectedValue(new Error("port unavailable")),
    });
    const logger = createMockLogger();
    const { stdin } = render(<App config={mockConfig} logger={logger} service={service} />);

    await wait(); // allow useEffect to set screen to "connection"
    stdin.write("r");
    await wait();

    expect(logger.error).toHaveBeenCalledWith(expect.stringContaining("Restart failed"));
  });
});
