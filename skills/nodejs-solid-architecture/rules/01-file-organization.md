# File Organization — Minimal Exports

## Rule

Follow the **Minimal Exports** principle from [deno/std](https://github.com/denoland/std/blob/main/.github/ARCHITECTURE.md#minimal-exports):

> Files are structured to minimize the number of dependencies they incur and the
> amount of effort required to manage them, both for the maintainer and the user.
> In most cases, only a single function or class, alongside its related types, are
> exported. In other cases, functions that incur negligible dependency overhead
> will be grouped together in the same file.

## Guidelines

### One Primary API Per File

Each file should export one "main thing":
- A single class and its supporting types
- A closely related group of pure utility functions (e.g., all number converters for calibration)
- A single React component and its props interface

The file name **must match** the main export (snake_case or camelCase).

### No `index.ts` Barrel Files

❌ Incorrect — unnecessary indirection:
```
src/
  calibration/
    index.ts      ← re-exports from below
    applyCalibration.ts
    clamp.ts
```

✅ Correct — flat and direct:
```
src/
  calibration.ts    ← all calibration-related pure functions
  clamp.ts          ← only if used outside calibration context
```

### Flat Directory Structure

Avoid deeply nested directories. Keep the tree at most two levels deep.

❌ Incorrect:
```
src/utils/math/calibration/polynomial.ts
```

✅ Correct:
```
src/calibration.ts
```

### When to Group Multiple Functions in One File

Group functions together when they:
1. Are always used together (cohesion)
2. Share internal logic or types not exposed outside
3. Have negligible dependency impact individually

Example: `src/calibration.ts` currently exports `applyCalibration`, `clamp`,
`int16ToNumber`, and `numberToUint16`. These are all number transformation utilities
used in the same context — grouping them is correct.

### When to Split Into Separate Files

Split into separate files when:
1. A function or class has a distinct dependency that others do not need
2. The file exceeds ~200 lines (a soft signal to reconsider cohesion)
3. A function is likely to be used in a completely different context

### Each Source File Has a Test File

```
src/calibration.ts       → src/calibration.test.ts
src/modbus/client.ts     → src/modbus/client.test.ts
src/ui/MainScreen.tsx    → src/ui/MainScreen.test.tsx
```

## Current Codebase Notes

- `src/calibration/index.ts` should be renamed to `src/calibration.ts`
- `src/utils/config.ts` is appropriately grouped (all are config-mapping pure functions)
- `src/modbus/service.ts` may warrant splitting — see `03-solid-principles.md`
