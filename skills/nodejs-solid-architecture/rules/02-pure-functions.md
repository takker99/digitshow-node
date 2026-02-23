# Pure Functions First

## Rule

Extract all business logic from React components, hooks, and service classes into
**pure functions** that can be unit-tested without mocks, fakes, or running hardware.

## What Is a Pure Function?

A function is pure when:
1. Given the same inputs, it always returns the same output.
2. It has no side effects (no I/O, no mutations of external state, no random values).

```ts
// ✅ Pure — no side effects, deterministic
const applyCalibration = (raw: number, factors: number[]): number =>
  factors.reduce((acc, a, i) => acc + a * raw ** i, 0);

// ❌ Impure — reads from filesystem
const loadCalibrationConfig = async (path: string): Promise<CalibrationConfig> => {
  const text = await readFile(path, "utf-8");
  return CalibrationConfigSchema.parse(parse(text));
};
```

## Naming Convention for I/O Functions

Functions that perform I/O or side effects **must** use a verb prefix that signals
the boundary to the reader:

| Prefix | Meaning |
|--------|---------|
| `load*` | Read from filesystem, database, or persistent storage |
| `fetch*` | Make network / serial / hardware request |
| `send*` | Write to network / serial / hardware |
| `write*` | Write to filesystem or persistent storage |
| `start*` | Begin a long-running process or polling loop |
| `stop*` | Terminate a long-running process |

```ts
// ✅ Named to signal side effect
const loadCalibrationConfig = async (path: string) => { ... };
const fetchInputRegisters = async (client: ModbusClient) => { ... };
const sendOutputRegisters = async (client: ModbusClient, values: number[]) => { ... };
```

## Arrow Functions for Non-Component Code

All non-React-component functions must use arrow function syntax:

```ts
// ✅ Arrow function
/** Clamps a value to [min, max]. */
const clamp = (value: number, min: number, max: number): number =>
  Math.max(min, Math.min(max, value));

// ❌ Function declaration (only allowed for React components)
function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
```

Top-level React components may use `function` declarations for React DevTools display names:

```ts
// ✅ function declaration acceptable for React component
export default function MainScreen(props: MainScreenProps) { ... }
```

## Extract Logic Out of Components and Hooks

❌ Incorrect — logic embedded in component:
```tsx
const MainScreen = ({ inputs }: MainScreenProps) => {
  const calibrated = useMemo(
    () => inputs.map((ch) => ({
      ...ch,
      value: ch.calibration
        ? ch.calibration.factors.reduce((acc, a, i) => acc + a * ch.rawValue ** i, 0)
        : ch.rawValue,
    })),
    [inputs],
  );
  ...
};
```

✅ Correct — logic in a pure function, component stays thin:
```tsx
// calibration.ts
/** Applies polynomial calibration to a raw sensor value. */
const applyCalibration = (raw: number, factors: number[]): number =>
  factors.reduce((acc, a, i) => acc + a * raw ** i, 0);

// MainScreen.tsx
const MainScreen = ({ inputs }: MainScreenProps) => {
  const calibrated = useMemo(
    () => inputs.map((ch) => ({
      ...ch,
      value: ch.calibration ? applyCalibration(ch.rawValue, ch.calibration.factors) : ch.rawValue,
    })),
    [inputs],
  );
  ...
};
```

## I/O Stays at the Boundary

Pure functions form the core; I/O wraps them at the outermost layer.

```
┌──────────────────────────────┐
│  I/O boundary                │  loadCalibrationConfig(), fetchInputRegisters()
│  ┌────────────────────────┐  │
│  │  Pure business logic   │  │  applyCalibration(), clamp(), int16ToNumber()
│  └────────────────────────┘  │
└──────────────────────────────┘
```
