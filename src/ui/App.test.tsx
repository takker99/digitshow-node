import { render } from "ink-testing-library";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { ModbusService } from "../modbus/service.ts";
import type { CalibrationConfig, ChannelData } from "../types/index.ts";
import { indexToChannelId } from "../utils/config.ts";
import { App } from "./App.tsx";

const wait = () => new Promise((resolve) => setTimeout(resolve, 10));

// Wait for condition with timeout
const waitFor = async (
  condition: () => boolean,
  maxAttempts = 100,
  interval = 10,
): Promise<void> => {
  for (let i = 0; i < maxAttempts; i++) {
    if (condition()) {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, interval));
  }
  throw new Error(`Timeout waiting for condition after ${maxAttempts * interval}ms`);
};

function createChannelData(
  index: number,
  raw: number,
  chip: ChannelData["chip"],
  name?: string,
  isOutput = false,
) {
  return {
    calibrated: raw / 100,
    channelId: indexToChannelId(index, isOutput),
    chip,
    index,
    name,
    raw,
  } satisfies ChannelData;
}

const config: CalibrationConfig = {
  inputs: {
    AI00: { factors: [0, 0.1], name: "Moisture" },
  },
  outputs: {
    AO00: { factors: [0, 1], name: "Valve" },
  },
};

class FakeModbusService {
  #inputs: ChannelData[];
  #outputs: ChannelData[];
  #connected: boolean;
  #listeners: Array<(inputs: ChannelData[], outputs: ChannelData[]) => void>;

  setOutput = vi.fn((index: number, value: number) => {
    if (index >= 0 && index < this.#outputs.length) {
      this.#outputs[index] = {
        ...this.#outputs[index],
        calibrated: value / 100,
        raw: value,
      };
    }
  });

  constructor() {
    this.#inputs = [
      createChannelData(0, 1111, "HX711", "In-0"),
      createChannelData(8, 2222, "ADS1115", "In-8"),
    ];
    this.#outputs = [createChannelData(0, 3333, "GP8403", "Out-0", true)];
    this.#connected = true;
    this.#listeners = [];
  }

  getInputData(): ChannelData[] {
    return this.#inputs;
  }

  getOutputData(): ChannelData[] {
    return this.#outputs;
  }

  getConnectionStatus(): boolean {
    return this.#connected;
  }

  onChange(listener: (inputs: ChannelData[], outputs: ChannelData[]) => void): void {
    this.#listeners.push(listener);
  }

  emit(update?: { connected?: boolean; inputs?: ChannelData[]; outputs?: ChannelData[] }): void {
    if (typeof update?.connected === "boolean") {
      this.#connected = update.connected;
    }
    if (update?.inputs) {
      this.#inputs = update.inputs;
    }
    if (update?.outputs) {
      this.#outputs = update.outputs;
    }

    for (const listener of this.#listeners) {
      listener(this.#inputs, this.#outputs);
    }
  }
}

