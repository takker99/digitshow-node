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
    if (displayMode === "raw") {
      return data.raw.toFixed(0);
    }
    return data.calibrated.toFixed(4);
  };

  const normalizeChip = (chip: string) => chip.toLowerCase();
  const sortByIndex = (list: ChannelData[]) => list.slice().sort((a, b) => a.index - b.index);

  const hx711Inputs = sortByIndex(inputs.filter((input) => normalizeChip(input.chip) === "hx711"));
  const ads1115Inputs = sortByIndex(
    inputs.filter((input) => normalizeChip(input.chip) === "ads1115"),
  );

  const renderInputList = (list: ChannelData[]) =>
    list.map((input) => (
      <Box key={input.index}>
        <Text color="gray">{input.channelId}</Text>
        <Text> </Text>
        <Text color="yellow">{getValue(input).padStart(10, " ")}</Text>
        {input.name && <Text color="dim"> ({input.name})</Text>}
      </Box>
    ));

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
        <Box flexDirection="row">
          {hx711Inputs.length > 0 && (
            <Box flexDirection="column" marginRight={4}>
              <Text bold underline>
                HX711
              </Text>
              {renderInputList(hx711Inputs)}
            </Box>
          )}
          {ads1115Inputs.length > 0 && (
            <Box flexDirection="column">
              <Text bold underline>
                ADS1115
              </Text>
              {renderInputList(ads1115Inputs)}
            </Box>
          )}
        </Box>
      </Box>

      <Box flexDirection="column">
        <Text bold underline>
          Output Channels (0-7)
        </Text>
        <Text bold underline>
          GP8403
        </Text>
        {outputs.map((output) => (
          <Box key={output.index}>
            <Text color="gray">{output.channelId}</Text>
            <Text> </Text>
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
