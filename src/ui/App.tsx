import { Box, useApp, useInput } from "ink";
import { useEffect, useState } from "react";
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
  const [inputs, setInputs] = useState<ChannelData[]>([]);
  const [outputs, setOutputs] = useState<ChannelData[]>([]);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    // Update connection status
    setConnected(service.getConnectionStatus());

    // Listen for data updates
    service.onChange((newInputs, newOutputs) => {
      setInputs(newInputs);
      setOutputs(newOutputs);
      setConnected(service.getConnectionStatus());
    });

    // Initial data
    setInputs(service.getInputData());
    setOutputs(service.getOutputData());
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

    if (input === "c" || input === "C") {
      setScreen("config");
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

  const handleSetOutput = (index: number, value: number) => {
    service.setOutput(index, value);
  };

  return (
    <Box flexDirection="column">
      {screen === "main" && (
        <MainScreen
          inputs={inputs}
          outputs={outputs}
          displayMode={displayMode}
          connected={connected}
        />
      )}
      {screen === "config" && <ConfigScreen config={config} />}
      {screen === "manual" && (
        <ManualOutputScreen outputs={outputs} onSetOutput={handleSetOutput} />
      )}
    </Box>
  );
}
