import { Box, useApp, useInput } from "ink";
import { useCallback, useEffect, useRef, useState } from "react";
import { useConnectionStatus, useModbusData } from "../hooks/use-modbus-service.ts";
import type { ObservableLogger } from "../logger.ts";
import type { IModbusService } from "../ModbusService.ts";
import type { CalibrationConfig, DisplayMode, Screen } from "../types.ts";
import { ConfigScreen } from "./ConfigScreen.tsx";
import { ConnectionScreen } from "./ConnectionScreen.tsx";
import { LogPanel } from "./LogPanel.tsx";
import { MainScreen } from "./MainScreen.tsx";
import { ManualOutputScreen } from "./ManualOutputScreen.tsx";

interface AppProps {
  /** Modbus service facade for data and control. */
  service: IModbusService;
  /** Loaded calibration configuration. */
  config: CalibrationConfig;
  /** Observable logger used by log panel and restart errors. */
  logger: ObservableLogger;
}

/**
 * Root Ink application component.
 * @param props Application dependencies and configuration.
 * @returns Rendered application layout.
 */
export function App({ service, config, logger }: AppProps) {
  const { exit } = useApp();
  const abortRef = useRef(new AbortController());
  const [screen, setScreen] = useState<Screen>("main");
  const [displayMode, setDisplayMode] = useState<DisplayMode>("raw");

  // Subscribe to Modbus data via useSyncExternalStore
  const { inputs, outputs } = useModbusData(service);

  // Subscribe to connection status via useSyncExternalStore
  const connectionState = useConnectionStatus(service);
  const connected = connectionState?.state === "connected";

  // Start service and abort on unmount
  useEffect(() => {
    service.start(abortRef.current.signal);
    return () => {
      abortRef.current.abort();
    };
  }, [service]);

  // Sync connection state to screen state
  useEffect(() => {
    if (connectionState?.state === "connected" && screen === "connection") {
      setScreen("main");
    } else if (connectionState?.state === "connecting") {
      setScreen("connection");
    } else if (connectionState?.state === "error") {
      setScreen("connection");
    }
  }, [connectionState?.state, screen]);

  useInput((input, _key) => {
    // Global navigation
    if (input === "q" || input === "Q") {
      abortRef.current.abort();
      exit();
      return;
    }

    if (input === "m" || input === "M") {
      setScreen("main");
      return;
    }

    // C key only for navigation when not in manual screen
    if (input === "c" || input === "C") {
      if (screen !== "manual") {
        setScreen("config");
      }
      return;
    }

    if (input === "o" || input === "O") {
      setScreen("manual");
      return;
    }

    // Main screen specific controls
    if (screen === "main") {
      if (input === "r" || input === "R") {
        setDisplayMode("raw");
      } else if (input === "l" || input === "L") {
        setDisplayMode("calibrated");
      }
    }

    // Connection screen retry
    if (screen === "connection" && (input === "r" || input === "R")) {
      service.restart().catch((err) => {
        logger.error(`Restart failed: ${err}`);
      });
    }
  });

  const handleSetOutput = useCallback(
    (index: number, value: number) => {
      service.setOutput(index, value);
    },
    [service],
  );

  return (
    <Box flexDirection="column">
      {/* Show connection screen if not connected */}
      {!connected && connectionState && (
        <ConnectionScreen
          connectionState={connectionState}
          key={`connection-${connectionState.state}`}
        />
      )}

      {/* Main screens (shown when connected) */}
      {screen === "main" && connected && (
        <MainScreen
          connected={connected}
          displayMode={displayMode}
          inputs={inputs}
          key="main-screen"
          outputs={outputs}
        />
      )}
      {screen === "config" && connected && <ConfigScreen config={config} key="config-screen" />}
      {screen === "manual" && connected && (
        <ManualOutputScreen key="manual-screen" onSetOutput={handleSetOutput} outputs={outputs} />
      )}

      {/* Log panel (shown in bottom of main content) */}
      <LogPanel key="log-panel" logger={logger} maxLines={5} />
    </Box>
  );
}
