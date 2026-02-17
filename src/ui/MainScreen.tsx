import { Box, Text } from "ink";
import type { ChannelData, DisplayMode } from "../types/index.ts";

interface MainScreenProps {
  inputs: ChannelData[];
  outputs: ChannelData[];
  displayMode: DisplayMode;
  connected: boolean;
}

export function MainScreen({ inputs, outputs, displayMode, connected }: MainScreenProps) {
  const getValue = (data: ChannelData) => {
    const value = displayMode === "raw" ? data.raw : data.calibrated;
    return value.toFixed(2);
  };

  return (
    <Box flexDirection="column" padding={1}>
      <Box marginBottom={1}>
        <Text bold color="cyan">
          Modbus RTU Soil Testing Monitor
        </Text>
      </Box>

      <Box marginBottom={1}>
        <Text color={connected ? "green" : "red"}>
          {connected ? "● Connected" : "○ Disconnected"}
        </Text>
        <Text> | Mode: </Text>
        <Text bold>{displayMode.toUpperCase()}</Text>
      </Box>

      <Box flexDirection="column" marginBottom={1}>
        <Text bold underline>
          Input Channels (0-15)
        </Text>
        {inputs.map((input) => (
          <Box key={input.index}>
            <Text color="gray">CH{input.index.toString().padStart(2, "0")}</Text>
            <Text> [{input.chip}] </Text>
            <Text color="yellow">{getValue(input).padStart(10, " ")}</Text>
            {input.name && <Text color="dim"> ({input.name})</Text>}
          </Box>
        ))}
      </Box>

      <Box flexDirection="column">
        <Text bold underline>
          Output Channels (0-7)
        </Text>
        {outputs.map((output) => (
          <Box key={output.index}>
            <Text color="gray">OUT{output.index}</Text>
            <Text> [{output.chip}] </Text>
            <Text color="green">{getValue(output).padStart(10, " ")}</Text>
            {output.name && <Text color="dim"> ({output.name})</Text>}
          </Box>
        ))}
      </Box>

      <Box marginTop={1}>
        <Text dimColor>Press: [M]ain | [C]onfig | [O]utput | [R]aw | Ca[l]ibrated | [Q]uit</Text>
      </Box>
    </Box>
  );
}
