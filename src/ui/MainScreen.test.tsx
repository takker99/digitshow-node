import { render } from "ink-testing-library";
import { describe, expect, it } from "vitest";
import type { ChannelData } from "../types/index.ts";
import { MainScreen } from "./MainScreen.tsx";
import { stripFrame } from "./test-utils.ts";

describe("MainScreen", () => {
  const mockInputs: ChannelData[] = [
    { calibrated: 100, channelId: "AI00", chip: "HX711", index: 0, name: "Sensor 1", raw: 1000 },
    { calibrated: 200, channelId: "AI01", chip: "HX711", index: 1, raw: 2000 },
  ];

  const mockOutputs: ChannelData[] = [
    { calibrated: 50, channelId: "AO00", chip: "GP8403", index: 0, name: "Valve 1", raw: 500 },
  ];

  it("should render main screen with connected status", () => {
    const { lastFrame } = render(
      <MainScreen connected={true} displayMode="raw" inputs={mockInputs} outputs={mockOutputs} />,
    );

    const output = stripFrame(lastFrame());
    expect(output).toContain("Modbus RTU Soil Testing Monitor");
    expect(output).toContain("● Connected");
    expect(output).toContain("Mode: RAW");
  });

  it("should show disconnected status", () => {
    const { lastFrame } = render(
      <MainScreen connected={false} displayMode="raw" inputs={mockInputs} outputs={mockOutputs} />,
    );

    expect(stripFrame(lastFrame())).toContain("○ Disconnected");
  });

  it("should display raw values in raw mode", () => {
    const { lastFrame } = render(
      <MainScreen connected={true} displayMode="raw" inputs={mockInputs} outputs={mockOutputs} />,
    );

    const output = stripFrame(lastFrame());
    expect(output).toContain("1000");
    expect(output).toContain("2000");
    expect(output).toContain("500");
  });

  it("should display calibrated values in calibrated mode", () => {
    const { lastFrame } = render(
      <MainScreen
        connected={true}
        displayMode="calibrated"
        inputs={mockInputs}
        outputs={mockOutputs}
      />,
    );

    const output = stripFrame(lastFrame());
    expect(output).toContain("100.0000");
    expect(output).toContain("200.0000");
    expect(output).toContain("50.0000");
  });

  it("should display channel names when provided", () => {
    const { lastFrame } = render(
      <MainScreen connected={true} displayMode="raw" inputs={mockInputs} outputs={mockOutputs} />,
    );

    const output = stripFrame(lastFrame());
    expect(output).toContain("Sensor 1");
    expect(output).toContain("Valve 1");
  });

  it("should display chip types", () => {
    const { lastFrame } = render(
      <MainScreen connected={true} displayMode="raw" inputs={mockInputs} outputs={mockOutputs} />,
    );

    const output = stripFrame(lastFrame());
    expect(output).toContain("HX711");
    expect(output).toContain("GP8403");
  });

  it("should show keyboard controls", () => {
    const { lastFrame } = render(
      <MainScreen connected={true} displayMode="raw" inputs={mockInputs} outputs={mockOutputs} />,
    );

    const output = stripFrame(lastFrame());
    expect(output).toContain("[M]ain");
    expect(output).toContain("[C]onfig");
    expect(output).toContain("[O]utput");
    expect(output).toContain("[Q]uit");
  });

  it("should display ADS1115 chips when present", () => {
    const mixedInputs: ChannelData[] = [
      { calibrated: 100, channelId: "AI00", chip: "HX711", index: 0, name: "Sensor 1", raw: 1000 },
      {
        calibrated: 200,
        channelId: "AI01",
        chip: "ADS1115",
        index: 1,
        name: "Sensor 2",
        raw: 2000,
      },
    ];

    const { lastFrame } = render(
      <MainScreen connected={true} displayMode="raw" inputs={mixedInputs} outputs={mockOutputs} />,
    );

    const output = stripFrame(lastFrame());
    expect(output).toContain("HX711");
    expect(output).toContain("ADS1115");
  });
});
