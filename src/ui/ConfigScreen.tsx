import { Box, Text } from "ink";
import type { CalibrationConfig } from "../types/index.ts";

interface ConfigScreenProps {
  config: CalibrationConfig;
}

export function ConfigScreen({ config }: ConfigScreenProps) {
  return (
    <Box flexDirection="column" padding={1}>
      <Box marginBottom={1}>
        <Text bold color="cyan">
          Calibration Configuration
        </Text>
      </Box>

      <Box flexDirection="column" marginBottom={1}>
        <Text bold underline>
          Input Calibrations
        </Text>
        {Object.entries(config.inputs ?? {}).length > 0 ? (
          Object.entries(config.inputs ?? {}).map(([key, calib]) => (
            <Box key={key}>
              <Text color="gray">CH{key.padStart(2, "0")}: </Text>
              <Text>
                {calib.name || "Unnamed"} - [{calib.factors.join(", ")}]{" "}
              </Text>
            </Box>
          ))
        ) : (
          <Text color="dim">No input calibrations configured</Text>
        )}
      </Box>

      <Box flexDirection="column" marginBottom={1}>
        <Text bold underline>
          Output Calibrations
        </Text>
        {Object.entries(config.outputs ?? {}).length > 0 ? (
          Object.entries(config.outputs ?? {}).map(([key, calib]) => (
            <Box key={key}>
              <Text color="gray">OUT{key}: </Text>
              <Text>
                {calib.name || "Unnamed"} - [{calib.factors.join(", ")}]{" "}
              </Text>
            </Box>
          ))
        ) : (
          <Text color="dim">No output calibrations configured</Text>
        )}
      </Box>

      <Box marginTop={1}>
        <Text dimColor>Press: [M]ain | [C]onfig | [O]utput | [Q]uit</Text>
      </Box>
    </Box>
  );
}
