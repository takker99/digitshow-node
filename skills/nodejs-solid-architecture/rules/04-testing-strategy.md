# Testing Strategy

## Rule

Every source file must have a corresponding test file. Tests are the primary mechanism
for verifying that pure functions behave correctly and that services handle edge cases.

```
src/calibration.ts          → src/calibration.test.ts
src/modbus/client.ts        → src/modbus/client.test.ts
src/ui/MainScreen.tsx       → src/ui/MainScreen.test.tsx
```

Run all tests: `pnpm test`
Type-check + lint: `pnpm check`

---

## 1. Pure Functions — Direct Vitest Tests

Pure functions require no mocking. Test them directly with input/output assertions.

```ts
// calibration.test.ts
import { expect, test } from "vitest";
import { applyCalibration, clamp, int16ToNumber } from "./calibration.ts";

test("applyCalibration applies linear factors", () => {
  expect(applyCalibration(10, [0, 2])).toBe(20);
});

test("applyCalibration handles quadratic", () => {
  expect(applyCalibration(3, [1, 0, 2])).toBe(19); // 1 + 0*3 + 2*9
});

test("clamp returns min when below range", () => {
  expect(clamp(-1, 0, 100)).toBe(0);
});

test("int16ToNumber converts signed 16-bit", () => {
  expect(int16ToNumber(0xffff)).toBe(-1);
});
```

## 2. React Ink Components — ink-testing-library

Use `@inkjs/ui` or `ink-testing-library` to render components and assert on terminal output.

```tsx
// MainScreen.test.tsx
import { render } from "ink-testing-library";
import { expect, test } from "vitest";
import MainScreen from "./MainScreen.tsx";
import { makeTestChannels } from "./test-utils.ts";

test("displays channel values", () => {
  const { lastFrame } = render(
    <MainScreen
      inputs={makeTestChannels(16)}
      outputs={makeTestChannels(8)}
      connectionStatus={true}
    />,
  );
  expect(lastFrame()).toContain("CH0");
});
```

Keep test-utils in a dedicated `test-utils.ts` file (not exported from the main module).

## 3. Services — Constructor Injection + Vi Mocks

Services that depend on I/O receive their dependencies via constructor injection (see
`03-solid-principles.md`). Replace them with `vi.fn()` mocks in tests.

```ts
// modbus/service.test.ts
import { beforeEach, expect, test, vi } from "vitest";
import type { IModbusClient } from "./client.ts";
import { ModbusService } from "./service.ts";

const makeClient = (): IModbusClient => ({
  connect: vi.fn().mockResolvedValue(undefined),
  readInputs: vi.fn().mockResolvedValue(Array(16).fill(0)),
  writeOutputs: vi.fn().mockResolvedValue(undefined),
  disconnect: vi.fn().mockResolvedValue(undefined),
  getConnectionStatus: vi.fn().mockReturnValue(true),
  reconnect: vi.fn().mockResolvedValue(undefined),
});

let client: IModbusClient;
let service: ModbusService;

beforeEach(() => {
  client = makeClient();
  service = new ModbusService(client, testConfig);
});

test("reports connected status", () => {
  expect(service.getConnectionStatus()).toBe(true);
});
```

## 4. What NOT to Test

- Zod schemas themselves (prefer testing the functions that use them)
- External packages (`modbus-serial`, `ink`, etc.)
- Implementation details that are not observable from outside

## 5. Coverage

Vitest is configured to collect coverage. Aim for high coverage on pure-function
modules. Services and UI components should have happy-path and error-path coverage.

```bash
pnpm test           # run with coverage
```
