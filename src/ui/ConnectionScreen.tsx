/**
 * ConnectionScreen displays connection status and provides retry option.
 * Shows different UI based on connection state (connecting, connected, error).
 */

import { Box, Text } from "ink";
import type { ConnectionStatusDetail } from "../types/connection.ts";

interface ConnectionScreenProps {
  /** Current connection state from ModbusService */
  connectionState: ConnectionStatusDetail;
}

/**
 * Renders connection status screen.
 * Shows spinner during connecting, success message when connected, error message if failed.
 * @param props Screen props with current connection state.
 * @returns Rendered Ink component tree.
 */
export function ConnectionScreen({ connectionState }: ConnectionScreenProps) {
  return (
    <Box borderColor="cyan" borderStyle="round" flexDirection="column" paddingX={1} paddingY={1}>
      {connectionState.state === "connecting" && (
        <>
          <Box gap={1}>
            <Text color="yellow">⏳</Text>
            <Text>
              Connecting to {connectionState.port}... (attempt {connectionState.attemptNumber}/
              {connectionState.maxAttempts})
            </Text>
          </Box>
          <Text color="gray" dimColor>
            Press 'q' to quit
          </Text>
        </>
      )}

      {connectionState.state === "connected" && (
        <>
          <Text color="green">✓ Connected to {connectionState.port}</Text>
          <Text color="gray" dimColor>
            Press 'm' for main screen, 'q' to quit
          </Text>
        </>
      )}

      {connectionState.state === "error" && (
        <>
          <Text color="red">✗ Connection failed to {connectionState.port}</Text>
          {connectionState.errorMessage && (
            <Text color="red" dimColor>
              {connectionState.errorMessage}
            </Text>
          )}
          <Text color="gray" dimColor>
            Press 'r' to retry, 'q' to quit
          </Text>
        </>
      )}
    </Box>
  );
}
