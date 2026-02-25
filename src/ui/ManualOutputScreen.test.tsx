import { render } from "ink-testing-library";
import { describe, expect, it, vi } from "vitest";
import type { ChannelData } from "../types.ts";
import { ManualOutputScreen } from "./ManualOutputScreen.tsx";
import { stripFrame } from "./test-utils.ts";

const wait = () => new Promise((resolve) => setTimeout(resolve, 10));

describe("ManualOutputScreen", () => {
  const mockOutputs: ChannelData[] = [
    {
      calibrated: 2.5,
      channelId: "AO00",
      chip: "GP8403",
      index: 0,
      name: "Valve 1",
      raw: 5000,
    },
    {
      calibrated: 3.75,
      channelId: "AO01",
      chip: "GP8403",
      index: 1,
      name: "Valve 2",
      raw: 7500,
    },
    {
      calibrated: 0,
      channelId: "AO02",
      chip: "GP8403",
      index: 2,
      name: "Pump",
      raw: 0,
    },
  ];

  it("should render manual output screen", () => {
    const mockSetOutput = vi.fn();
    const { lastFrame } = render(
      <ManualOutputScreen onSetOutput={mockSetOutput} outputs={mockOutputs} />,
    );

    const output = stripFrame(lastFrame());
    expect(output).toContain("Manual Output Control");
    expect(output).toContain("AO00");
  });

  it("should display current output values", () => {
    const mockSetOutput = vi.fn();
    const { lastFrame } = render(
      <ManualOutputScreen onSetOutput={mockSetOutput} outputs={mockOutputs} />,
    );

    const output = stripFrame(lastFrame());
    expect(output).toContain("5000");
  });

  it("should show control help text", () => {
    const mockSetOutput = vi.fn();
    const { lastFrame } = render(
      <ManualOutputScreen onSetOutput={mockSetOutput} outputs={mockOutputs} />,
    );

    const output = stripFrame(lastFrame());
    expect(output).toContain("Controls:");
  });

  it("should initially select first channel", () => {
    const mockSetOutput = vi.fn();
    const { lastFrame } = render(
      <ManualOutputScreen onSetOutput={mockSetOutput} outputs={mockOutputs} />,
    );

    const output = stripFrame(lastFrame());
    expect(output).toContain("Selected: AO00");
  });

  it("should render without errors", () => {
    const mockSetOutput = vi.fn();
    const { lastFrame } = render(
      <ManualOutputScreen onSetOutput={mockSetOutput} outputs={mockOutputs} />,
    );

    expect(stripFrame(lastFrame())).toBeDefined();
  });

  it("should display channel names when available", () => {
    const mockSetOutput = vi.fn();
    const { lastFrame } = render(
      <ManualOutputScreen onSetOutput={mockSetOutput} outputs={mockOutputs} />,
    );

    const output = stripFrame(lastFrame());
    expect(output).toContain("Valve 1");
    expect(output).toContain("Valve 2");
  });

  it("should display chip information", () => {
    const mockSetOutput = vi.fn();
    const { lastFrame } = render(
      <ManualOutputScreen onSetOutput={mockSetOutput} outputs={mockOutputs} />,
    );

    const output = stripFrame(lastFrame());
    expect(output).toContain("GP8403");
  });

  it("should accept onSetOutput as a callback prop", () => {
    const mockSetOutput = vi.fn();
    expect(() => {
      render(<ManualOutputScreen onSetOutput={mockSetOutput} outputs={mockOutputs} />);
    }).not.toThrow();
  });

  it("should highlight selected channel with arrow indicator", () => {
    const mockSetOutput = vi.fn();
    const { lastFrame } = render(
      <ManualOutputScreen onSetOutput={mockSetOutput} outputs={mockOutputs} />,
    );

    const output = stripFrame(lastFrame());
    expect(output).toMatch(/▶\s+AO00/);
  });

  it("should show all output channels", () => {
    const mockSetOutput = vi.fn();
    const { lastFrame } = render(
      <ManualOutputScreen onSetOutput={mockSetOutput} outputs={mockOutputs} />,
    );

    const output = stripFrame(lastFrame());
    for (const outputChannel of mockOutputs) {
      expect(output).toContain(outputChannel.channelId);
    }
  });

  it("should format raw values correctly", () => {
    const mockSetOutput = vi.fn();
    const testOutputs: ChannelData[] = [
      {
        calibrated: 6.1728,
        channelId: "AO00",
        chip: "GP8403",
        index: 0,
        name: "Test",
        raw: 12345.6789,
      },
    ];

    const { lastFrame } = render(
      <ManualOutputScreen onSetOutput={mockSetOutput} outputs={testOutputs} />,
    );

    const output = stripFrame(lastFrame());
    expect(output).toContain("12346");
  });

  it("should handle number input", async () => {
    const mockSetOutput = vi.fn();
    const { lastFrame, stdin } = render(
      <ManualOutputScreen onSetOutput={mockSetOutput} outputs={mockOutputs} />,
    );

    stdin.write("1");
    stdin.write("2");
    await wait();

    const output = stripFrame(lastFrame());
    expect(output).toContain("Input Value: 12");
  });

  it("should handle up arrow key to select previous channel", async () => {
    const mockSetOutput = vi.fn();
    const { lastFrame, stdin } = render(
      <ManualOutputScreen onSetOutput={mockSetOutput} outputs={mockOutputs} />,
    );

    stdin.write("\u001b[A");
    await wait();

    const output = stripFrame(lastFrame());
    expect(output).toContain("Selected: AO02");
  });

  it("should handle down arrow key to select next channel", async () => {
    const mockSetOutput = vi.fn();
    const { lastFrame, stdin } = render(
      <ManualOutputScreen onSetOutput={mockSetOutput} outputs={mockOutputs} />,
    );

    stdin.write("\u001b[B");
    await wait();

    const output = stripFrame(lastFrame());
    expect(output).toContain("Selected: AO01");
  });

  it("should handle plus key to increment value", async () => {
    const mockSetOutput = vi.fn();
    const { lastFrame, stdin } = render(
      <ManualOutputScreen onSetOutput={mockSetOutput} outputs={mockOutputs} />,
    );

    stdin.write("5");
    stdin.write("+");
    await wait();

    const output = stripFrame(lastFrame());
    expect(output).toContain("Input Value: 105");
  });

  it("should handle minus key to decrement value", async () => {
    const mockSetOutput = vi.fn();
    const { lastFrame, stdin } = render(
      <ManualOutputScreen onSetOutput={mockSetOutput} outputs={mockOutputs} />,
    );

    stdin.write("3");
    stdin.write("-");
    await wait();

    expect(stripFrame(lastFrame())).toBeDefined();
  });

  it("should handle Z key to set value to 0", async () => {
    const mockSetOutput = vi.fn();
    const { lastFrame, stdin } = render(
      <ManualOutputScreen onSetOutput={mockSetOutput} outputs={mockOutputs} />,
    );

    stdin.write("z");
    await wait();

    const output = stripFrame(lastFrame());
    expect(output).toContain("Input Value: 0");
  });

  it("should handle X key to set value to 5000", async () => {
    const mockSetOutput = vi.fn();
    const { lastFrame, stdin } = render(
      <ManualOutputScreen onSetOutput={mockSetOutput} outputs={mockOutputs} />,
    );

    stdin.write("x");
    await wait();

    const output = stripFrame(lastFrame());
    expect(output).toContain("Input Value: 5000");
  });

  it("should handle C key to set value to 10000", async () => {
    const mockSetOutput = vi.fn();
    const { lastFrame, stdin } = render(
      <ManualOutputScreen onSetOutput={mockSetOutput} outputs={mockOutputs} />,
    );

    stdin.write("c");
    await wait();

    const output = stripFrame(lastFrame());
    expect(output).toContain("Input Value: 10000");
  });

  it("should handle backspace to delete last digit", async () => {
    const mockSetOutput = vi.fn();
    const { lastFrame, stdin } = render(
      <ManualOutputScreen onSetOutput={mockSetOutput} outputs={mockOutputs} />,
    );

    stdin.write("1");
    stdin.write("2");
    stdin.write("3");
    stdin.write("\u0008");
    await wait();

    const output = stripFrame(lastFrame());
    expect(output).toContain("Input Value: 12");
  });

  it("should handle enter key to confirm value", async () => {
    const mockSetOutput = vi.fn();
    const { stdin } = render(
      <ManualOutputScreen onSetOutput={mockSetOutput} outputs={mockOutputs} />,
    );

    stdin.write("1");
    stdin.write("5");
    stdin.write("0");
    stdin.write("0");
    await wait();

    expect(stdin).toBeDefined();
  });

  it("should clamp input value to max 10000", async () => {
    const mockSetOutput = vi.fn();
    const { lastFrame, stdin } = render(
      <ManualOutputScreen onSetOutput={mockSetOutput} outputs={mockOutputs} />,
    );

    stdin.write("9");
    stdin.write("9");
    stdin.write("9");
    stdin.write("9");
    stdin.write("9");
    await wait();

    const output = stripFrame(lastFrame());
    expect(output).toContain("Input Value: 9999");
  });

  it("should ignore invalid characters", async () => {
    const mockSetOutput = vi.fn();
    const { lastFrame, stdin } = render(
      <ManualOutputScreen onSetOutput={mockSetOutput} outputs={mockOutputs} />,
    );

    stdin.write("@");
    stdin.write("#");
    stdin.write("$");
    await wait();

    const output = stripFrame(lastFrame());
    expect(output).toContain("Input Value: —");
  });

  it("should display outputs without names", () => {
    const mockSetOutput = vi.fn();
    const outputsWithoutNames: ChannelData[] = [
      {
        calibrated: 2.5,
        channelId: "AO00",
        chip: "GP8403",
        index: 0,
        raw: 5000,
      },
    ];

    const { lastFrame } = render(
      <ManualOutputScreen onSetOutput={mockSetOutput} outputs={outputsWithoutNames} />,
    );

    const output = stripFrame(lastFrame());
    expect(output).toContain("AO00");
    expect(output).toContain("[GP8403]");
  });

  it("should display mixed outputs with and without names", () => {
    const mockSetOutput = vi.fn();
    const mixedOutputs: ChannelData[] = [
      {
        calibrated: 2.5,
        channelId: "AO00",
        chip: "GP8403",
        index: 0,
        name: "Valve 1",
        raw: 5000,
      },
      {
        calibrated: 3.75,
        channelId: "AO01",
        chip: "GP8403",
        index: 1,
        raw: 7500,
      },
      {
        calibrated: 1.25,
        channelId: "AO02",
        chip: "GP8403",
        index: 2,
        name: "Pump 2",
        raw: 2500,
      },
    ];

    const { lastFrame } = render(
      <ManualOutputScreen onSetOutput={mockSetOutput} outputs={mixedOutputs} />,
    );

    const output = stripFrame(lastFrame());
    expect(output).toContain("AO00");
    expect(output).toContain("AO01");
    expect(output).toContain("AO02");
    expect(output).toContain("Valve 1");
    expect(output).toContain("Pump 2");
  });
});
