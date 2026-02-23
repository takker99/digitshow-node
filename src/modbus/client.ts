import ModbusRTU from "modbus-serial";
import { int16ToNumber, numberToUint16 } from "../calibration.ts";

/**
 * Contract for Modbus RTU communication.
 *
 * Depends on this abstraction rather than the concrete `ModbusClient` class
 * to enable constructor injection and testing with mock implementations.
 */
export interface IModbusClient {
  /** Opens the serial connection to the Modbus device. */
  connect(): Promise<void>;
  /** Reads 16 input registers (FC04) and returns signed int16 values. */
  readInputs(): Promise<number[]>;
  /**
   * Writes 8 output registers (FC16) with values clamped to 0–10000.
   * @param values - Exactly 8 uint16 output values.
   */
  writeOutputs(values: number[]): Promise<void>;
  /** Closes the serial connection. */
  disconnect(): Promise<void>;
  /** Re-establishes the serial connection after a disconnection. */
  reconnect(): Promise<void>;
  /** Returns `true` when the serial port is currently open and ready. */
  getConnectionStatus(): boolean;
}

/**
 * Manages Modbus RTU communication with the hardware device.
 *
 * Connects over a serial port and exposes methods to read input registers
 * and write output registers.
 */
export class ModbusClient implements IModbusClient {
  #client: ModbusRTU;
  #port: string;
  #slaveId: number;
  #isConnected = false;
  #reconnectAttempts = 0;
  #maxReconnectAttempts = 10;
  #reconnectDelay = 1000; // ms

  /**
   * @param port - Serial port path (e.g., "/dev/ttyUSB0").
   * @param slaveId - Modbus slave device ID (default: 1).
   */
  constructor(port: string, slaveId = 1) {
    this.#client = new ModbusRTU();
    this.#port = port;
    this.#slaveId = slaveId;
  }

  async connect(): Promise<void> {
    while (!this.#isConnected && this.#reconnectAttempts < this.#maxReconnectAttempts) {
      try {
        await this.#client.connectRTUBuffered(this.#port, {
          baudRate: 38400,
        });
        this.#client.setID(this.#slaveId);
        this.#client.setTimeout(1000);
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

  async reconnect(): Promise<void> {
    this.#isConnected = false;
    await this.disconnect();
    await this.connect();
  }

  async disconnect(): Promise<void> {
    if (this.#isConnected) {
      this.#client.close(() => {});
      this.#isConnected = false;
    }
  }

  /**
   * Read input registers (FC04)
   * Reads 16 int16 values
   */
  async readInputs(): Promise<number[]> {
    if (!this.#isConnected) {
      throw new Error("Modbus client not connected");
    }

    try {
      const result = await this.#client.readInputRegisters(0, 16);
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
  async writeOutputs(values: number[]): Promise<void> {
    if (!this.#isConnected) {
      throw new Error("Modbus client not connected");
    }

    if (values.length !== 8) {
      throw new Error("Must provide exactly 8 output values");
    }

    try {
      // Clamp and convert to uint16
      const clampedValues = values.map((v) => numberToUint16(v));
      await this.#client.writeRegisters(0, clampedValues);
    } catch (error) {
      // Connection lost, mark as disconnected
      this.#isConnected = false;
      throw error;
    }
  }

  getConnectionStatus(): boolean {
    return this.#isConnected;
  }
}
