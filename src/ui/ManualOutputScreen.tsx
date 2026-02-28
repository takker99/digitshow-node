import { Box, Text, useInput } from "ink";
import { useState } from "react";
import type { ChannelData } from "../types.ts";

interface ManualOutputScreenProps {
  outputs: ChannelData[];
  onSetOutput: (index: number, value: number) => void;
}

/**
 * Manual control screen for setting output channel values.
 * @param props Screen props with output list and setter callback.
 * @returns Rendered Ink component tree.
 */
export function ManualOutputScreen({ outputs, onSetOutput }: ManualOutputScreenProps) {
  const [selectedChannel, setSelectedChannel] = useState(0);
  const [inputValue, setInputValue] = useState<number | null>(null);

  useInput((input, key) => {
    // Channel selection with arrow keys
    if (key.upArrow) {
      setSelectedChannel((prev) => (prev > 0 ? prev - 1 : outputs.length - 1));
      return;
    }

    if (key.downArrow) {
      setSelectedChannel((prev) => (prev < outputs.length - 1 ? prev + 1 : 0));
      return;
    }

    // Number input (0-9)
    if (/^[0-9]$/.test(input)) {
      setInputValue((prev) => {
        const newStr = (prev !== null ? prev.toString() : "") + input;
        const newValue = parseInt(newStr, 10);
        return newValue <= 10000 ? newValue : prev;
      });
      return;
    }

    // Increment/Decrement
    if (input === "+" || input === "=") {
      setInputValue((prev) => Math.min((prev ?? 0) + 100, 10000));
      return;
    }

    if (input === "-" || input === "_") {
      setInputValue((prev) => Math.max((prev ?? 0) - 100, 0));
      return;
    }

    // Quick set values
    if (input === "z" || input === "Z") {
      setInputValue(0);
      return;
    }

    if (input === "x" || input === "X") {
      setInputValue(5000);
      return;
    }

    if (input === "c" || input === "C") {
      setInputValue(10000);
      return;
    }

    // Backspace - delete last digit
    if (key.backspace) {
      setInputValue((prev) => {
        if (prev === null) return null;
        const str = prev.toString().slice(0, -1);
        return str.length > 0 ? parseInt(str, 10) : null;
      });
      return;
    }

    // Enter - confirm value
    if (key.return) {
      const value = inputValue ?? 0;
      if (value >= 0 && value <= 10000) {
        onSetOutput(selectedChannel, value);
        setInputValue(null);
      }
      return;
    }
  });

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
              {idx === selectedChannel ? "▶ " : "  "}
              {output.channelId}
            </Text>
            <Text> [{output.chip}] </Text>
            <Text bold color="yellow">
              {output.raw.toFixed(0).padStart(6, " ")}
            </Text>
            {output.name && <Text color="dim"> ({output.name})</Text>}
          </Box>
        ))}
      </Box>

      <Box
        borderColor="blue"
        borderStyle="round"
        flexDirection="column"
        marginBottom={1}
        padding={1}
      >
        <Text>
          Selected:{" "}
          <Text bold color="green">
            {outputs[selectedChannel]?.channelId}
          </Text>{" "}
          | Input Value:{" "}
          <Text bold color="yellow">
            {inputValue !== null ? inputValue : "—"}
          </Text>
        </Text>
      </Box>

      <Box flexDirection="column" marginTop={1}>
        <Text dimColor>Controls:</Text>
        <Text dimColor>[↑/↓] Select channel</Text>
        <Text dimColor>[0-9] Enter value | [Backspace] Delete</Text>
        <Text dimColor>[+/-] Increment/Decrement by 100</Text>
        <Text dimColor>[Z] Set to 0 | [X] Set to 5000 | [C] Set to 10000</Text>
        <Text dimColor>[Enter] Confirm | [M]ain | [O]utput | [Q]uit</Text>
      </Box>
    </Box>
  );
}
