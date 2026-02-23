# JSR @std/ Packages

## Rule

Prefer **`jsr:@std/`** packages over writing custom implementations. The Deno
standard library is well-tested, maintained, and available in Node.js projects via
pnpm.

Reference: https://jsr.io/@std

## Adding a JSR Package

```bash
pnpm add jsr:@scope/package
# example:
pnpm add jsr:@std/async
```

See: https://deno.com/blog/add-jsr-with-pnpm-yarn

## Common Substitutions

| Custom pattern | Use instead |
|----------------|-------------|
| `await new Promise(r => setTimeout(r, ms))` | `@std/async/delay` → `delay(ms)` |
| Manual retry loop | `@std/async/retry` → `retry(fn, options)` |
| `assert(cond, msg)` in tests | `@std/assert` |
| `path.join(...)` | `@std/path/join` |
| `fs.readFile(...)` | `@std/fs` utilities |
| YAML parsing | `@std/yaml` |
| Deep equality check | `@std/assert/equals` |

### Example: Delay

❌ Custom sleep:
```ts
const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
await sleep(1000);
```

✅ Using `@std/async/delay`:
```ts
import { delay } from "@std/async/delay";
await delay(1000);
```

### Example: Test Assertions

❌ Using raw Vitest asserts for deep equality:
```ts
expect(result).toEqual(expected); // OK but @std/assert is more expressive for Deno-style
```

✅ Using `@std/assert`:
```ts
import { assertEquals } from "@std/assert";
assertEquals(result, expected);
```

(Both Vitest expect and @std/assert are acceptable; prefer consistency within a file.)

### Example: YAML parsing

❌ Importing a third-party YAML library:
```ts
import { parse } from "some-yaml-library";
```

✅ Using `@std/yaml`:
```ts
import { parse } from "@std/yaml";
```

## When Custom Implementation Is Acceptable

Use a custom implementation only when:
1. No `jsr:@std/` equivalent exists for the required functionality.
2. The `@std/` package has significant overhead for a trivial use case.
3. The behavior of the `@std/` package does not match the exact requirement.

In all other cases, prefer the standard library.
