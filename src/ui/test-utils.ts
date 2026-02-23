import { stripVTControlCharacters } from "node:util";

/**
 * Strip VT (Virtual Terminal) control characters from the output of lastFrame().
 * This is necessary because ink-testing-library may include ANSI escape sequences
 * when running in a TTY environment (e.g., VS Code Vitest extension).
 */
export const stripFrame = (output: string | undefined): string =>
  output ? stripVTControlCharacters(output) : "";
