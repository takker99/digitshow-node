# SOLID Principles

## Priority Order

For this codebase, apply SOLID in this order of practical importance:

1. **S** — Single Responsibility (most violations occur here)
2. **D** — Dependency Inversion (critical for testability)
3. **I** — Interface Segregation (keep interfaces small)
4. **O** — Open/Closed (often achieved naturally via config-driven design)
5. **L** — Liskov Substitution (rarely applicable; minimal inheritance used)

---

## S — Single Responsibility Principle

> A class or module should have only one reason to change.

### Anti-Pattern: Monolithic Service

`ModbusService` currently handles:
- Connection management (connect, reconnect, retry)
- Polling at a fixed interval
- Raw data transformation (int16 → calibrated float)
- Output diff detection
- Listener/event management

This means it changes whenever any of these concerns evolve.

### Pattern: Decompose by Concern

Split into smaller, focused units:

```ts
// connection.ts — manages connect/reconnect lifecycle
export class ModbusConnection { ... }

// poller.ts — ticks at a fixed interval, calls fetchInputs/sendOutputs
export class ModbusPoller { ... }

// transform.ts — pure: int16[] → ChannelData[] with calibration applied
export const transformInputs = (
  raw: number[],
  config: CalibrationConfig,
): ChannelData[] => { ... };

// outputDiff.ts — pure: detects changed outputs
export const hasOutputsChanged = (
  current: number[],
  previous: number[],
): boolean => current.some((v, i) => v !== previous[i]);
```

Each file has **one reason to change**. See `01-file-organization.md` for file naming.

---

## D — Dependency Inversion Principle

> Depend on abstractions, not concretions.

### Anti-Pattern: Creating Dependencies Inside

```ts
// ❌ ModbusService creates its own client — untestable
class ModbusService {
  #client = new ModbusClient(port, slaveId); // hard dependency
}
```

### Pattern: Constructor Injection

```ts
// ✅ Inject via constructor — testable with a mock
export interface IModbusClient {
  connect(): Promise<void>;
  readInputs(): Promise<number[]>;
  writeOutputs(values: number[]): Promise<void>;
  disconnect(): Promise<void>;
  getConnectionStatus(): boolean;
}

export class ModbusService {
  constructor(
    readonly #client: IModbusClient,  // injected
    readonly #config: CalibrationConfig,
  ) {}
}
```

In tests:
```ts
const mockClient: IModbusClient = {
  connect: vi.fn(),
  readInputs: vi.fn().mockResolvedValue(Array(16).fill(0)),
  writeOutputs: vi.fn(),
  disconnect: vi.fn(),
  getConnectionStatus: vi.fn().mockReturnValue(true),
};
const service = new ModbusService(mockClient, testConfig);
```

---

## I — Interface Segregation Principle

> Clients should not be forced to depend on interfaces they do not use.

Keep interfaces small and focused. If a consumer only reads connection status, it
should not receive a reference to a full `IModbusService`.

```ts
// ✅ Small, focused interfaces
export interface IConnectionStatus {
  getConnectionStatus(): boolean;
}

export interface IDataSource {
  getInputData(): ChannelData[];
  getOutputData(): ChannelData[];
  onChange(listener: Listener): () => void;
}

export interface IOutputControl {
  setOutput(index: number, value: number): void;
}

// Full service satisfies all three
export interface IModbusService
  extends IConnectionStatus,
    IDataSource,
    IOutputControl {}
```

---

## O — Open/Closed Principle

> Open for extension, closed for modification.

This is largely satisfied by config-driven design. Adding a new chip type or
polynomial degree does not require changing the calibration engine — only the YAML
config changes. Maintain this pattern.

---

## L — Liskov Substitution Principle

Minimal inheritance is used in this codebase (`implements` rather than `extends`).
This keeps LSP straightforward: any mock or alternative implementation that satisfies
an interface can substitute the real one without behavioral surprises.
