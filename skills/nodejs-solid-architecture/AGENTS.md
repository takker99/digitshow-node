# Node.js SOLID Architecture Guidelines — Full Reference

This document compiles all rules from the `nodejs-solid-architecture` skill into a
single reference. For individual rules, see the `rules/` directory.

---

## Rule 1: File Organization — Minimal Exports

Follow the **Minimal Exports** principle from [deno/std](https://github.com/denoland/std/blob/main/.github/ARCHITECTURE.md#minimal-exports):

> Files are structured to minimize the number of dependencies they incur and the
> amount of effort required to manage them, both for the maintainer and the user.
> In most cases, only a single function or class, alongside its related types, are
> exported. In other cases, functions that incur negligible dependency overhead
> will be grouped together in the same file.

### One Primary API Per File

Each file exports one "main thing": a single class and its types, a closely related
group of pure utility functions, or a single React component and its props interface.
The file name **must match** the main export.

### No `index.ts` Barrel Files

❌ Incorrect:
```
src/calibration/index.ts    ← re-exports from below
```

✅ Correct:
```
src/calibration.ts          ← all calibration pure functions grouped here
```

### Flat Directory Structure

Keep the tree at most two levels deep. Avoid `src/utils/math/calibration/polynomial.ts` — prefer `src/calibration.ts`.

### When to Group vs Split

**Group** functions when they are always used together, share internal logic, or have
negligible dependency impact individually.

**Split** when a function has a distinct dependency others don't need, the file
exceeds ~200 lines, or a function is likely used in a completely different context.

### Each Source File Has a Test File

```
src/calibration.ts        → src/calibration.test.ts
src/modbus/client.ts      → src/modbus/client.test.ts
src/ui/MainScreen.tsx     → src/ui/MainScreen.test.tsx
```

---

## Rule 2: Pure Functions First

Extract all business logic from React components, hooks, and service classes into
**pure functions** that can be unit-tested without mocks.

### What Is a Pure Function?

1. Same inputs → same output, always.
2. No side effects (no I/O, no external state mutation, no random values).

### Naming Convention for I/O Functions

| Prefix | Meaning |
|--------|---------|
| `load*` | Read from filesystem / storage |
| `fetch*` | Network / serial / hardware request |
| `send*` | Write to network / serial / hardware |
| `write*` | Write to filesystem / storage |
| `start*` | Begin a long-running process |
| `stop*` | Terminate a long-running process |

### Arrow Functions for Non-Component Code

```ts
// ✅ Arrow function
/** Clamps a value to [min, max]. */
const clamp = (value: number, min: number, max: number): number =>
  Math.max(min, Math.min(max, value));
```

Top-level React components may use `function` declarations for DevTools display names.

### Extract Logic Out of Components

❌ Polynomial logic inline in useMemo.

✅ Extract to `applyCalibration.ts`, import in component:
```tsx
const calibrated = useMemo(
  () => inputs.map((ch) => ({
    ...ch,
    value: ch.calibration ? applyCalibration(ch.rawValue, ch.calibration.factors) : ch.rawValue,
  })),
  [inputs],
);
```

### I/O Stays at the Boundary

```
┌──────────────────────────────┐
│  I/O boundary                │  loadCalibrationConfig(), fetchInputRegisters()
│  ┌────────────────────────┐  │
│  │  Pure business logic   │  │  applyCalibration(), clamp(), int16ToNumber()
│  └────────────────────────┘  │
└──────────────────────────────┘
```

---

## Rule 3: SOLID Principles

### Priority Order

1. **S** — Single Responsibility (most violations occur here)
2. **D** — Dependency Inversion (critical for testability)
3. **I** — Interface Segregation (keep interfaces small)
4. **O** — Open/Closed (achieved via config-driven design)
5. **L** — Liskov Substitution (minimal inheritance used)

### S — Single Responsibility

Each file/class has one reason to change. `ModbusService` currently handles
connection management, polling, data transformation, output diffing, and listener
management — decompose it:

```ts
// connection.ts  — connect/reconnect lifecycle
// poller.ts      — interval ticking
// transform.ts   — pure: int16[] → ChannelData[]
// outputDiff.ts  — pure: detects changed outputs
```

### D — Dependency Inversion

```ts
// ✅ Constructor injection
export class ModbusService {
  constructor(
    readonly #client: IModbusClient,   // injected
    readonly #config: CalibrationConfig,
  ) {}
}
```

In tests, replace `IModbusClient` with `vi.fn()` mocks.

### I — Interface Segregation

```ts
export interface IConnectionStatus { getConnectionStatus(): boolean; }
export interface IDataSource { getInputData(): ChannelData[]; onChange(...): () => void; }
export interface IOutputControl { setOutput(index: number, value: number): void; }
export interface IModbusService extends IConnectionStatus, IDataSource, IOutputControl {}
```

### O — Open/Closed

Config-driven design satisfies OCP. Adding a new chip type or polynomial degree
requires only a YAML change, not a code change.

---

## Rule 4: Testing Strategy

```bash
pnpm test      # run all tests with coverage
pnpm check     # type-check + lint
```

### Pure Functions — Direct Vitest Tests

```ts
import { expect, test } from "vitest";
import { applyCalibration, clamp } from "./calibration.ts";

test("applyCalibration linear", () => {
  expect(applyCalibration(10, [0, 2])).toBe(20);
});
```

### React Ink Components — ink-testing-library

```tsx
import { render } from "ink-testing-library";
test("displays channel values", () => {
  const { lastFrame } = render(<MainScreen inputs={makeTestChannels(16)} ... />);
  expect(lastFrame()).toContain("CH0");
});
```

### Services — Constructor Injection + Vi Mocks

```ts
const client: IModbusClient = {
  connect: vi.fn(), readInputs: vi.fn().mockResolvedValue(Array(16).fill(0)), ...
};
const service = new ModbusService(client, testConfig);
```

---

## Rule 5: JSR @std/ Packages

Prefer `jsr:@std/` over custom implementations. Install with `pnpm add jsr:@scope/package`.

| Custom pattern | Use instead |
|----------------|-------------|
| Manual `setTimeout` sleep | `@std/async/delay` → `delay(ms)` |
| Manual retry loop | `@std/async/retry` → `retry(fn, options)` |
| `assert(cond)` in tests | `@std/assert` |
| `path.join` | `@std/path/join` |
| YAML parsing | `@std/yaml` |

Use custom only when no `@std/` equivalent exists or performance constraints apply.

---

## Rule 6: JSDoc Requirements

Every **exported** symbol requires JSDoc (English). Non-exported symbols should have
JSDoc when the name alone is insufficient.

### Placement for Arrow Functions

```ts
// ✅ JSDoc ABOVE the const
/** Applies polynomial calibration to a raw sensor value. */
export const applyCalibration = (raw: number, factors: number[]): number =>
  factors.reduce((acc, a, i) => acc + a * raw ** i, 0);
```

### Full Signatures for Complex Functions

Include `@param`, `@returns`, and `@example` for non-trivial functions.

### Interfaces and Types

JSDoc on the type itself **and** on each field:

```ts
/** Represents a single sensor or actuator channel. */
export interface ChannelData {
  /** Zero-based index into the raw register array. */
  index: number;
  /** Human-readable channel identifier (e.g., "CH0"). */
  id: string;
  /** Raw register value before calibration. */
  rawValue: number;
  /** Calibrated value. Equals rawValue when no calibration is configured. */
  value: number;
}
```

---

## Rule 7: React Ink UI Guidelines

### Thin Component Layer

Components handle only rendering and local interaction state. All business logic lives
in pure-function modules.

### Reusable UI Parts

Extract repeated UI patterns into custom hooks or Ink components:

```ts
// hooks/useChannelNavigation.ts
/** Manages keyboard navigation across a list of channels. */
export const useChannelNavigation = (count: number) => {
  const [selected, setSelected] = useState(0);
  useInput((_, key) => {
    if (key.upArrow) setSelected((i) => Math.max(0, i - 1));
    if (key.downArrow) setSelected((i) => Math.min(count - 1, i + 1));
  });
  return { selected, setSelected };
};
```

### ink Built-in Useful Components

Before building a custom component, check
[ink's Useful Components](https://github.com/vadimdemedes/ink?tab=readme-ov-file#useful-components):

| Component | Package | Use case |
|-----------|---------|----------|
| `<TextInput>` | `@inkjs/ui` | Keyboard text input |
| `<Spinner>` | `@inkjs/ui` | Loading indicator |
| `<ProgressBar>` | `@inkjs/ui` | Value/progress visualization |
| `<Select>` | `@inkjs/ui` | Arrow-key selection menus |

### React Optimization

Follow the `vercel-react-best-practices` skill for memo/useMemo/useCallback.
**Skip** `bundle-*`, `server-*`, and `rendering-hydration-*` rules — they do not apply
to this terminal UI project.

---

## Language & Style Summary

| Concern | Rule |
|---------|------|
| Functions | Arrow functions everywhere; `function` declarations only for top-level React components |
| JSDoc | Required for all exports; English; above `const` for arrow functions |
| Private fields | `#field` syntax, not `private` keyword |
| Import extensions | Always include `.ts` / `.tsx` |
| TypeScript | Strict mode; no `any`; no `!` assertions without justification |
| Packages | `jsr:@std/` preferred; `pnpm add jsr:@scope/package` |
| File naming | Match main export name; flat paths; no `index.ts` barrels |
| Tests | Every source file → corresponding `.test.ts`; `pnpm test` |
