# JSDoc Requirements

## Rule

Every **exported** symbol must have a JSDoc comment. Internal (non-exported) symbols
should also have JSDoc when their purpose is not immediately obvious from the name.

All JSDoc must be written in **English**.

---

## Placement for Arrow Functions

Place JSDoc **above the `const` declaration**, not inside the function body.

```ts
// ✅ Correct
/** Applies a polynomial calibration formula to a raw sensor value. */
const applyCalibration = (raw: number, factors: number[]): number =>
  factors.reduce((acc, a, i) => acc + a * raw ** i, 0);

// ❌ Incorrect — JSDoc inside const is not recognized by tooling
const applyCalibration = /** Applies polynomial... */ (raw: number, factors: number[]): number =>
  factors.reduce((acc, a, i) => acc + a * raw ** i, 0);
```

For `function` declarations (top-level React components):

```ts
/**
 * Displays real-time sensor inputs and outputs.
 *
 * @param props - Component props
 */
export default function MainScreen(props: MainScreenProps) { ... }
```

---

## Minimum Requirement

Every exported symbol requires **at least a one-line description**:

```ts
/** Maps a zero-based channel array index to a display channel ID string. */
export const indexToChannelId = (index: number): string => ...;
```

---

## Full JSDoc for Complex Symbols

For functions with non-trivial parameters or return values, include `@param`,
`@returns`, and optionally `@example`:

```ts
/**
 * Applies a variable-length polynomial calibration to a raw sensor reading.
 *
 * The polynomial is evaluated as: a₀ + a₁x + a₂x² + ...
 *
 * @param raw - The raw sensor value (int16 converted to number).
 * @param factors - Polynomial coefficients [a₀, a₁, a₂, ...].
 * @returns The calibrated value.
 *
 * @example
 * applyCalibration(10, [0, 2]);    // 20  (linear: 2x)
 * applyCalibration(3, [1, 0, 2]);  // 19  (quadratic: 1 + 2x²)
 */
export const applyCalibration = (raw: number, factors: number[]): number =>
  factors.reduce((acc, a, i) => acc + a * raw ** i, 0);
```

---

## Interfaces and Types

All exported interfaces and type aliases require JSDoc on both the type and each field:

```ts
/** Represents a single sensor or actuator channel with its calibration data. */
export interface ChannelData {
  /** Zero-based index into the raw register array. */
  index: number;
  /** Human-readable channel identifier (e.g., "CH0", "OUT3"). */
  id: string;
  /** Raw register value before calibration. */
  rawValue: number;
  /** Calibrated value, or rawValue if no calibration is configured. */
  value: number;
}
```

---

## Classes

```ts
/**
 * Manages Modbus RTU communication with the hardware device.
 *
 * Connects over a serial port and exposes methods to read input registers
 * and write output registers.
 */
export class ModbusClient {
  /**
   * @param port - Serial port path (e.g., "/dev/ttyUSB0").
   * @param slaveId - Modbus slave device ID (default: 1).
   */
  constructor(
    readonly #port: string,
    readonly #slaveId: number = 1,
  ) {}
}
```

---

## What Does NOT Need JSDoc

- Private class fields (`#field`) — describe in constructor param JSDoc if relevant
- Local variables inside function bodies
- Test helper functions in `*.test.ts` files (JSDoc is optional there)
