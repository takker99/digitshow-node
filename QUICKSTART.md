# Quick Start Guide

## Prerequisites

- Node.js 18+ 
- pnpm (will be installed automatically if using npm)
- Serial port access (for hardware connection)

## Installation

```bash
# Clone the repository
git clone https://github.com/takker99/digitshow-node.git
cd digitshow-node

# Install dependencies
pnpm install

# Build the project
pnpm build
```

## Usage

### Running with Hardware

Connect your Modbus RTU device to a serial port (e.g., `/dev/ttyUSB0` on Linux or `COM3` on Windows).

```bash
# Without calibration
node dist/index.js --port /dev/ttyUSB0

# With calibration config
node dist/index.js --port /dev/ttyUSB0 --config calibration.example.yaml

# With custom slave ID
node dist/index.js --port /dev/ttyUSB0 --slave 2
```

### Demo Mode (No Hardware Required)

Test the UI without connecting to actual hardware:

```bash
pnpm demo
```

## Keyboard Controls

### Navigation
- `M` - Switch to Main screen
- `C` - Switch to Config screen  
- `O` - Switch to Manual Output screen
- `Q` - Quit application

### Main Screen
- `R` - Show raw sensor values
- `L` - Show calibrated values

## Configuration

Create a calibration config file (YAML or JSON):

```yaml
# calibration.yaml
inputs:
  "0":
    name: "Moisture Sensor 1"
    factors: [0, 0.1, 0.0001]  # a + bx + cx²
    enabled: true
  "2":
    name: "Temperature"
    factors: [-40, 0.01, 0]
    enabled: true

outputs:
  "0":
    name: "Water Valve"
    factors: [0, 1, 0]
    enabled: false
```

### Calibration Formula

The calibration uses a quadratic equation: **a + bx + cx²**

Where:
- `x` is the raw sensor value
- `[a, b, c]` are the calibration factors

Examples:
- Linear: `[0, 1, 0]` = identity (no change)
- Linear with offset: `[10, 2, 0]` = 10 + 2x
- Quadratic: `[0, 0, 1]` = x²

## Channel Mapping

### Input Channels (16 total)
- **0-7**: HX711 (Load cell amplifier)
- **8-15**: ADS1115 (16-bit ADC)

### Output Channels (8 total)
- **0-7**: GP8403 (12-bit DAC)

## Development

```bash
# Run in development mode
pnpm dev -- --port /dev/ttyUSB0

# Run tests
pnpm test

# Lint code
pnpm lint

# Format code
pnpm format
```

## Troubleshooting

### Serial Port Access Denied

On Linux, add your user to the dialout group:
```bash
sudo usermod -a -G dialout $USER
# Log out and log back in
```

### Connection Issues

1. Verify the correct serial port path
2. Check that baud rate is 38400
3. Ensure no other application is using the port
4. Verify Modbus slave ID matches your device

### Invalid Config File

Run the tests to validate your config:
```bash
pnpm test:run
```

Check the schema in `src/types/index.ts` for reference.

## Technical Specifications

- **Baud Rate**: 38400
- **Modbus Functions**:
  - FC03 (Read Holding Registers): Reads 16 int16 values every 100ms
  - FC16 (Write Multiple Registers): Writes 8 uint16 values (clamped 0-10000)
- **Polling Interval**: 100ms
- **Output Range**: 0-10000 (automatically clamped)

## Future Enhancements

Planned features:
- Hono API server for remote monitoring
- PID control loops
- Data logging
- Alert system
- Web dashboard

## License

ISC
