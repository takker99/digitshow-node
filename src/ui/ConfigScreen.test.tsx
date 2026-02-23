import { render } from "ink-testing-library";
import { describe, expect, it } from "vitest";
import type { CalibrationConfig } from "../types/index.ts";
import { ConfigScreen } from "./ConfigScreen.tsx";
import { stripFrame } from "./test-utils.ts";

describe("ConfigScreen", () => {
  it("should render config screen with calibrations", () => {
    const config: CalibrationConfig = {
      inputs: {
        "0": { factors: [0, 1, 0.001], name: "Sensor 1" },
      },
      outputs: {
        "0": { factors: [0, 1], name: "Valve 1" },
      },
    };

    const { lastFrame } = render(<ConfigScreen config={config} />);

    const output = stripFrame(lastFrame());
    expect(output).toContain("Calibration Configuration");
    expect(output).toContain("Sensor 1");
    expect(output).toContain("Valve 1");
    expect(output).toContain("0, 1, 0.001");
  });

  it("should show message when no input calibrations", () => {
    const config: CalibrationConfig = {
      outputs: {
        "0": { factors: [0, 1], name: "Valve 1" },
      },
    };

    const { lastFrame } = render(<ConfigScreen config={config} />);

    expect(stripFrame(lastFrame())).toContain("No input calibrations configured");
  });

  it("should show message when no output calibrations", () => {
    const config: CalibrationConfig = {
      inputs: {
        "0": { factors: [0, 1], name: "Sensor 1" },
      },
    };

    const { lastFrame } = render(<ConfigScreen config={config} />);

    expect(stripFrame(lastFrame())).toContain("No output calibrations configured");
  });

  it("should show keyboard controls", () => {
    const config: CalibrationConfig = {};

    const { lastFrame } = render(<ConfigScreen config={config} />);

    const output = stripFrame(lastFrame());
    expect(output).toContain("[M]ain");
    expect(output).toContain("[C]onfig");
    expect(output).toContain("[O]utput");
    expect(output).toContain("[Q]uit");
  });
});
