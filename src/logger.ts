/**
 * Logger module with state management for terminal UI.
 * Provides observable logging that integrates with React components via useSyncExternalStore.
 */

/** Log entry type */
export type LogLevel = "info" | "error" | "warn" | "debug";

/** Single immutable log record entry. */
export interface LogEntry {
  /** Log severity level. */
  level: LogLevel;
  /** Human-readable log message. */
  message: string;
  /** Timestamp when the entry was created. */
  timestamp: Date;
}

/**
 * Logger interface for dependency injection.
 * Minimal contract required by services and components.
 */
export interface Logger {
  /**
   * Log an info message.
   * @param message Message to log.
   * @returns {void}
   */
  info(message: string): void;

  /**
   * Log an error message.
   * @param message Message to log.
   * @returns {void}
   */
  error(message: string): void;

  /**
   * Log a warning message.
   * @param message Message to log.
   * @returns {void}
   */
  warn(message: string): void;

  /**
   * Log a debug message.
   * @param message Message to log.
   * @returns {void}
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
   * @returns Read-only list of log entries.
   */
  getLogs(): ReadonlyArray<LogEntry>;

  /**
   * Subscribe to log changes.
   * Returns unsubscribe function.
   * @param listener Callback invoked when logs change.
   * @returns Function to unsubscribe the listener.
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

  /**
   * Log an info message.
   * @param message Message to log.
   * @returns {void}
   */
  info(message: string): void {
    this.#addLog("info", message);
  }

  /**
   * Log an error message.
   * @param message Message to log.
   * @returns {void}
   */
  error(message: string): void {
    this.#addLog("error", message);
  }

  /**
   * Log a warning message.
   * @param message Message to log.
   * @returns {void}
   */
  warn(message: string): void {
    this.#addLog("warn", message);
  }

  /**
   * Log a debug message.
   * @param message Message to log.
   * @returns {void}
   */
  debug(message: string): void {
    this.#addLog("debug", message);
  }

  /**
   * Get current logs snapshot.
   * @returns Read-only copy of stored log entries.
   */
  getLogs(): ReadonlyArray<LogEntry> {
    // Return immutable copy of logs
    return [...this.#logs];
  }

  /**
   * Subscribe to log change notifications.
   * @param listener Callback invoked after new entries are added.
   * @returns Function that removes the listener.
   */
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
