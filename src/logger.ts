/**
 * Logger module with state management for terminal UI.
 * Provides observable logging that integrates with React components via useSyncExternalStore.
 */

/** Log entry type */
export type LogLevel = "info" | "error" | "warn" | "debug";

export interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: Date;
}

/**
 * Logger interface for dependency injection.
 * Minimal contract required by services and components.
 */
export interface Logger {
  /**
   * Log an info message
   */
  info(message: string): void;

  /**
   * Log an error message
   */
  error(message: string): void;

  /**
   * Log a warning message
   */
  warn(message: string): void;

  /**
   * Log a debug message
   */
  debug(message: string): void;
}

/**
 * Observable logger interface for state management.
 * Used by React components via useSyncExternalStore.
 */
export interface ObservableLogger extends Logger {
  /**
   * Get current logs snapshot.
   * Returns immutable copy to prevent external mutation.
   */
  getLogs(): ReadonlyArray<LogEntry>;

  /**
   * Subscribe to log changes.
   * Returns unsubscribe function.
   */
  subscribe(listener: () => void): () => void;
}

/**
 * Console based observable logger implementation.
 * Maintains internal log buffer and notifies subscribers on new entries.
 */
export class ConsoleLogger implements ObservableLogger {
  #logs: LogEntry[] = [];
  #subscribers: Set<() => void> = new Set();
  #maxLogs = 100; // Keep most recent 100 logs

  info(message: string): void {
    this.#addLog("info", message);
  }

  error(message: string): void {
    this.#addLog("error", message);
  }

  warn(message: string): void {
    this.#addLog("warn", message);
  }

  debug(message: string): void {
    this.#addLog("debug", message);
  }

  getLogs(): ReadonlyArray<LogEntry> {
    // Return immutable copy of logs
    return [...this.#logs];
  }

  subscribe(listener: () => void): () => void {
    this.#subscribers.add(listener);

    // Return unsubscribe function
    return () => {
      this.#subscribers.delete(listener);
    };
  }

  /**
   * Add log entry and notify subscribers.
   * Maintains buffer size limit.
   */
  #addLog(level: LogLevel, message: string): void {
    const entry: LogEntry = {
      level,
      message,
      timestamp: new Date(),
    };

    this.#logs.push(entry);

    // Keep only most recent logs
    if (this.#logs.length > this.#maxLogs) {
      this.#logs = this.#logs.slice(-this.#maxLogs);
    }

    // Notify all subscribers
    this.#subscribers.forEach((listener) => {
      listener();
    });
  }
}
