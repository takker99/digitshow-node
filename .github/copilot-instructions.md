# Coding Guidelines — digitshow-node

Quick reference for all Copilot features. See `.agents/skills/nodejs-solid-architecture/` for detailed rules with examples.

## Language & Style

- **TypeScript strict mode** is enabled. Never use `any` or non-null assertions without justification.
- **Arrow functions** are preferred for all functions. Use `function` declarations only for top-level React components (required for React DevTools display names).
- **JSDoc** is required for every exported symbol. At minimum, add a one-line description. Write in **English**. For arrow functions, place JSDoc above the `const` declaration.
- **Private class fields** use `#` syntax (not `private` keyword).
- **Import paths** must include `.ts` / `.tsx` extensions (e.g., `import { foo } from "./foo.ts"`).

## File & Directory Organization

- Follow the **Minimal Exports principle** (see [deno/std ARCHITECTURE](https://github.com/denoland/std/blob/main/.github/ARCHITECTURE.md#minimal-exports)):
  - One primary API (class, function, or type group) per file.
  - File name = main API name (snake_case or camelCase matching the export).
  - Each source file has a corresponding `<name>.test.ts` file.
- **No unnecessary `index.ts` re-exports.** Prefer flat paths: `calibration.ts` instead of `calibration/index.ts`.
- No deeply nested directories. Keep the tree shallow and navigable.

## Architecture & Separation of Concerns

- **SOLID principles**, with emphasis on S (Single Responsibility) and D (Dependency Inversion).
- **Pure functions first.** Extract logic from React components, hooks, and service classes into pure functions that can be unit-tested without mocks.
- **I/O stays at the boundary.** Functions that read files, call hardware, or have side effects should be named with a verb prefix: `load*`, `fetch*`, `send*`, `write*`.
- **Thin UI layer.** Components and hooks contain only rendering/state management logic. Business logic lives in separate pure-function modules.
- **Dependency injection** for testability. Services receive their dependencies (e.g., `ModbusClient`) via constructor rather than creating them internally.
- **Reusable UI parts** (shared across screens) are extracted into custom hooks or React Ink components.

## External Packages

- Prefer **`jsr:@std/`** packages over custom implementations. Examples:
  - `@std/async/delay` instead of a manual `sleep` helper.
  - `@std/assert` for test assertions.
  - `@std/path`, `@std/fs`, `@std/yaml` where applicable.
- Add JSR packages with: `pnpm add jsr:@scope/package`
- Use [ink's built-in useful components](https://github.com/vadimdemedes/ink?tab=readme-ov-file#useful-components) before building custom ones.

## Testing

- Every source file must have a corresponding test file (`<name>.test.ts`).
- Pure functions: use Vitest unit tests directly. No mocking needed.
- I/O / services: inject dependencies and mock at the boundary.
- Run tests: `pnpm test` | Type-check + lint: `pnpm check`

## React Ink Specifics

- For React component performance (memo, useMemo, useCallback), refer to the `vercel-react-best-practices` skill. Note: Next.js/SSR/bundle rules do **not** apply to this terminal UI project.
