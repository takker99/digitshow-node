import { describe, expect, it } from "vitest";
import { render } from "ink-testing-library";
import { ConfigScreen } from "./ConfigScreen.tsx";
import type { CalibrationConfig } from "../types/index.ts";

describe("ConfigScreen", () => {
  it("should render config screen with calibrations", () => {
    const config: CalibrationConfig = {
      inputs: {
        "0": { name: "Sensor 1", factors: [0, 1, 0.001], enabled: true },
        "1": { name: "Sensor 2", factors: [10, 0.5], enabled: false },
      },
      outputs: {
        "0": { name: "Valve 1", factors: [0, 1], enabled: false },
      },
    };

    const { lastFrame } = render(<ConfigScreen config={config} />);

    const output = lastFrame();
    expect(output).toContain("Calibration Configuration");
    expect(output).toContain("Sensor 1");
    expect(output).toContain("Sensor 2");
    expect(output).toContain("Valve 1");
    expect(output).toContain("0, 1, 0.001");
    expect(output).toContain("(disabled)");
  });

  it("should show message when no input calibrations", () => {
    const config: CalibrationConfig = {
      outputs: {
        "0": { name: "Valve 1", factors: [0, 1], enabled: true },
      },
    };

    const { lastFrame } = render(<ConfigScreen config={config} />);

    expect(lastFrame()).toContain("No input calibrations configured");
  });

  it("should show message when no output calibrations", () => {
    const config: CalibrationConfig = {
      inputs: {
        "0": { name: "Sensor 1", factors: [0, 1], enabled: true },
      },
    };

    const { lastFrame } = render(<ConfigScreen config={config} />);

    expect(lastFrame()).toContain("No output calibrations configured");
  });

  it("should show keyboard controls", () => {
    const config: CalibrationConfig = {};

    const { lastFrame } = render(<ConfigScreen config={config} />);

    const output = lastFrame();
    expect(output).toContain("[M]ain");
    expect(output).toContain("[C]onfig");
    expect(output).toContain("[O]utput");
    expect(output).toContain("[Q]uit");
  });
});
