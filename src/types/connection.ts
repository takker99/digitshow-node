/**
 * Connection state management types for ModbusService.
 * Provides type-safe state transitions with exhaustiveness checking.
 */

/**
 * Detail about connection status changes
 */
export interface ConnectionStatusDetail {
  /** Current connection state */
  state: "connecting" | "connected" | "error";

  /** Port that was attempted/connected */
  port: string;

  /** Connection attempt number (1-indexed, 0 when connected) */
  attemptNumber: number;

  /** Max attempts before giving up */
  maxAttempts: number;

  /** Error message if state is "error" */
  errorMessage?: string;

  /** Milliseconds to wait before next attempt */
  retryDelayMs?: number;
}

/**
 * Pure state transition function.
 * Computes next connection state based on current state and event.
 * Exhaustive case coverage ensures all transitions are handled.
 *
 * @param current - Current connection state (or undefined for initial state)
 * @param event - State transition event
 * @returns Next connection state detail
 */
export const computeNextConnectionState = (
  current: ConnectionStatusDetail | undefined,
  event:
    | { type: "connect-attempt"; port: string; attempt: number; maxAttempts: number }
    | { type: "connect-success"; port: string }
    | {
        type: "connect-error";
        port: string;
        attempt: number;
        maxAttempts: number;
        errorMessage: string;
        retryDelayMs: number;
      }
    | { type: "disconnect" },
): ConnectionStatusDetail => {
  // Exhaustive switch on event type
  switch (event.type) {
    case "connect-attempt": {
      return {
        attemptNumber: event.attempt,
        maxAttempts: event.maxAttempts,
        port: event.port,
        state: "connecting",
      };
    }

    case "connect-success": {
      return {
        attemptNumber: 0,
        maxAttempts: 0,
        port: event.port,
        state: "connected",
      };
    }

    case "connect-error": {
      return {
        attemptNumber: event.attempt,
        errorMessage: event.errorMessage,
        maxAttempts: event.maxAttempts,
        port: event.port,
        retryDelayMs: event.retryDelayMs,
        state: "error",
      };
    }

    case "disconnect": {
      // Reset to initial state when disconnecting
      return {
        attemptNumber: 0,
        maxAttempts: 0,
        port: current?.port ?? "unknown",
        state: "connecting",
      };
    }

    // TypeScript exhaustiveness check - if event type not handled, compile error
    default: {
      const _exhaustive: never = event;
      return _exhaustive;
    }
  }
};
