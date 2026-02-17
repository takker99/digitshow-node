#!/usr/bin/env node
import { render } from "ink";
import { ModbusService } from "./modbus/service.ts";
import type { CalibrationConfig } from "./types/index.ts";
import { App } from "./ui/App.tsx";
import { loadCalibrationConfig } from "./utils/config.ts";

// Parse CLI arguments
const args = process.argv.slice(2);

function printUsage() {
  console.log(`
Modbus RTU CLI for Soil Testing

Usage:
  digitshow [options]

Options:
  --port <path>       Serial port path (required)
  --config <path>     Calibration config file (YAML or JSON)
  --slave <id>        Modbus slave ID (default: 1)
  --help              Show this help message

Example:
  digitshow --port /dev/ttyUSB0 --config calibration.yaml
  `);
}

// Parse arguments
let port: string | undefined;
let configPath: string | undefined;
let slaveId = 1;

for (let i = 0; i < args.length; i++) {
  const arg = args[i];
  if (arg === "--port" && i + 1 < args.length) {
    port = args[++i];
  } else if (arg === "--config" && i + 1 < args.length) {
    configPath = args[++i];
  } else if (arg === "--slave" && i + 1 < args.length) {
    slaveId = Number.parseInt(args[++i], 10);
  } else if (arg === "--help" || arg === "-h") {
    printUsage();
    process.exit(0);
  }
}

// Validate required arguments
if (!port) {
  console.error("Error: --port is required");
  printUsage();
  process.exit(1);
}

// Load calibration config
let config: CalibrationConfig = {};
if (configPath) {
  try {
    config = loadCalibrationConfig(configPath);
    console.log(`Loaded calibration config from ${configPath}`);
  } catch (error) {
    console.error(`Error loading calibration config: ${error}`);
    process.exit(1);
  }
}

// Create and start service
const service = new ModbusService(port, config, slaveId);

async function main() {
  try {
    console.log(`Connecting to Modbus RTU on ${port}...`);
    await service.start();
    console.log("Connected! Starting UI...\n");

    // Render the UI
    const { waitUntilExit } = render(<App service={service} config={config} />);

    // Wait for the app to exit
    await waitUntilExit();

    // Cleanup
    console.log("\nShutting down...");
    await service.stop();
    console.log("Goodbye!");
  } catch (error) {
    console.error("Error:", error);
    await service.stop();
    process.exit(1);
  }
}

main();