describe("App", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should render main screen with initial service data", async () => {
    const service = new FakeModbusService();
    const { lastFrame } = render(
      <App config={config} service={service as unknown as ModbusService} />,
    );

    await wait();

    const output = lastFrame();
    expect(output).toContain("Modbus RTU Soil Testing Monitor");
    expect(output).toContain("Connected");
    expect(output).toContain("Mode:");
    expect(output).toContain("RAW");
    expect(output).toContain("AI00");
    expect(output).toContain("AO00");
  });

  it("should update displayed data when service emits changes", async () => {
    const service = new FakeModbusService();
    const { lastFrame } = render(
      <App config={config} service={service as unknown as ModbusService} />,
    );

    await wait();

    service.emit({
      connected: false,
      inputs: [createChannelData(0, 9876, "HX711", "Updated In")],
      outputs: [createChannelData(0, 4321, "GP8403", "Updated Out")],
    });
    await wait();

    const output = lastFrame();
    expect(output).toContain("○ Disconnected");
    expect(output).toContain("Updated In");
    expect(output).toContain("Updated Out");
    expect(output).toContain("9876");
    expect(output).toContain("4321");
  });

  it("should navigate between main, config and manual screens", async () => {
    const service = new FakeModbusService();
    const { lastFrame, stdin } = render(
      <App config={config} service={service as unknown as ModbusService} />,
    );

    stdin.write("c");
    await wait();
    expect(lastFrame()).toContain("Calibration Configuration");

    stdin.write("o");
    await wait();
    expect(lastFrame()).toContain("Manual Output Control");

    stdin.write("m");
    await wait();
    expect(lastFrame()).toContain("Modbus RTU Soil Testing Monitor");
  });

  it("should keep app responsive when sending manual-style input keys", async () => {
    const service = new FakeModbusService();
    const { lastFrame, stdin } = render(
      <App config={config} service={service as unknown as ModbusService} />,
    );

    stdin.write("o");
    await wait();
    expect(lastFrame()).toContain("Manual Output Control");

    stdin.write("c");
    await wait();

    const output = lastFrame();
    expect(output).toBeDefined();
  });

  it("should pass manual input interactions through App without errors", async () => {
    const service = new FakeModbusService();
    const { lastFrame, stdin } = render(
      <App config={config} service={service as unknown as ModbusService} />,
    );

    stdin.write("o");
    await waitFor(() => (lastFrame() ?? "").includes("Manual Output Control"), 100, 10);

    stdin.write("1");
    await waitFor(() => (lastFrame() ?? "").includes("Input Value: 1"), 100, 10);

    stdin.write("2");
    await waitFor(() => (lastFrame() ?? "").includes("Input Value: 12"), 100, 10);

    stdin.write("3");
    await waitFor(() => (lastFrame() ?? "").includes("Input Value: 123"), 100, 10);

    const output = lastFrame();
    expect(output).toContain("Manual Output Control");
    expect(output).toContain("Input Value:");
    expect(output).toContain("123");
  });

  it("should change display mode only on main screen", async () => {
    const service = new FakeModbusService();
    const { lastFrame, stdin } = render(
      <App config={config} service={service as unknown as ModbusService} />,
    );

    stdin.write("l");
    await wait();
    expect(lastFrame()).toContain("CALIBRATED");

    stdin.write("c");
    await wait();
    expect(lastFrame()).toContain("Calibration Configuration");

    stdin.write("r");
    await wait();

    stdin.write("m");
    await wait();
    expect(lastFrame()).toContain("CALIBRATED");
  });

  it("should support uppercase navigation and mode keys", async () => {
    const service = new FakeModbusService();
    const { lastFrame, stdin } = render(
      <App config={config} service={service as unknown as ModbusService} />,
    );

    stdin.write("L");
    await wait();
    expect(lastFrame()).toContain("CALIBRATED");

    stdin.write("R");
    await wait();
    expect(lastFrame()).toContain("RAW");

    stdin.write("C");
    await wait();
    expect(lastFrame()).toContain("Calibration Configuration");

    stdin.write("O");
    await wait();
    expect(lastFrame()).toContain("Manual Output Control");

    stdin.write("M");
    await wait();
    expect(lastFrame()).toContain("Modbus RTU Soil Testing Monitor");
  });

  it("should call service.setOutput when manual value is confirmed", async () => {
    const service = new FakeModbusService();
    const { stdin, lastFrame } = render(
      <App config={config} service={service as unknown as ModbusService} />,
    );

    stdin.write("o");
    await wait();

    const initialOutput = lastFrame();
    expect(initialOutput).toContain("Manual Output Control");

    stdin.write("4");
    stdin.write("2");
    await wait();

    const withInput = lastFrame();
    expect(withInput).toContain("Input Value: 42");

    stdin.write("\r");
    await wait();

    expect(service.setOutput).toHaveBeenCalledWith(0, 42);
  });

  it("should handle quit key input without throwing", async () => {
    const service = new FakeModbusService();
    const { stdin } = render(<App config={config} service={service as unknown as ModbusService} />);

    stdin.write("Q");
    await wait();

    expect(true).toBe(true);
  });
});
