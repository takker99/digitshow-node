import { applyCalibration } from "./calibration.ts";
import type { Logger } from "./logger.ts";
import type { IModbusClient } from "./modbus/client.ts";
import type { ConnectionStatusDetail } from "./types/connection.ts";
import { computeNextConnectionState } from "./types/connection.ts";
import type { CalibrationConfig, ChannelData } from "./types.ts";
import { getChipType, indexToChannelId } from "./utils/config.ts";

/**
 * Public contract for Modbus service used by UI and hooks.
 */
export interface IModbusService {
  /** @returns True when Modbus client is connected. */
  getConnectionStatus(): boolean;
  /** @returns Current input channel snapshot. */
  getInputData(): ChannelData[];
  /** @returns Current output channel snapshot. */
  getOutputData(): ChannelData[];
  /**
   * Subscribe to input/output updates.
   * @param listener Callback invoked on data changes.
   * @returns Unsubscribe function.
   */
  onChange(listener: (inputs: ChannelData[], outputs: ChannelData[]) => void): () => void;
  /**
   * Set one output register value.
   * @param index Output channel index (0-7).
   * @param value Raw output value.
   * @returns {void}
   */
  setOutput(index: number, value: number): void;
  /**
   * Start connection and polling loop.
   * @param signal Optional abort signal.
   * @returns {void}
   */
  start(signal?: AbortSignal): void;
  /** @returns Promise resolved after polling stops and disconnect completes. */
  stop(): Promise<void>;
  /**
   * Restart connection and polling loop.
   * @param signal Optional abort signal.
   * @returns Promise resolved after restart completes.
   */
  restart(signal?: AbortSignal): Promise<void>;
  /**
   * Subscribe to connection state updates.
   * @param listener Callback invoked when state changes.
   * @returns Unsubscribe function.
   */
  onConnectionStateChange(listener: () => void): () => void;
  /** @returns Current connection detail state or undefined if not initialized. */
  getConnectionState(): ConnectionStatusDetail | undefined;
}

/**
 * Modbus service implementation with polling, reconnect, and calibration support.
 */
export class ModbusService implements IModbusService {
  #client: IModbusClient;
  #port: string;
  #isConnected = false;
  #reconnectAttempts = 0;
  #maxReconnectAttempts: number;
  #reconnectDelay: number;

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

  /**
   * @param port Serial port path.
   * @param config Calibration configuration.
   * @param logger Logger implementation.
   * @param client Modbus client dependency.
   * @param reconnectDelay Delay between reconnect attempts in milliseconds.
   * @param maxReconnectAttempts Maximum number of reconnect attempts.
   */
  constructor(
    port: string,
    config: CalibrationConfig,
    logger: Logger,
    client: IModbusClient,
    reconnectDelay = 1000,
    maxReconnectAttempts = 10,
  ) {
    this.#client = client;
    this.#port = port;
    this.#config = config;
    this.#logger = logger;
    this.#reconnectDelay = reconnectDelay;
    this.#maxReconnectAttempts = maxReconnectAttempts;
  }

  /**
   * Start connection attempts and polling.
   * @param signal Optional abort signal.
   * @returns {void}
   */
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

    signal?.addEventListener(
      "abort",
      () => {
        if (this.#intervalId) {
          clearInterval(this.#intervalId);
          this.#intervalId = undefined;
        }
      },
      { once: true },
    );
  }

  /**
   * Stop polling and disconnect client.
   * @returns Promise resolved when disconnected.
   */
  async stop(): Promise<void> {
    if (this.#intervalId) {
      clearInterval(this.#intervalId);
      this.#intervalId = undefined;
    }
    await this.#disconnect();
  }

  /**
   * Restart the connection and polling loop.
   * @param signal Optional abort signal.
   * @returns Promise resolved when restart completes.
   */
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

        await this.#client.connect();
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
    this.#reconnectAttempts = 0;
    await this.#disconnect();
    await this.#connect(signal);
  }

  async #disconnect(): Promise<void> {
    if (this.#isConnected) {
      await this.#client.disconnect();
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
    return this.#client.readInputs();
  }

  /**
   * Write multiple registers (FC16)
   * Writes 8 uint16 values (clamped 0-10000)
   */
  async #writeOutputs(values: number[]): Promise<void> {
    return this.#client.writeOutputs(values);
  }

  async #poll(signal?: AbortSignal): Promise<void> {
    // Skip if already polling to prevent concurrent polls
    if (this.#pollInProgress) {
      return;
    }

    if (signal?.aborted) {
      return;
    }

    // Skip silently during initial connection to avoid spurious "not connected" errors
    if (this.#connecting) {
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

  /**
   * Get calibrated input channel data.
   * @returns Input channel list.
   */
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

  /**
   * Get calibrated output channel data.
   * @returns Output channel list.
   */
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

  /**
   * Set one output value in memory.
   * @param index Output channel index (0-7).
   * @param value Raw value to apply.
   * @returns {void}
   */
  setOutput(index: number, value: number): void {
    if (index >= 0 && index < 8) {
      this.#outputs[index] = value;
    }
  }

  /**
   * Subscribe to input/output data changes.
   * @param listener Callback invoked when polled data changes.
   * @returns Unsubscribe function.
   */
  onChange(listener: (inputs: ChannelData[], outputs: ChannelData[]) => void): () => void {
    this.#listeners.push(listener);
    return () => {
      this.#listeners = this.#listeners.filter((l) => l !== listener);
    };
  }

  /**
   * Get binary connection status.
   * @returns True when connected.
   */
  getConnectionStatus(): boolean {
    return this.#isConnected;
  }

  /**
   * Subscribe to connection state changes.
   * @param listener Callback invoked when state changes.
   * @returns Unsubscribe function.
   */
  onConnectionStateChange(listener: () => void): () => void {
    this.#connectionStateListeners.add(listener);
    return () => {
      this.#connectionStateListeners.delete(listener);
    };
  }

  /**
   * Get detailed connection state for UI.
   * @returns Current connection state detail.
   */
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
    this.#connectionState = computeNextConnectionState(this.#connectionState, event);

    // Notify listeners
    this.#connectionStateListeners.forEach((listener) => {
      listener();
    });
  }
}
