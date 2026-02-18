import { render } from "ink-testing-library";
import { describe, expect, it, vi } from "vitest";
import type { ChannelData } from "../types/index.ts";
import { ManualOutputScreen } from "./ManualOutputScreen.tsx";

describe("ManualOutputScreen", () => {
  const mockOutputs: ChannelData[] = [
    {
      index: 0,
      chip: "HX711",
      raw: 5000,
      calibrated: 2.5,
      name: "Valve 1",
    },
    {
      index: 1,
      chip: "ADS1115",
      raw: 7500,
      calibrated: 3.75,
      name: "Valve 2",
    },
    {
      index: 2,
      chip: "GP8403",
      raw: 0,
      calibrated: 0,
      name: "Pump",
    },
  ];

  it("should render manual output screen with channel list", () => {
    const mockSetOutput = vi.fn();
    const { lastFrame } = render(
      <ManualOutputScreen outputs={mockOutputs} onSetOutput={mockSetOutput} />,
    );

    const output = lastFrame();
    expect(output).toContain("Manual Output Control");
    expect(output).toContain("OUT0");
    expect(output).toContain("OUT1");
    expect(output).toContain("OUT2");
    expect(output).toContain("Valve 1");
    expect(output).toContain("Valve 2");
    expect(output).toContain("Pump");
  });

  it("should display current output values", () => {
    const mockSetOutput = vi.fn();
    const { lastFrame } = render(
      <ManualOutputScreen outputs={mockOutputs} onSetOutput={mockSetOutput} />,
    );

    const output = lastFrame();
    expect(output).toContain("5000");
    expect(output).toContain("7500");
  });

  it("should show control help text", () => {
    const mockSetOutput = vi.fn();
    const { lastFrame } = render(
      <ManualOutputScreen outputs={mockOutputs} onSetOutput={mockSetOutput} />,
    );

    const output = lastFrame();
    expect(output).toContain("Controls:");
    expect(output).toContain("[↑/↓] Select channel");
    expect(output).toContain("[0-9] Enter value");
    expect(output).toContain("[+/-] Increment/Decrement by 100");
    expect(output).toContain("[Z] Set to 0");
    expect(output).toContain("[X] Set to 5000");
    expect(output).toContain("[C] Set to 10000");
    expect(output).toContain("[Enter] Confirm");
  });

  it("should initially select first channel", () => {
    const mockSetOutput = vi.fn();
    const { lastFrame } = render(
      <ManualOutputScreen outputs={mockOutputs} onSetOutput={mockSetOutput} />,
    );

    const output = lastFrame();
    expect(output).toContain("Selected: OUT0");
  });

  it("should render without errors", () => {
    const mockSetOutput = vi.fn();
    const { lastFrame } = render(
      <ManualOutputScreen outputs={mockOutputs} onSetOutput={mockSetOutput} />,
    );

    const output = lastFrame();
    expect(output).toBeDefined();
  });

  it("should render with empty outputs list", () => {
    const mockSetOutput = vi.fn();
    const { lastFrame } = render(<ManualOutputScreen outputs={[]} onSetOutput={mockSetOutput} />);

    const output = lastFrame();
    expect(output).toContain("Manual Output Control");
  });

  it("should display channel names when available", () => {
    const mockSetOutput = vi.fn();
    const { lastFrame } = render(
      <ManualOutputScreen outputs={mockOutputs} onSetOutput={mockSetOutput} />,
    );

    const output = lastFrame();
    expect(output).toContain("Valve 1");
    expect(output).toContain("Valve 2");
    expect(output).toContain("Pump");
  });

  it("should display chip information", () => {
    const mockSetOutput = vi.fn();
    const { lastFrame } = render(
      <ManualOutputScreen outputs={mockOutputs} onSetOutput={mockSetOutput} />,
    );

    const output = lastFrame();
    expect(output).toContain("HX711");
    expect(output).toContain("ADS1115");
    expect(output).toContain("GP8403");
  });

  it("should accept onSetOutput as a callback prop", () => {
    const mockSetOutput = vi.fn();
    expect(() => {
      render(<ManualOutputScreen outputs={mockOutputs} onSetOutput={mockSetOutput} />);
    }).not.toThrow();
  });

  it("should highlight selected channel with arrow indicator", () => {
    const mockSetOutput = vi.fn();
    const { lastFrame } = render(
      <ManualOutputScreen outputs={mockOutputs} onSetOutput={mockSetOutput} />,
    );

    const output = lastFrame();
    // First channel should be selected (▶ indicator)
    expect(output).toMatch(/▶\s+OUT0/);
  });

  it("should show all output channels", () => {
    const mockSetOutput = vi.fn();
    const { lastFrame } = render(
      <ManualOutputScreen outputs={mockOutputs} onSetOutput={mockSetOutput} />,
    );

    const output = lastFrame();
    for (const outputChannel of mockOutputs) {
      expect(output).toContain(`OUT${outputChannel.index}`);
    }
  });

  it("should format raw values correctly", () => {
    const mockSetOutput = vi.fn();
    const testOutputs: ChannelData[] = [
      {
        index: 0,
        chip: "HX711",
        raw: 12345.6789,
        calibrated: 6.1728,
        name: "Test",
      },
    ];

    const { lastFrame } = render(
      <ManualOutputScreen outputs={testOutputs} onSetOutput={mockSetOutput} />,
    );

    const output = lastFrame();
    // Should contain the raw value formatted as integer
    expect(output).toContain("12346");
  });
});
