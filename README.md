# digitshow-node

Node.js Modbus RTU CLI for soil testing - A real-time monitoring and control application for agricultural sensors using Modbus RTU protocol.

[![CI](https://github.com/takker99/digitshow-node/actions/workflows/ci.yml/badge.svg)](https://github.com/takker99/digitshow-node/actions/workflows/ci.yml)
[![codecov](https://codecov.io/gh/takker99/digitshow-node/branch/main/graph/badge.svg)](https://codecov.io/gh/takker99/digitshow-node)

## Features

- **Real-time I/O Monitoring**: Display sensor inputs and control outputs with 100ms polling interval
- **Modbus RTU Communication**:
  - FC04 (Read Input Registers): int16×16 every 100ms
  - FC16 (Write Multiple Registers): uint16×8 on change, clamped 0-10000
  - Baud rate: 38400
  - **Automatic reconnection** on device disconnect
  - **Connection retry** with exponential backoff
- **Polynomial Calibration System**:
  - Load calibration configs from YAML/JSON with schema validation
  - **Variable-length polynomial**: [a₀, a₁, a₂, ...] for a₀ + a₁x + a₁x² + ...
  - Support for any polynomial degree (linear, quadratic, cubic, etc.)
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

# Or directly with tsx
pnpm start -- --port /dev/ttyUSB0 --config calibration.yaml
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

The calibration system supports **polynomial calibration of any degree**. Factors are specified as a variable-length array where the i-th element is the coefficient of x^i.

See `calibration.example.yaml` for a sample configuration file.

Format (YAML or JSON):

```yaml
inputs:
  "0":
    name: "Moisture Sensor 1"
    factors: [0, 0.1, 0.0001]  # Quadratic: 0 + 0.1*x + 0.0001*x²
  "2":
    name: "Temperature Sensor"
    factors: [-40, 0.01]  # Linear: -40 + 0.01*x
  "3":
    name: "Advanced Sensor"
    factors: [1, 0.5, 0.001, 0.00001]  # Cubic polynomial

outputs:
  "0":
    name: "Water Valve"
    factors: [0, 1]  # Identity: 0 + 1*x
```

### Polynomial Formula

Calibration formula: **a₀ + a₁x + a₂x² + a₃x³ + ...**

Examples:
- Constant: `[5]` = 5
- Linear: `[10, 2]` = 10 + 2x
- Quadratic: `[0, 0.1, 0.0001]` = 0.1x + 0.0001x²
- Cubic: `[1, 0.5, 0.001, 0.00001]` = 1 + 0.5x + 0.001x² + 0.00001x³

## Development

```bash
# Run tests with coverage
pnpm test

# Type-check + lint
pnpm check
```

### Architecture & Coding Guidelines

- **Quick reference**: [.github/copilot-instructions.md](.github/copilot-instructions.md)
- **Detailed rules** (SOLID, pure functions, file organization, testing, JSR packages):
  [.agents/skills/nodejs-solid-architecture/](.agents/skills/nodejs-solid-architecture/)
- **React component optimization** (memo, useMemo, useCallback):
  [.agents/skills/vercel-react-best-practices/](.agents/skills/vercel-react-best-practices/)

## Technology Stack

- **TypeScript**: Type-safe development with `.ts` extensions
- **React Ink**: Terminal UI framework
- **modbus-serial**: Modbus RTU communication
- **pnpm**: Fast, disk space efficient package manager
- **Vitest**: Unit testing framework with 100% coverage
- **Biome**: Fast linter and formatter
- **Zod**: Runtime schema validation
- **GitHub Actions**: CI/CD with automated testing and linting

## Connection Resilience

The application automatically handles device connection issues:

- **Initial Connection**: Retries up to 10 times with 1-second delays
- **Reconnection**: Automatically reconnects if the device disconnects during operation
- **Error Recovery**: Gracefully handles communication errors and resumes operation

## Future Enhancements

- Hono API server for remote monitoring
- PID control loops for automated regulation
- Data logging and visualization
- Alert system for threshold violations

## License

ISC
