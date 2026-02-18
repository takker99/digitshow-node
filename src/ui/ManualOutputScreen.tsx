import { Box, Text, useInput } from "ink";
import { useState } from "react";
import type { ChannelData } from "../types/index.ts";

interface ManualOutputScreenProps {
  outputs: ChannelData[];
  onSetOutput: (index: number, value: number) => void;
}

export function ManualOutputScreen({ outputs, onSetOutput }: ManualOutputScreenProps) {
  const [selectedChannel, setSelectedChannel] = useState(0);
  const [inputValue, setInputValue] = useState("");

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
        const newValue = prev + input;
        // Limit to max value 10000
        return parseInt(newValue, 10) <= 10000 ? newValue : prev;
      });
      return;
    }

    // Increment/Decrement
    if (input === "+" || input === "=") {
      setInputValue((prev) => {
        const current = parseInt(prev || "0", 10);
        const newValue = Math.min(current + 100, 10000);
        return newValue.toString();
      });
      return;
    }

    if (input === "-" || input === "_") {
      setInputValue((prev) => {
        const current = parseInt(prev || "0", 10);
        const newValue = Math.max(current - 100, 0);
        return newValue.toString();
      });
      return;
    }

    // Quick set values
    if (input === "z" || input === "Z") {
      setInputValue("0");
      return;
    }

    if (input === "x" || input === "X") {
      setInputValue("5000");
      return;
    }

    if (input === "c" || input === "C") {
      setInputValue("10000");
      return;
    }

    // Backspace - delete last digit
    if (key.backspace) {
      setInputValue((prev) => prev.slice(0, -1));
      return;
    }

    // Enter - confirm value
    if (key.return) {
      const value = parseInt(inputValue || "0", 10);
      if (value >= 0 && value <= 10000) {
        onSetOutput(selectedChannel, value);
        setInputValue("");
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

      <Box
        flexDirection="column"
        marginBottom={1}
        borderStyle="round"
        borderColor="blue"
        padding={1}
      >
        <Text>
          Selected:{" "}
          <Text bold color="green">
            OUT{selectedChannel}
          </Text>{" "}
          | Input Value:{" "}
          <Text bold color="yellow">
            {inputValue || "—"}
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
