import ModbusRTU from "modbus-serial";
import { int16ToNumber, numberToUint16 } from "../calibration.ts";

/**
 * Interface for a Modbus client.
 * Enables dependency injection and testing without real hardware.
 */
export interface IModbusClient {
  /** Establish connection to the Modbus device. */
  connect(): Promise<void>;
  /** Read 16 input register values. */
  readInputs(): Promise<number[]>;
  /** Write 8 output register values. */
  writeOutputs(values: number[]): Promise<void>;
  /** Close the connection. */
  disconnect(): Promise<void>;
  /** Returns true if currently connected. */
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

  async connect(): Promise<void> {
    await this.#modbusRTU.connectRTUBuffered(this.#port, { baudRate: 38400 });
    this.#modbusRTU.setID(this.#slaveId);
    this.#modbusRTU.setTimeout(1000);
    this.#connected = true;
  }

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

  async disconnect(): Promise<void> {
    if (this.#connected) {
      this.#modbusRTU.close(() => {});
      this.#connected = false;
    }
  }

  isConnected(): boolean {
    return this.#connected;
  }
}
