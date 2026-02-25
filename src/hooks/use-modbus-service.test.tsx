import { Box, Text } from "ink";
import { render } from "ink-testing-library";
import { act } from "react";
import { describe, expect, it, vi } from "vitest";
import type { ObservableLogger } from "../logger.ts";
import type { IModbusService } from "../ModbusService.ts";
import type { ConnectionStatusDetail } from "../types/connection.ts";
import type { ChannelData } from "../types.ts";
import { stripFrame } from "../ui/test-utils.ts";
import { useConnectionStatus, useLogs, useModbusData } from "./use-modbus-service.ts";

// --- Wrapper components ---

/** Renders inputs/outputs counts from useModbusData */
const ModbusDataWrapper = ({ service }: { service: IModbusService }) => {
  const { inputs, outputs } = useModbusData(service);
  return (
    <Box>
      <Text>{`inputs:${inputs.length} outputs:${outputs.length}`}</Text>
    </Box>
  );
};

/** Renders connection state string from useConnectionStatus */
const ConnectionStatusWrapper = ({ service }: { service: IModbusService }) => {
  const status = useConnectionStatus(service);
  return (
    <Box>
      <Text>{status ? `state:${status.state} port:${status.port}` : "none"}</Text>
    </Box>
  );
};

/** Renders log count and first message from useLogs */
const LogsWrapper = ({ logger }: { logger: ObservableLogger }) => {
  const logs = useLogs(logger);
  return (
    <Box>
      <Text>{`count:${logs.length}${logs.length > 0 ? ` first:${logs[0].message}` : ""}`}</Text>
    </Box>
  );
};

// --- Mock factories ---

/**
 * Creates a minimal IModbusService mock with helpers to fire listeners.
 */
const makeServiceMock = (
  initialInputs: ChannelData[] = [],
  initialOutputs: ChannelData[] = [],
  initialStatus?: ConnectionStatusDetail,
): {
  service: IModbusService;
  triggerDataChange: (inputs: ChannelData[], outputs: ChannelData[]) => void;
  triggerConnectionChange: () => void;
} => {
  let dataListener: ((inputs: ChannelData[], outputs: ChannelData[]) => void) | undefined;
  let connListener: (() => void) | undefined;
  let currentStatus = initialStatus;

  const service: IModbusService = {
    getConnectionState: vi.fn().mockImplementation(() => currentStatus),
    getConnectionStatus: vi.fn().mockReturnValue(false),
    getInputData: vi.fn().mockReturnValue(initialInputs),
    getOutputData: vi.fn().mockReturnValue(initialOutputs),
    onChange: vi.fn().mockImplementation((listener) => {
      dataListener = listener;
      return () => {
        dataListener = undefined;
      };
    }),
    onConnectionStateChange: vi.fn().mockImplementation((listener) => {
      connListener = listener;
      return () => {
        connListener = undefined;
      };
    }),
    restart: vi.fn().mockResolvedValue(undefined),
    setOutput: vi.fn(),
    start: vi.fn(),
    stop: vi.fn().mockResolvedValue(undefined),
  };

  return {
    service,
    triggerConnectionChange: () => {
      currentStatus = service.getConnectionState();
      connListener?.();
    },
    triggerDataChange: (inputs, outputs) => dataListener?.(inputs, outputs),
  };
};

/**
 * Creates a minimal ObservableLogger mock with helpers to fire listeners.
 */
const makeLoggerMock = (
  initialLogs: ReadonlyArray<{ level: string; message: string; timestamp: Date }> = [],
): {
  logger: ObservableLogger;
  triggerLogChange: () => void;
  setLogs: (logs: ReadonlyArray<{ level: string; message: string; timestamp: Date }>) => void;
} => {
  let logListener: (() => void) | undefined;
  let currentLogs = initialLogs;

  const logger: ObservableLogger = {
    debug: vi.fn(),
    error: vi.fn(),
    getLogs: vi.fn().mockImplementation(() => currentLogs),
    info: vi.fn(),
    subscribe: vi.fn().mockImplementation((listener) => {
      logListener = listener;
      return () => {
        logListener = undefined;
      };
    }),
    warn: vi.fn(),
  };

  return {
    logger,
    setLogs: (logs) => {
      currentLogs = logs;
    },
    triggerLogChange: () => logListener?.(),
  };
};

