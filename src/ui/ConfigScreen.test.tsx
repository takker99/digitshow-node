import { render } from "ink-testing-library";
import { describe, expect, it } from "vitest";
import type { CalibrationConfig } from "../types/index.ts";
import { ConfigScreen } from "./ConfigScreen.tsx";

describe("ConfigScreen", () => {
  it("should render config screen with enabled calibrations", () => {
    const config: CalibrationConfig = {
      inputs: {
        "0": { name: "Sensor 1", factors: [0, 1, 0.001], enabled: true },
      },
      outputs: {
        "0": { name: "Valve 1", factors: [0, 1], enabled: true },
      },
    };

    const { lastFrame } = render(<ConfigScreen config={config} />);

    const output = lastFrame();
    expect(output).toContain("Calibration Configuration");
    expect(output).toContain("Sensor 1");
    expect(output).toContain("Valve 1");
    expect(output).toContain("0, 1, 0.001");
    // When enabled, "(disabled)" should NOT appear for these items
    expect(output).not.toMatch(/Sensor 1.*\(disabled\)/);
    expect(output).not.toMatch(/Valve 1.*\(disabled\)/);
  });

  it("should render config screen with disabled calibrations", () => {
    const config: CalibrationConfig = {
      inputs: {
        "1": { name: "Sensor 2", factors: [10, 0.5], enabled: false },
      },
      outputs: {
        "0": { name: "Valve 1", factors: [0, 1], enabled: false },
      },
    };

    const { lastFrame } = render(<ConfigScreen config={config} />);

    const output = lastFrame();
    expect(output).toContain("Calibration Configuration");
    expect(output).toContain("Sensor 2");
    expect(output).toContain("Valve 1");
    // When disabled, "(disabled)" should appear
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

  it("should display disabled state for input calibrations", () => {
    const config: CalibrationConfig = {
      inputs: {
        "0": { name: "Sensor 1", factors: [0, 1], enabled: false },
      },
    };

    const { lastFrame } = render(<ConfigScreen config={config} />);

    const output = lastFrame();
    expect(output).toContain("(disabled)");
  });

  it("should display disabled state for output calibrations", () => {
    const config: CalibrationConfig = {
      outputs: {
        "0": { name: "Valve 1", factors: [0, 1], enabled: false },
      },
    };

    const { lastFrame } = render(<ConfigScreen config={config} />);

    const output = lastFrame();
    expect(output).toContain("(disabled)");
  });

  it("should display both enabled and disabled calibrations in same config", () => {
    const config: CalibrationConfig = {
      inputs: {
        "0": { name: "Enabled Sensor", factors: [0, 1], enabled: true },
        "1": { name: "Disabled Sensor", factors: [0, 1], enabled: false },
      },
      outputs: {
        "0": { name: "Enabled Valve", factors: [0, 1], enabled: true },
        "1": { name: "Disabled Valve", factors: [0, 1], enabled: false },
      },
    };

    const { lastFrame } = render(<ConfigScreen config={config} />);

    const output = lastFrame();
    expect(output).toContain("Enabled Sensor");
    expect(output).toContain("Disabled Sensor");
    expect(output).toContain("Enabled Valve");
    expect(output).toContain("Disabled Valve");
    // Should have at least one "(disabled)" for the disabled calibrations
    expect(output).toContain("(disabled)");
  });
});
