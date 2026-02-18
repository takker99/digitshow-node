import { render } from "ink-testing-library";
import { describe, expect, it } from "vitest";
import type { ChannelData } from "../types/index.ts";
import { MainScreen } from "./MainScreen.tsx";

describe("MainScreen", () => {
  const mockInputs: ChannelData[] = [
    { index: 0, raw: 1000, calibrated: 100, chip: "HX711", name: "Sensor 1" },
    { index: 1, raw: 2000, calibrated: 200, chip: "HX711" },
  ];

  const mockOutputs: ChannelData[] = [
    { index: 0, raw: 500, calibrated: 50, chip: "GP8403", name: "Valve 1" },
  ];

  it("should render main screen with connected status", () => {
    const { lastFrame } = render(
      <MainScreen inputs={mockInputs} outputs={mockOutputs} displayMode="raw" connected={true} />,
    );

    const output = lastFrame();
    expect(output).toContain("Modbus RTU Soil Testing Monitor");
    expect(output).toContain("● Connected");
    expect(output).toContain("Mode: RAW");
  });

  it("should show disconnected status", () => {
    const { lastFrame } = render(
      <MainScreen inputs={mockInputs} outputs={mockOutputs} displayMode="raw" connected={false} />,
    );

    expect(lastFrame()).toContain("○ Disconnected");
  });

  it("should display raw values in raw mode", () => {
    const { lastFrame } = render(
      <MainScreen inputs={mockInputs} outputs={mockOutputs} displayMode="raw" connected={true} />,
    );

    const output = lastFrame();
    expect(output).toContain("1000.00");
    expect(output).toContain("2000.00");
    expect(output).toContain("500.00");
  });

  it("should display calibrated values in calibrated mode", () => {
    const { lastFrame } = render(
      <MainScreen
        inputs={mockInputs}
        outputs={mockOutputs}
        displayMode="calibrated"
        connected={true}
      />,
    );

    const output = lastFrame();
    expect(output).toContain("100.00");
    expect(output).toContain("200.00");
    expect(output).toContain("50.00");
  });

  it("should display channel names when provided", () => {
    const { lastFrame } = render(
      <MainScreen inputs={mockInputs} outputs={mockOutputs} displayMode="raw" connected={true} />,
    );

    const output = lastFrame();
    expect(output).toContain("Sensor 1");
    expect(output).toContain("Valve 1");
  });

  it("should display chip types", () => {
    const { lastFrame } = render(
      <MainScreen inputs={mockInputs} outputs={mockOutputs} displayMode="raw" connected={true} />,
    );

    const output = lastFrame();
    expect(output).toContain("[HX711]");
    expect(output).toContain("[GP8403]");
  });

  it("should show keyboard controls", () => {
    const { lastFrame } = render(
      <MainScreen inputs={mockInputs} outputs={mockOutputs} displayMode="raw" connected={true} />,
    );

    const output = lastFrame();
    expect(output).toContain("[M]ain");
    expect(output).toContain("[C]onfig");
    expect(output).toContain("[O]utput");
    expect(output).toContain("[Q]uit");
  });
});
