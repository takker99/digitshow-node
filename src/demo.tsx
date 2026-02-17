#!/usr/bin/env node
import { render } from "ink";
/**
 * Demo script for testing the UI without Modbus hardware
 * This creates a mock service that simulates sensor data
 */
import { jsx as _jsx } from "react/jsx-runtime";
import type { ChannelData } from "./types/index.ts";
import { App } from "./ui/App.tsx";

// Mock calibration config
const config = {
  inputs: {
    "0": { name: "Moisture 1", factors: [0, 0.1, 0.0001], enabled: true },
    "1": { name: "Moisture 2", factors: [0, 0.1, 0.0001], enabled: true },
    "2": { name: "Temperature", factors: [-40, 0.01, 0], enabled: true },
    "8": { name: "pH Sensor", factors: [0, 0.001, 0], enabled: true },
    "9": { name: "EC Sensor", factors: [0, 0.01, 0], enabled: true },
  },
  outputs: {
    "0": { name: "Water Valve", factors: [0, 1, 0], enabled: false },
    "1": { name: "Nutrient Pump", factors: [0, 1, 0], enabled: false },
  },
};

// Mock service that simulates the ModbusService interface
class MockModbusService {
  private inputs: number[];
  private outputs: number[];
  private listeners: Array<(inputs: ChannelData[], outputs: ChannelData[]) => void>;
  private connected: boolean;

  constructor() {
    this.inputs = Array(16)
      .fill(0)
      .map(() => Math.floor(Math.random() * 10000));
    this.outputs = Array(8).fill(0);
    this.listeners = [];
    this.connected = true;
  }

  async start(): Promise<void> {
    // Simulate polling with random data updates
    setInterval(() => {
      // Update with some random variations
      this.inputs = this.inputs.map((val: number) => val + (Math.random() - 0.5) * 100);
      this.notifyListeners();
    }, 100);
  }

  async stop(): Promise<void> {
    this.connected = false;
  }

  private notifyListeners(): void {
    const inputData = this.getInputData();
    const outputData = this.getOutputData();
    for (const listener of this.listeners) {
      listener(inputData, outputData);
    }
  }

  getInputData(): ChannelData[] {
    return this.inputs.map((raw: number, index: number) => {
      const chip = index <= 7 ? "HX711" : "ADS1115";
      const key = `${index}` as keyof typeof config.inputs;
      const calibConfig = config.inputs?.[key];
      const calibrated = calibConfig?.enabled
        ? this.applyCalibration(raw, calibConfig.factors as [number, number, number])
        : raw;

      return {
        index,
        raw,
        calibrated,
        chip,
        name: calibConfig?.name,
      };
    });
  }

  getOutputData(): ChannelData[] {
    return this.outputs.map((raw: number, index: number) => {
      const chip = "GP8403";
      const key = `${index}` as keyof typeof config.outputs;
      const calibConfig = config.outputs?.[key];
      const calibrated = calibConfig?.enabled
        ? this.applyCalibration(raw, calibConfig.factors as [number, number, number])
        : raw;

      return {
        index,
        raw,
        calibrated,
        chip,
        name: calibConfig?.name,
      };
    });
  }

  private applyCalibration(raw: number, factors: [number, number, number]): number {
    const [a, b, c] = factors;
    return a + b * raw + c * raw * raw;
  }

  setOutput(index: number, value: number): void {
    if (index >= 0 && index < 8) {
      this.outputs[index] = value;
    }
  }

  onChange(listener: (inputs: ChannelData[], outputs: ChannelData[]) => void): void {
    this.listeners.push(listener);
  }

  getConnectionStatus(): boolean {
    return this.connected;
  }
}

console.log("Starting Demo Mode (Mock Data)...\n");

const service = new MockModbusService();
await service.start();

// Render the UI
const { waitUntilExit } = render(_jsx(App, { service: service, config: config }));

// Wait for the app to exit
await waitUntilExit();

console.log("\nDemo ended.");
