import ModbusRTU from "modbus-serial";
import { applyCalibration, int16ToNumber, numberToUint16 } from "./calibration.ts";
import type { Logger } from "./logger.ts";
import type { ConnectionStatusDetail } from "./types/connection.ts";
import type { CalibrationConfig, ChannelData } from "./types.ts";
import { getChipType, indexToChannelId } from "./utils/config.ts";

export interface IModbusService {
  getConnectionStatus(): boolean;
  getInputData(): ChannelData[];
  getOutputData(): ChannelData[];
  onChange(listener: (inputs: ChannelData[], outputs: ChannelData[]) => void): () => void;
  setOutput(index: number, value: number): void;
  start(signal?: AbortSignal): void;
  stop(): Promise<void>;
  restart(signal?: AbortSignal): Promise<void>;
  onConnectionStateChange(listener: () => void): () => void;
  getConnectionState(): ConnectionStatusDetail | undefined;
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
  #connecting = false;
  #reconnecting = false;
  #pollInProgress = false;
  #connectionState: ConnectionStatusDetail | undefined;
  #connectionStateListeners: Set<() => void> = new Set();
  #logger: Logger;

  constructor(port: string, config: CalibrationConfig, logger: Logger, slaveId = 1) {
    this.#modbusRTU = new ModbusRTU();
    this.#port = port;
    this.#slaveId = slaveId;
    this.#config = config;
    this.#logger = logger;
  }

  start(signal?: AbortSignal): void {
    // Start connection attempt in background without awaiting
    this.#connecting = true;
    this.#connect(signal)
      .catch((error) => {
        this.#logger.error(`Failed to connect: ${error}`);
      })
      .finally(() => {
        this.#connecting = false;
      });

    // Poll FC04 every 100ms
    this.#intervalId = setInterval(() => {
      this.#poll(signal);
    }, 100);
  }

  async stop(): Promise<void> {
    if (this.#intervalId) {
      clearInterval(this.#intervalId);
      this.#intervalId = undefined;
    }
    await this.#disconnect();
  }

  async restart(signal?: AbortSignal): Promise<void> {
    await this.stop();
    this.#connecting = true;
    try {
      await this.#connect(signal);
    } finally {
      this.#connecting = false;
    }

    // Restart polling
    this.#intervalId = setInterval(() => {
      this.#poll(signal);
    }, 100);
  }

  async #connect(signal?: AbortSignal): Promise<void> {
    while (!this.#isConnected && this.#reconnectAttempts < this.#maxReconnectAttempts) {
      if (signal?.aborted) {
        throw new Error("Connection aborted");
      }

      try {
        // Update connection state
        this.#updateConnectionState({
          attempt: this.#reconnectAttempts + 1,
          maxAttempts: this.#maxReconnectAttempts,
          port: this.#port,
          type: "connect-attempt",
        });

        await this.#modbusRTU.connectRTUBuffered(this.#port, {
          baudRate: 38400,
        });
        this.#modbusRTU.setID(this.#slaveId);
        this.#modbusRTU.setTimeout(1000);
        this.#isConnected = true;
        this.#reconnectAttempts = 0;

        // Update connection state
        this.#updateConnectionState({
          port: this.#port,
          type: "connect-success",
        });

        this.#logger.info(`Connected to Modbus device on ${this.#port}`);
      } catch (error) {
        this.#reconnectAttempts++;
        if (this.#reconnectAttempts >= this.#maxReconnectAttempts) {
          const errorMessage = `Failed to connect after ${this.#maxReconnectAttempts} attempts: ${error}`;
          this.#updateConnectionState({
            attempt: this.#reconnectAttempts,
            errorMessage,
            maxAttempts: this.#maxReconnectAttempts,
            port: this.#port,
            retryDelayMs: 0,
            type: "connect-error",
          });
          throw new Error(errorMessage);
        }

        this.#logger.warn(
          `Connection attempt ${this.#reconnectAttempts}/${this.#maxReconnectAttempts} failed, retrying in ${this.#reconnectDelay}ms...`,
        );

        await this.#delay(this.#reconnectDelay, signal);
      }
    }
  }

  async #reconnect(signal?: AbortSignal): Promise<void> {
    this.#isConnected = false;
    await this.#disconnect();
    await this.#connect(signal);
  }

  async #disconnect(): Promise<void> {
    if (this.#isConnected) {
      this.#modbusRTU.close(() => {});
      this.#isConnected = false;
    }
  }

  /**
   * Cancellable delay helper.
   * Respects AbortSignal for graceful shutdown.
   */
  async #delay(ms: number, signal?: AbortSignal): Promise<void> {
    return new Promise((resolve, reject) => {
      if (signal?.aborted) {
        reject(new Error("Aborted"));
        return;
      }

      const timeoutId = setTimeout(resolve, ms);

      signal?.addEventListener(
        "abort",
        () => {
          clearTimeout(timeoutId);
          reject(new Error("Aborted"));
        },
        { once: true },
      );
    });
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

  async #poll(signal?: AbortSignal): Promise<void> {
    // Skip if already polling to prevent concurrent polls
    if (this.#pollInProgress) {
      return;
    }

    if (signal?.aborted) {
      return;
    }

    this.#pollInProgress = true;

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
        this.#logger.info("Reconnected successfully");
      }
    } catch (error) {
      this.#logger.error(`Polling error: ${error}`);

      // Attempt to reconnect if not already reconnecting
      if (!this.#connecting && !this.#reconnecting && !this.#isConnected) {
        this.#reconnecting = true;
        this.#logger.warn("Connection lost, attempting to reconnect...");

        try {
          await this.#reconnect(signal);
          this.#logger.info("Reconnection successful");
          this.#reconnecting = false;
        } catch (reconnectError) {
          this.#logger.error(`Reconnection failed: ${reconnectError}`);
          // Will retry on next poll cycle
        }
      }
    } finally {
      this.#pollInProgress = false;
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

  onConnectionStateChange(listener: () => void): () => void {
    this.#connectionStateListeners.add(listener);
    return () => {
      this.#connectionStateListeners.delete(listener);
    };
  }

  getConnectionState(): ConnectionStatusDetail | undefined {
    return this.#connectionState;
  }

  #updateConnectionState(
    event:
      | { type: "connect-attempt"; port: string; attempt: number; maxAttempts: number }
      | { type: "connect-success"; port: string }
      | {
          type: "connect-error";
          port: string;
          attempt: number;
          maxAttempts: number;
          errorMessage: string;
          retryDelayMs: number;
        }
      | { type: "disconnect" },
  ): void {
    const prevState = this.#connectionState;

    // Compute next state
    if (event.type === "connect-attempt") {
      this.#connectionState = {
        attemptNumber: event.attempt,
        maxAttempts: event.maxAttempts,
        port: event.port,
        state: "connecting",
      };
    } else if (event.type === "connect-success") {
      this.#connectionState = {
        attemptNumber: 0,
        maxAttempts: 0,
        port: event.port,
        state: "connected",
      };
    } else if (event.type === "connect-error") {
      this.#connectionState = {
        attemptNumber: event.attempt,
        errorMessage: event.errorMessage,
        maxAttempts: event.maxAttempts,
        port: event.port,
        retryDelayMs: event.retryDelayMs,
        state: "error",
      };
    } else if (event.type === "disconnect") {
      this.#connectionState = {
        attemptNumber: 0,
        maxAttempts: 0,
        port: prevState?.port ?? "unknown",
        state: "connecting",
      };
    }

    // Notify listeners
    this.#connectionStateListeners.forEach((listener) => {
      listener();
    });
  }
}
