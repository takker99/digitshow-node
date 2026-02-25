import ModbusRTU from "modbus-serial";
import { applyCalibration, int16ToNumber, numberToUint16 } from "./calibration.ts";
import type { CalibrationConfig, ChannelData } from "./types.ts";
import { getChipType, indexToChannelId } from "./utils/config.ts";

export interface IModbusService {
  getConnectionStatus(): boolean;
  getInputData(): ChannelData[];
  getOutputData(): ChannelData[];
  onChange(listener: (inputs: ChannelData[], outputs: ChannelData[]) => void): () => void;
  setOutput(index: number, value: number): void;
}

export class ModbusService implements IModbusService {
  #modbusRTU: ModbusRTU;
  #port: string;
  #slaveId: number;
  #isConnected = false;
  #reconnectAttempts = 0;
  #maxReconnectAttempts = 10;
  #reconnectDelay = 1000; // ms

  #config: CalibrationConfig;
  #inputs: number[] = Array(16).fill(0);
  #outputs: number[] = Array(8).fill(0);
  #previousOutputs: number[] = Array(8).fill(0);
  #intervalId?: NodeJS.Timeout;
  #listeners: Array<(inputs: ChannelData[], outputs: ChannelData[]) => void> = [];
  #reconnecting = false;

  constructor(port: string, config: CalibrationConfig, slaveId = 1) {
    this.#modbusRTU = new ModbusRTU();
    this.#port = port;
    this.#slaveId = slaveId;
    this.#config = config;
  }

  async start(): Promise<void> {
    await this.#connect();

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
    await this.#disconnect();
  }

  async #connect(): Promise<void> {
    while (!this.#isConnected && this.#reconnectAttempts < this.#maxReconnectAttempts) {
      try {
        await this.#modbusRTU.connectRTUBuffered(this.#port, {
          baudRate: 38400,
        });
        this.#modbusRTU.setID(this.#slaveId);
        this.#modbusRTU.setTimeout(1000);
        this.#isConnected = true;
        this.#reconnectAttempts = 0;
        console.log(`Connected to Modbus device on ${this.#port}`);
      } catch (error) {
        this.#reconnectAttempts++;
        if (this.#reconnectAttempts >= this.#maxReconnectAttempts) {
          throw new Error(
            `Failed to connect after ${this.#maxReconnectAttempts} attempts: ${error}`,
          );
        }
        console.log(
          `Connection attempt ${this.#reconnectAttempts}/${this.#maxReconnectAttempts} failed, retrying in ${this.#reconnectDelay}ms...`,
        );
        await new Promise((resolve) => setTimeout(resolve, this.#reconnectDelay));
      }
    }
  }

  async #reconnect(): Promise<void> {
    this.#isConnected = false;
    await this.#disconnect();
    await this.#connect();
  }

  async #disconnect(): Promise<void> {
    if (this.#isConnected) {
      this.#modbusRTU.close(() => {});
      this.#isConnected = false;
    }
  }

  /**
   * Read input registers (FC04)
   * Reads 16 int16 values
   */
  async #readInputs(): Promise<number[]> {
    if (!this.#isConnected) {
      throw new Error("Modbus client not connected");
    }

    try {
      const result = await this.#modbusRTU.readInputRegisters(0, 16);
      // Convert to signed int16
      return result.data.map((value) => int16ToNumber(value));
    } catch (error) {
      // Connection lost, mark as disconnected
      this.#isConnected = false;
      throw error;
    }
  }

  /**
   * Write multiple registers (FC16)
   * Writes 8 uint16 values (clamped 0-10000)
   */
  async #writeOutputs(values: number[]): Promise<void> {
    if (!this.#isConnected) {
      throw new Error("Modbus client not connected");
    }

    if (values.length !== 8) {
      throw new Error("Must provide exactly 8 output values");
    }

    try {
      // Clamp and convert to uint16
      const clampedValues = values.map((v) => numberToUint16(v));
      await this.#modbusRTU.writeRegisters(0, clampedValues);
    } catch (error) {
      // Connection lost, mark as disconnected
      this.#isConnected = false;
      throw error;
    }
  }

  async #poll(): Promise<void> {
    try {
      // Read inputs (FC04)
      this.#inputs = await this.#readInputs();

      // Check if outputs changed and write if needed (FC16)
      if (this.#hasOutputsChanged()) {
        await this.#writeOutputs(this.#outputs);
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
      if (!this.#reconnecting && !this.#isConnected) {
        this.#reconnecting = true;
        console.log("Connection lost, attempting to reconnect...");

        try {
          await this.#reconnect();
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
    return this.#isConnected;
  }
}
