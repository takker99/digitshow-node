import { applyCalibration } from "../calibration.ts";
import type { CalibrationConfig, ChannelData } from "../types/index.ts";
import { getChipType, indexToChannelId } from "../utils/config.ts";
import type { IModbusClient } from "./client.ts";

/** Provides read-only connection state. */
export interface IConnectionStatus {
  /** Returns `true` when the Modbus device is currently connected. */
  getConnectionStatus(): boolean;
}

/** Provides reactive access to channel data. */
export interface IDataSource {
  /** Returns the current calibrated input channel data. */
  getInputData(): ChannelData[];
  /** Returns the current calibrated output channel data. */
  getOutputData(): ChannelData[];
  /**
   * Subscribes to data change events.
   * @param listener - Called whenever new input or output data is available.
   * @returns An unsubscribe function that removes this listener.
   */
  onChange(listener: (inputs: ChannelData[], outputs: ChannelData[]) => void): () => void;
}

/** Allows writing to output channels. */
export interface IOutputControl {
  /**
   * Sets the raw value for an output channel.
   * @param index - Zero-based output channel index (0–7).
   * @param value - Raw output value (0–10000).
   */
  setOutput(index: number, value: number): void;
}

/**
 * Full service interface exposed to the UI layer.
 * Composes the three focused sub-interfaces.
 */
export interface IModbusService extends IConnectionStatus, IDataSource, IOutputControl {}

/**
 * Orchestrates Modbus RTU polling and data transformation.
 *
 * Reads input registers (FC04) every 100 ms, applies calibration, and notifies
 * registered listeners. Writes output registers (FC16) when outputs change.
 * Implements automatic reconnection on connection loss.
 */
export class ModbusService implements IModbusService {
  #client: IModbusClient;
  #config: CalibrationConfig;
  #inputs: number[] = Array(16).fill(0);
  #outputs: number[] = Array(8).fill(0);
  #previousOutputs: number[] = Array(8).fill(0);
  #intervalId?: NodeJS.Timeout;
  #listeners: Array<(inputs: ChannelData[], outputs: ChannelData[]) => void> = [];
  #reconnecting = false;

  /**
   * @param client - Modbus client dependency (injected for testability).
   * @param config - Calibration configuration applied to raw register values.
   */
  constructor(client: IModbusClient, config: CalibrationConfig) {
    this.#client = client;
    this.#config = config;
  }

  async start(): Promise<void> {
    await this.#client.connect();

    // Poll FC04 every 100ms
    this.#intervalId = setInterval(() => {
      this.#poll();
    }, 100);
  }

  async stop(): Promise<void> {
    if (this.#intervalId) {
      clearInterval(this.#intervalId);
      this.#intervalId = undefined;
    }
    await this.#client.disconnect();
  }

  async #poll(): Promise<void> {
    try {
      // Read inputs (FC04)
      this.#inputs = await this.#client.readInputs();

      // Check if outputs changed and write if needed (FC16)
      if (this.#hasOutputsChanged()) {
        await this.#client.writeOutputs(this.#outputs);
        this.#previousOutputs = [...this.#outputs];
      }

      // Notify listeners
      this.#notifyListeners();

      // Reset reconnecting flag on successful poll
      if (this.#reconnecting) {
        this.#reconnecting = false;
        console.log("Reconnected successfully");
      }
    } catch (error) {
      console.error("Polling error:", error);

      // Attempt to reconnect if not already reconnecting
      if (!this.#reconnecting && !this.#client.getConnectionStatus()) {
        this.#reconnecting = true;
        console.log("Connection lost, attempting to reconnect...");

        try {
          await this.#client.reconnect();
          console.log("Reconnection successful");
          this.#reconnecting = false;
        } catch (reconnectError) {
          console.error("Reconnection failed:", reconnectError);
          // Will retry on next poll cycle
        }
      }
    }
  }

  #hasOutputsChanged(): boolean {
    return this.#outputs.some((value, index) => value !== this.#previousOutputs[index]);
  }

  #notifyListeners(): void {
    const inputData = this.getInputData();
    const outputData = this.getOutputData();
    for (const listener of this.#listeners) {
      listener(inputData, outputData);
    }
  }

  getInputData(): ChannelData[] {
    return this.#inputs.map((raw, index) => {
      const chip = getChipType(index);
      const channelId = indexToChannelId(index, false);
      const calibConfig = this.#config.inputs?.[channelId];
      const calibrated = calibConfig ? applyCalibration(raw, calibConfig.factors) : raw;

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
    return this.#outputs.map((raw, index) => {
      const chip = "GP8403" as const;
      const channelId = indexToChannelId(index, true);
      const calibConfig = this.#config.outputs?.[channelId];
      const calibrated = calibConfig ? applyCalibration(raw, calibConfig.factors) : raw;

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
    return this.#client.getConnectionStatus();
  }
}
