# digitshow-node

Node.js Modbus RTU CLI for soil testing - A real-time monitoring and control application for agricultural sensors using Modbus RTU protocol.

## Features

- **Real-time I/O Monitoring**: Display sensor inputs and control outputs with 100ms polling interval
- **Modbus RTU Communication**: 
  - FC03 (Read Holding Registers): int16×16 every 100ms
  - FC16 (Write Multiple Registers): uint16×8 on change, clamped 0-10000
  - Baud rate: 38400
- **Calibration System**: Load calibration configs from YAML/JSON with schema validation
  - Calibration formula: `a + bx + cx²` where [a, b, c] are calibration factors
- **Chip Support**:
  - HX711 (Input channels 0-7): Load cell amplifier
  - ADS1115 (Input channels 8-15): 16-bit ADC
  - GP8403 (Output channels): 12-bit DAC
- **Multiple Screens**:
  - Main: Real-time I/O display with raw/calibrated toggle
  - Config: View calibration configuration
  - Manual Output: Manual control of output channels

## Installation

```bash
pnpm install
```

## Usage

```bash
# Run in development mode
pnpm dev -- --port /dev/ttyUSB0 --config calibration.yaml

# Build and run
pnpm build
node dist/index.js --port /dev/ttyUSB0 --config calibration.yaml
```

### Command-line Options

- `--port <path>`: Serial port path (required)
- `--config <path>`: Calibration config file (YAML or JSON, optional)
- `--slave <id>`: Modbus slave ID (default: 1)
- `--help`: Show help message

### Keyboard Controls

- **Navigation**:
  - `M`: Main screen
  - `C`: Config screen
  - `O`: Manual output screen
  - `Q`: Quit application

- **Main Screen**:
  - `R`: Raw mode (display raw sensor values)
  - `L`: Calibrated mode (display calibrated values)

- **Manual Output Screen**:
  - `↑/↓`: Select channel
  - `0-9`: Enter value (press Enter to apply)
  - `+/-`: Increment/Decrement by 100
  - `Z`: Set to 0
  - `X`: Set to 5000
  - `C`: Set to 10000

## Calibration Configuration

See `calibration.example.yaml` for a sample configuration file.

Format (YAML or JSON):

```yaml
inputs:
  "0":
    name: "Moisture Sensor 1"
    factors: [0, 0.1, 0.0001]  # [a, b, c] for a + bx + cx²
    enabled: true

outputs:
  "0":
    name: "Water Valve"
    factors: [0, 1, 0]
    enabled: false
```

## Development

```bash
# Run tests
pnpm test

# Run linter
pnpm lint

# Format code
pnpm format

# Type check
pnpm build
```

## Technology Stack

- **TypeScript**: Type-safe development
- **React Ink**: Terminal UI framework
- **modbus-serial**: Modbus RTU communication
- **pnpm**: Fast, disk space efficient package manager
- **Vitest**: Unit testing framework
- **Biome**: Fast linter and formatter
- **Zod**: Runtime schema validation

## Future Enhancements

- Hono API server for remote monitoring
- PID control loops for automated regulation
- Data logging and visualization
- Alert system for threshold violations

## License

ISC