// --- Tests ---

describe("useModbusData", () => {
  it("returns initial data from service", () => {
    const inputs: ChannelData[] = [
      { calibrated: 1.0, channelId: "AI00", chip: "HX711", index: 0, raw: 100 },
    ];
    const outputs: ChannelData[] = [
      { calibrated: 2.0, channelId: "AO00", chip: "GP8403", index: 0, raw: 200 },
    ];
    const { service } = makeServiceMock(inputs, outputs);
    const { lastFrame } = render(<ModbusDataWrapper service={service} />);
    expect(stripFrame(lastFrame())).toContain("inputs:1 outputs:1");
  });

  it("updates when onChange callback fires", async () => {
    const { service, triggerDataChange } = makeServiceMock([], []);
    const { lastFrame } = render(<ModbusDataWrapper service={service} />);
    expect(stripFrame(lastFrame())).toContain("inputs:0 outputs:0");

    const newInputs: ChannelData[] = [
      { calibrated: 3.0, channelId: "AI00", chip: "HX711", index: 0, raw: 300 },
      { calibrated: 4.0, channelId: "AI01", chip: "ADS1115", index: 1, raw: 400 },
    ];
    await act(async () => {
      triggerDataChange(newInputs, []);
    });
    expect(stripFrame(lastFrame())).toContain("inputs:2 outputs:0");
  });
});

describe("useConnectionStatus", () => {
  it("returns initial connection state from service", () => {
    const status: ConnectionStatusDetail = {
      attemptNumber: 0,
      maxAttempts: 5,
      port: "/dev/ttyUSB0",
      state: "connected",
    };
    const { service } = makeServiceMock([], [], status);
    const { lastFrame } = render(<ConnectionStatusWrapper service={service} />);
    expect(stripFrame(lastFrame())).toContain("state:connected port:/dev/ttyUSB0");
  });

  it("returns undefined when no initial connection state", () => {
    const { service } = makeServiceMock([], [], undefined);
    const { lastFrame } = render(<ConnectionStatusWrapper service={service} />);
    expect(stripFrame(lastFrame())).toContain("none");
  });

  it("updates when onConnectionStateChange callback fires", async () => {
    const { service, triggerConnectionChange } = makeServiceMock([], [], undefined);
    const { lastFrame } = render(<ConnectionStatusWrapper service={service} />);
    expect(stripFrame(lastFrame())).toContain("none");

    const newStatus: ConnectionStatusDetail = {
      attemptNumber: 1,
      maxAttempts: 3,
      port: "/dev/ttyS0",
      state: "connecting",
    };
    vi.mocked(service.getConnectionState).mockReturnValue(newStatus);
    await act(async () => {
      triggerConnectionChange();
    });
    expect(stripFrame(lastFrame())).toContain("state:connecting port:/dev/ttyS0");
  });
});

describe("useLogs", () => {
  it("returns initial logs from logger", () => {
    const initialLogs = [{ level: "info", message: "started", timestamp: new Date() }];
    const { logger } = makeLoggerMock(initialLogs);
    const { lastFrame } = render(<LogsWrapper logger={logger} />);
    expect(stripFrame(lastFrame())).toContain("count:1 first:started");
  });

  it("returns empty array when no initial logs", () => {
    const { logger } = makeLoggerMock([]);
    const { lastFrame } = render(<LogsWrapper logger={logger} />);
    expect(stripFrame(lastFrame())).toContain("count:0");
  });

  it("updates when subscribe callback fires", async () => {
    const { logger, triggerLogChange, setLogs } = makeLoggerMock([]);
    const { lastFrame } = render(<LogsWrapper logger={logger} />);
    expect(stripFrame(lastFrame())).toContain("count:0");

    setLogs([
      { level: "warn", message: "hello", timestamp: new Date() },
      { level: "error", message: "world", timestamp: new Date() },
    ]);
    await act(async () => {
      triggerLogChange();
    });
    expect(stripFrame(lastFrame())).toContain("count:2 first:hello");
  });
});
