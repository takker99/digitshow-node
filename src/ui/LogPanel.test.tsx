import { render } from "ink-testing-library";
import { act } from "react";
import { describe, expect, it, vi } from "vitest";
import type { LogEntry, ObservableLogger } from "../logger.ts";
import { LogPanel } from "./LogPanel.tsx";
import { stripFrame } from "./test-utils.ts";

/** Build a controllable mock ObservableLogger */
const createMockLogger = (initialLogs: LogEntry[] = []) => {
  let logs = [...initialLogs];
  let listener: (() => void) | undefined;

  const logger: ObservableLogger = {
    debug: vi.fn(),
    error: vi.fn(),
    getLogs: vi.fn(() => [...logs] as ReadonlyArray<LogEntry>),
    info: vi.fn(),
    subscribe: vi.fn((cb: () => void) => {
      listener = cb;
      return () => {
        listener = undefined;
      };
    }),
    warn: vi.fn(),
  };

  return {
    logger,
    /** Replace internal log buffer and fire the subscribe callback */
    update: (newLogs: LogEntry[]) => {
      logs = newLogs;
      listener?.();
    },
  };
};

const makeEntry = (
  level: LogEntry["level"],
  message: string,
  timestamp = new Date(0),
): LogEntry => ({
  level,
  message,
  timestamp,
});

describe("LogPanel", () => {
  it("renders the Logs: label", () => {
    const { logger } = createMockLogger();
    const { lastFrame } = render(<LogPanel logger={logger} />);
    expect(stripFrame(lastFrame())).toContain("Logs:");
  });

  it("renders log messages", () => {
    const { logger } = createMockLogger([makeEntry("info", "Hello world")]);
    const { lastFrame } = render(<LogPanel logger={logger} />);
    expect(stripFrame(lastFrame())).toContain("Hello world");
  });

  it("shows INFO logs with [INFO] label", () => {
    const { logger } = createMockLogger([makeEntry("info", "info message")]);
    const { lastFrame } = render(<LogPanel logger={logger} />);
    const output = stripFrame(lastFrame());
    expect(output).toContain("[INFO]");
    expect(output).toContain("info message");
  });

  it("shows ERROR logs with [ERROR] label", () => {
    const { logger } = createMockLogger([makeEntry("error", "error message")]);
    const { lastFrame } = render(<LogPanel logger={logger} />);
    const output = stripFrame(lastFrame());
    expect(output).toContain("[ERROR]");
    expect(output).toContain("error message");
  });

  it("shows WARN logs with [WARN] label", () => {
    const { logger } = createMockLogger([makeEntry("warn", "warn message")]);
    const { lastFrame } = render(<LogPanel logger={logger} />);
    const output = stripFrame(lastFrame());
    expect(output).toContain("[WARN]");
    expect(output).toContain("warn message");
  });

  it("shows DEBUG logs with [DEBUG] label", () => {
    const { logger } = createMockLogger([makeEntry("debug", "debug message")]);
    const { lastFrame } = render(<LogPanel logger={logger} />);
    const output = stripFrame(lastFrame());
    expect(output).toContain("[DEBUG]");
    expect(output).toContain("debug message");
  });

  it("respects maxLines limit (shows only last N logs)", () => {
    const entries = [
      makeEntry("info", "first"),
      makeEntry("info", "second"),
      makeEntry("info", "third"),
    ];
    const { logger } = createMockLogger(entries);
    const { lastFrame } = render(<LogPanel logger={logger} maxLines={2} />);
    const output = stripFrame(lastFrame());
    expect(output).not.toContain("first");
    expect(output).toContain("second");
    expect(output).toContain("third");
  });

  it("handles empty logs without crashing", () => {
    const { logger } = createMockLogger([]);
    const { lastFrame } = render(<LogPanel logger={logger} />);
    const output = stripFrame(lastFrame());
    expect(output).toContain("Logs:");
  });

  it("updates when logger notifies subscribers", () => {
    const { logger, update } = createMockLogger([makeEntry("info", "initial")]);
    const { lastFrame } = render(<LogPanel logger={logger} />);

    expect(stripFrame(lastFrame())).toContain("initial");
    expect(stripFrame(lastFrame())).not.toContain("updated");

    act(() => {
      update([makeEntry("info", "initial"), makeEntry("info", "updated")]);
    });

    expect(stripFrame(lastFrame())).toContain("updated");
  });
});
