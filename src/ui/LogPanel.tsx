/**
 * LogPanel component displays recent log entries from ObservableLogger.
 * Uses useSyncExternalStore for efficient log subscriptions.
 */

import { Box, Text } from "ink";
import { useRef, useSyncExternalStore } from "react";
import type { ObservableLogger } from "../logger.ts";

interface LogPanelProps {
  /** Observable logger instance */
  logger: ObservableLogger;

  /** Maximum number of lines to display */
  maxLines?: number;
}

/**
 * Renders recent log entries from logger.
 * Shows most recent logs up to maxLines.
 * Color-codes by log level: info (default), error (red), warn (yellow), debug (gray).
 */
export function LogPanel({ logger, maxLines = 10 }: LogPanelProps) {
  const snapshotRef = useRef(logger.getLogs().slice(-maxLines));

  // Subscribe to log changes via useSyncExternalStore
  const logs = useSyncExternalStore(
    (onStoreChange) =>
      logger.subscribe(() => {
        snapshotRef.current = logger.getLogs().slice(-maxLines);
        onStoreChange();
      }),
    () => snapshotRef.current,
  );

  return (
    <Box borderColor="cyan" borderStyle="round" flexDirection="column" paddingX={1}>
      <Text dimColor>Logs:</Text>
      {logs.map((entry, idx) => {
        let color: "red" | "yellow" | "gray" | undefined;
        if (entry.level === "error") {
          color = "red";
        } else if (entry.level === "warn") {
          color = "yellow";
        } else if (entry.level === "debug") {
          color = "gray";
        }

        return (
          <Text color={color} key={`${entry.timestamp.getTime()}-${idx}`}>
            {entry.timestamp.toLocaleTimeString()} [{entry.level.toUpperCase()}] {entry.message}
          </Text>
        );
      })}
    </Box>
  );
}
