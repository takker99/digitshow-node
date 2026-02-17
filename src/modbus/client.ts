import ModbusRTU from "modbus-serial";
import { int16ToNumber, numberToUint16 } from "../calibration/index.ts";

export class ModbusClient {
  #client: ModbusRTU;
  #port: string;
  #slaveId: number;
  #isConnected = false;

  constructor(port: string, slaveId = 1) {
    this.#client = new ModbusRTU();
    this.#port = port;
    this.#slaveId = slaveId;
  }

  async connect(): Promise<void> {
    await this.#client.connectRTUBuffered(this.#port, {
      baudRate: 38400,
    });
    this.#client.setID(this.#slaveId);
    this.#client.setTimeout(1000);
    this.#isConnected = true;
  }

  async disconnect(): Promise<void> {
    if (this.#isConnected) {
      this.#client.close(() => {});
      this.#isConnected = false;
    }
  }

  /**
   * Read holding registers (FC03)
   * Reads 16 int16 values
   */
  async readInputs(): Promise<number[]> {
    if (!this.#isConnected) {
      throw new Error("Modbus client not connected");
    }

    const result = await this.#client.readHoldingRegisters(0, 16);
    // Convert to signed int16
    return result.data.map((value) => int16ToNumber(value));
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

    // Clamp and convert to uint16
    const clampedValues = values.map((v) => numberToUint16(v));
    await this.#client.writeRegisters(16, clampedValues);
  }

  getConnectionStatus(): boolean {
    return this.#isConnected;
  }
}
