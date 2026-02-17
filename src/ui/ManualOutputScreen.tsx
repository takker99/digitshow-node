import { Box, Text } from "ink";
import type { ChannelData } from "../types/index.js";

interface ManualOutputScreenProps {
  outputs: ChannelData[];
  onSetOutput: (index: number, value: number) => void;
}

export function ManualOutputScreen({ outputs }: ManualOutputScreenProps) {
  // TODO: Implement keyboard controls for manual output adjustment
  // Will be implemented in a future enhancement
  const selectedChannel = 0;
  const inputValue = "";

  return (
    <Box flexDirection="column" padding={1}>
      <Box marginBottom={1}>
        <Text bold color="cyan">
          Manual Output Control
        </Text>
      </Box>

      <Box flexDirection="column" marginBottom={1}>
        <Text bold underline>
          Current Output Values (0-10000)
        </Text>
        {outputs.map((output, idx) => (
          <Box key={output.index}>
            <Text color={idx === selectedChannel ? "green" : "gray"}>
              {idx === selectedChannel ? "▶ " : "  "}OUT{output.index}
            </Text>
            <Text> [{output.chip}] </Text>
            <Text bold color="yellow">
              {output.raw.toFixed(0).padStart(6, " ")}
            </Text>
            {output.name && <Text color="dim"> ({output.name})</Text>}
          </Box>
        ))}
      </Box>

      <Box marginBottom={1}>
        <Text>
          Selected: OUT{selectedChannel} | Value: {inputValue || "0"}
        </Text>
      </Box>

      <Box flexDirection="column" marginTop={1}>
        <Text dimColor>Controls:</Text>
        <Text dimColor>[↑/↓] Select channel</Text>
        <Text dimColor>[0-9] Enter value (then press Enter)</Text>
        <Text dimColor>[+/-] Increment/Decrement by 100</Text>
        <Text dimColor>[Z] Set to 0 | [X] Set to 5000 | [C] Set to 10000</Text>
        <Text dimColor>[M]ain | [C]onfig | [O]utput | [Q]uit</Text>
      </Box>
    </Box>
  );
}
