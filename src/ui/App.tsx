import { Box, useApp, useInput } from "ink";
import { useCallback, useEffect, useState } from "react";
import type { ModbusService } from "../modbus/service.ts";
import type { CalibrationConfig, ChannelData, DisplayMode, Screen } from "../types/index.ts";
import { ConfigScreen } from "./ConfigScreen.tsx";
import { MainScreen } from "./MainScreen.tsx";
import { ManualOutputScreen } from "./ManualOutputScreen.tsx";

interface AppProps {
  service: ModbusService;
  config: CalibrationConfig;
}

export function App({ service, config }: AppProps) {
  const { exit } = useApp();
  const [screen, setScreen] = useState<Screen>("main");
  const [displayMode, setDisplayMode] = useState<DisplayMode>("raw");
  const [data, setData] = useState<{
    inputs: ChannelData[];
    outputs: ChannelData[];
    connected: boolean;
  }>(() => ({
    connected: service.getConnectionStatus(),
    inputs: service.getInputData(),
    outputs: service.getOutputData(),
  }));

  useEffect(() => {
    return service.onChange((newInputs, newOutputs) => {
      setData({ connected: service.getConnectionStatus(), inputs: newInputs, outputs: newOutputs });
    });
  }, [service]);

  useInput((input, _key) => {
    // Global navigation
    if (input === "q" || input === "Q") {
      exit();
      return;
    }

    if (input === "m" || input === "M") {
      setScreen("main");
      return;
    }

    // C key only for navigation when not in manual screen
    // (manual screen uses C for "set to 10000")
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
  });

  const handleSetOutput = useCallback(
    (index: number, value: number) => {
      service.setOutput(index, value);
    },
    [service],
  );

  return (
    <Box flexDirection="column">
      {screen === "main" && (
        <MainScreen
          connected={data.connected}
          displayMode={displayMode}
          inputs={data.inputs}
          outputs={data.outputs}
        />
      )}
      {screen === "config" && <ConfigScreen config={config} />}
      {screen === "manual" && (
        <ManualOutputScreen onSetOutput={handleSetOutput} outputs={data.outputs} />
      )}
    </Box>
  );
}
