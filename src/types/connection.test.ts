import { describe, expect, it } from "vitest";
import { computeNextConnectionState } from "./connection.ts";

describe("computeNextConnectionState", () => {
  it("transitions to connecting on connect-attempt", () => {
    const state = computeNextConnectionState(undefined, {
      attempt: 1,
      maxAttempts: 10,
      port: "/dev/test",
      type: "connect-attempt",
    });
    expect(state.state).toBe("connecting");
    expect(state.attemptNumber).toBe(1);
  });

  it("transitions to connected on connect-success", () => {
    const state = computeNextConnectionState(undefined, {
      port: "/dev/test",
      type: "connect-success",
    });
    expect(state.state).toBe("connected");
  });

  it("transitions to error on connect-error", () => {
    const state = computeNextConnectionState(undefined, {
      attempt: 10,
      errorMessage: "failed",
      maxAttempts: 10,
      port: "/dev/test",
      retryDelayMs: 0,
      type: "connect-error",
    });
    expect(state.state).toBe("error");
    expect(state.errorMessage).toBe("failed");
  });

  it("resets to connecting on disconnect", () => {
    const prev = computeNextConnectionState(undefined, {
      port: "/dev/test",
      type: "connect-success",
    });
    const state = computeNextConnectionState(prev, { type: "disconnect" });
    expect(state.state).toBe("connecting");
    expect(state.port).toBe("/dev/test");
  });

  it("uses 'unknown' port when disconnecting from undefined state", () => {
    const state = computeNextConnectionState(undefined, { type: "disconnect" });
    expect(state.port).toBe("unknown");
    expect(state.state).toBe("connecting");
  });

  it("preserves port from previous state on disconnect", () => {
    const state = computeNextConnectionState(
      { attemptNumber: 0, maxAttempts: 0, port: "/dev/ttyUSB0", state: "connected" },
      { type: "disconnect" },
    );
    expect(state.port).toBe("/dev/ttyUSB0");
  });
});
