import ModbusRTU from "modbus-serial";
import { int16ToNumber, numberToUint16 } from "../calibration.ts";

/**
 * Interface for a Modbus client.
 * Enables dependency injection and testing without real hardware.
 */
export interface IModbusClient {
  /**
   * Establish connection to the Modbus device.
   * @returns Promise resolved when connection is established.
   */
  connect(): Promise<void>;
  /**
   * Read 16 input register values from the device.
   * @returns Promise resolving to 16 input register values.
   */
  readInputs(): Promise<number[]>;
  /**
   * Write output register values to the device.
   * @param values Eight output register values.
   * @returns Promise resolved after values are written.
   */
  writeOutputs(values: number[]): Promise<void>;
  /**
   * Close the Modbus connection.
   * @returns Promise resolved after connection is closed.
   */
  disconnect(): Promise<void>;
  /**
   * Check whether the Modbus client is connected.
   * @returns True if currently connected.
   */
  isConnected(): boolean;
}

/**
 * Production Modbus RTU client wrapping modbus-serial.
 * Tracks connection state internally and marks itself disconnected on I/O errors.
 */
export class ModbusRtuClient implements IModbusClient {
  #modbusRTU: ModbusRTU;
  #port: string;
  #slaveId: number;
  #connected = false;

  /**
   * @param port - Serial port path (e.g. `/dev/ttyUSB0`)
   * @param slaveId - Modbus slave ID (default: 1)
   */
  constructor(port: string, slaveId = 1) {
    this.#modbusRTU = new ModbusRTU();
    this.#port = port;
    this.#slaveId = slaveId;
  }

  /**
   * Connect to Modbus RTU device.
   * @returns Promise resolved when connected.
   */
  async connect(): Promise<void> {
    await this.#modbusRTU.connectRTUBuffered(this.#port, { baudRate: 38400 });
    this.#modbusRTU.setID(this.#slaveId);
    this.#modbusRTU.setTimeout(1000);
    this.#connected = true;
  }

  /**
   * Read 16 input registers and convert to signed values.
   * @returns Promise resolving to input values.
   * @throws {Error} If client is not connected or read operation fails.
   */
  async readInputs(): Promise<number[]> {
    if (!this.#connected) throw new Error("Modbus client not connected");
    try {
      const result = await this.#modbusRTU.readInputRegisters(0, 16);
      return result.data.map((value) => int16ToNumber(value));
    } catch (error) {
      this.#connected = false;
      throw error;
    }
  }

  /**
   * Write 8 output registers after clamping to device range.
   * @param values Output values.
   * @returns Promise resolved when write completes.
   * @throws {Error} If client is not connected, values length is invalid, or write fails.
   */
  async writeOutputs(values: number[]): Promise<void> {
    if (!this.#connected) throw new Error("Modbus client not connected");
    if (values.length !== 8) throw new Error("Must provide exactly 8 output values");
    try {
      const clampedValues = values.map((v) => numberToUint16(v));
      await this.#modbusRTU.writeRegisters(0, clampedValues);
    } catch (error) {
      this.#connected = false;
      throw error;
    }
  }

  /**
   * Close Modbus RTU connection.
   * @returns Promise resolved when disconnect handling completes.
   */
  async disconnect(): Promise<void> {
    if (this.#connected) {
      this.#modbusRTU.close(() => {});
      this.#connected = false;
    }
  }

  /**
   * Report client connection state.
   * @returns True when the client is connected.
   */
  isConnected(): boolean {
    return this.#connected;
  }
}
