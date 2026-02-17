import ModbusRTU from "modbus-serial";
import { int16ToNumber, numberToUint16 } from "../calibration/index.ts";

export class ModbusClient {
  #client: ModbusRTU;
  #port: string;
  #slaveId: number;
  #isConnected = false;
  #reconnectAttempts = 0;
  #maxReconnectAttempts = 10;
  #reconnectDelay = 1000; // ms

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
   * Read holding registers (FC03)
   * Reads 16 int16 values
   */
  async readInputs(): Promise<number[]> {
    if (!this.#isConnected) {
      throw new Error("Modbus client not connected");
    }

    try {
      const result = await this.#client.readHoldingRegisters(0, 16);
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
      await this.#client.writeRegisters(16, clampedValues);
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
