import { applyCalibration } from "../calibration/index.js";
import type { CalibrationConfig, ChannelData } from "../types/index.js";
import { getChipType } from "../utils/config.js";
import { ModbusClient } from "./client.js";

export class ModbusService {
  private client: ModbusClient;
  private config: CalibrationConfig;
  private inputs: number[] = Array(16).fill(0);
  private outputs: number[] = Array(8).fill(0);
  private previousOutputs: number[] = Array(8).fill(0);
  private intervalId?: NodeJS.Timeout;
  private listeners: Array<(inputs: ChannelData[], outputs: ChannelData[]) => void> = [];

  constructor(port: string, config: CalibrationConfig, slaveId = 1) {
    this.client = new ModbusClient(port, slaveId);
    this.config = config;
  }

  async start(): Promise<void> {
    await this.client.connect();

    // Poll FC03 every 100ms
    this.intervalId = setInterval(() => {
      this.poll();
    }, 100);
  }

  async stop(): Promise<void> {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = undefined;
    }
    await this.client.disconnect();
  }

  private async poll(): Promise<void> {
    try {
      // Read inputs (FC03)
      this.inputs = await this.client.readInputs();

      // Check if outputs changed and write if needed (FC16)
      if (this.hasOutputsChanged()) {
        await this.client.writeOutputs(this.outputs);
        this.previousOutputs = [...this.outputs];
      }

      // Notify listeners
      this.notifyListeners();
    } catch (error) {
      console.error("Polling error:", error);
    }
  }

  private hasOutputsChanged(): boolean {
    return this.outputs.some((value, index) => value !== this.previousOutputs[index]);
  }

  private notifyListeners(): void {
    const inputData = this.getInputData();
    const outputData = this.getOutputData();
    for (const listener of this.listeners) {
      listener(inputData, outputData);
    }
  }

  getInputData(): ChannelData[] {
    return this.inputs.map((raw, index) => {
      const chip = getChipType(index);
      const key = `${index}`;
      const calibConfig = this.config.inputs?.[key];
      const calibrated = calibConfig?.enabled ? applyCalibration(raw, calibConfig.factors) : raw;

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
    return this.outputs.map((raw, index) => {
      const chip = "GP8403" as const;
      const key = `${index}`;
      const calibConfig = this.config.outputs?.[key];
      const calibrated = calibConfig?.enabled ? applyCalibration(raw, calibConfig.factors) : raw;

      return {
        index,
        raw,
        calibrated,
        chip,
        name: calibConfig?.name,
      };
    });
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
    return this.client.getConnectionStatus();
  }
}
