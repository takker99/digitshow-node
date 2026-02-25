#!/usr/bin/env node
import { render } from "ink";
/**
 * Demo script for testing the UI without Modbus hardware
 * This creates a mock service that simulates sensor data
 */
import type { IModbusService } from "./ModbusService.ts";
import type { CalibrationConfig, ChannelData } from "./types.ts";
import { App } from "./ui/App.tsx";

// Mock calibration config
const config: CalibrationConfig = {
  inputs: {
    AI00: { factors: [0, 0.1, 0.0001], name: "Moisture 1" },
    AI01: { factors: [0, 0.1, 0.0001], name: "Moisture 2" },
    AI02: { factors: [-40, 0.01, 0], name: "Temperature" },
    AI08: { factors: [0, 0.001, 0], name: "pH Sensor" },
    AI09: { factors: [0, 0.01, 0], name: "EC Sensor" },
  },
  outputs: {
    AO00: { factors: [0, 1, 0], name: "Water Valve" },
    AO01: { factors: [0, 1, 0], name: "Nutrient Pump" },
  },
};

// Mock service that simulates the ModbusService interface
class MockModbusService implements IModbusService {
  #inputs: number[];
  #outputs: number[];
  #listeners: Array<(inputs: ChannelData[], outputs: ChannelData[]) => void>;
  #connected: boolean;

  constructor() {
    this.#inputs = Array(16)
      .fill(0)
      .map(() => Math.floor(Math.random() * 10000));
    this.#outputs = Array(8).fill(0);
    this.#listeners = [];
    this.#connected = true;
  }

  async start(): Promise<void> {
    // Simulate polling with random data updates
    setInterval(() => {
      // Update with some random variations
      this.#inputs = this.#inputs.map((val: number) => val + (Math.random() - 0.5) * 100);
      this.#notifyListeners();
    }, 100);
  }

  async stop(): Promise<void> {
    this.#connected = false;
  }

  #notifyListeners(): void {
    const inputData = this.getInputData();
    const outputData = this.getOutputData();
    for (const listener of this.#listeners) {
      listener(inputData, outputData);
    }
  }

  getInputData(): ChannelData[] {
    return this.#inputs.map((raw: number, index: number) => {
      const chip = index <= 7 ? ("HX711" as const) : ("ADS1115" as const);
      const channelId = `AI${index.toString().padStart(2, "0")}`;
      const calibConfig = config.inputs?.[channelId];
      const calibrated = calibConfig
        ? this.#applyCalibration(raw, calibConfig.factors as number[])
        : raw;

      return {
        calibrated,
        channelId,
        chip,
        index,
        name: calibConfig?.name,
        raw,
      };
    });
  }

  getOutputData(): ChannelData[] {
    return this.#outputs.map((raw: number, index: number) => {
      const chip = "GP8403" as const;
      const channelId = `AO${index.toString().padStart(2, "0")}`;
      const calibConfig = config.outputs?.[channelId];
      const calibrated = calibConfig
        ? this.#applyCalibration(raw, calibConfig.factors as number[])
        : raw;

      return {
        calibrated,
        channelId,
        chip,
        index,
        name: calibConfig?.name,
        raw,
      };
    });
  }

  #applyCalibration(raw: number, factors: number[]): number {
    return factors.reduce((sum, coeff, power) => sum + coeff * raw ** power, 0);
  }

  setOutput(index: number, value: number): void {
    if (index >= 0 && index < 8) {
      this.#outputs[index] = value;
    }
  }

  onChange(listener: (inputs: ChannelData[], outputs: ChannelData[]) => void): () => void {
    this.#listeners.push(listener);
    return () => {
      this.#listeners = this.#listeners.filter((l) => l !== listener);
    };
  }

  getConnectionStatus(): boolean {
    return this.#connected;
  }
}

console.log("Starting Demo Mode (Mock Data)...\n");

const service = new MockModbusService();
await service.start();

// Render the UI
const { waitUntilExit } = render(<App config={config} service={service} />, {
  incrementalRendering: true,
});

// Wait for the app to exit
await waitUntilExit();

console.log("\nDemo ended.");
