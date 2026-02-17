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
        {config.inputs &&
          Object.entries(config.inputs).map(([key, calib]) => (
            <Box key={key}>
              <Text color="gray">CH{key.padStart(2, "0")}: </Text>
              <Text>
                {calib.name || "Unnamed"} - [{calib.factors.join(", ")}]{" "}
                {calib.enabled ? "" : "(disabled)"}
              </Text>
            </Box>
          ))}
        {(!config.inputs || Object.keys(config.inputs).length === 0) && (
          <Text color="dim">No input calibrations configured</Text>
        )}
      </Box>

      <Box flexDirection="column" marginBottom={1}>
        <Text bold underline>
          Output Calibrations
        </Text>
        {config.outputs &&
          Object.entries(config.outputs).map(([key, calib]) => (
            <Box key={key}>
              <Text color="gray">OUT{key}: </Text>
              <Text>
                {calib.name || "Unnamed"} - [{calib.factors.join(", ")}]{" "}
                {calib.enabled ? "" : "(disabled)"}
              </Text>
            </Box>
          ))}
        {(!config.outputs || Object.keys(config.outputs).length === 0) && (
          <Text color="dim">No output calibrations configured</Text>
        )}
      </Box>

      <Box marginTop={1}>
        <Text dimColor>Press: [M]ain | [C]onfig | [O]utput | [Q]uit</Text>
      </Box>
    </Box>
  );
}
