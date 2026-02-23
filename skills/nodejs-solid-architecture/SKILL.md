---
name: nodejs-solid-architecture
description: SOLID principles, pure functions, and modular architecture guidelines for Node.js CLI/terminal applications. Emphasizes Single Responsibility, Dependency Inversion, Minimal Exports file organization (deno/std style), JSR @std/ package usage, and testability. Use this skill when designing new modules, refactoring service classes, organizing files, or writing tests.
license: MIT
metadata:
  author: takker99
  version: "1.0.0"
---

# Node.js SOLID Architecture Guidelines

Architecture and coding conventions for Node.js CLI applications built with TypeScript, React Ink, and the Deno/JSR ecosystem. Emphasizes SOLID principles, pure functions, and modular file organization.

## When to Apply

Load this skill when:
- Designing new modules, services, or feature files
- Refactoring classes that have grown too large
- Deciding how to split responsibilities across files
- Writing or reviewing unit tests
- Choosing between a custom implementation and a `jsr:@std/` package
- Organizing directory structure and file naming
- Writing JSDoc comments

For **React component performance** (memo, useMemo, useCallback), also refer to the
`vercel-react-best-practices` skill — but **ignore** Next.js/SSR/bundle-specific rules
as they do not apply to this terminal UI project.

## Rule Categories

| # | Rule File | Topic | Priority |
|---|-----------|-------|----------|
| 1 | `rules/01-file-organization.md` | Minimal Exports, flat directories | HIGH |
| 2 | `rules/02-pure-functions.md` | Purity, side-effect boundaries | HIGH |
| 3 | `rules/03-solid-principles.md` | SRP, DIP, ISP patterns | HIGH |
| 4 | `rules/04-testing-strategy.md` | Unit tests, mocking, coverage | HIGH |
| 5 | `rules/05-jsr-std-packages.md` | Prefer `jsr:@std/` over custom code | MEDIUM |
| 6 | `rules/06-jsdoc.md` | JSDoc requirements and style | MEDIUM |
| 7 | `rules/07-react-ink-ui.md` | Thin UI layer, reusable Ink components | MEDIUM |

## Quick Reference

### File Organization
- One primary API per file (class, function group, or type group)
- File name = main export name
- No `index.ts` barrel files; prefer flat paths
- `calibration.ts` not `calibration/index.ts`

### Pure Functions
- Extract all logic from React components and service classes into pure functions
- I/O functions use verb prefix: `load*`, `fetch*`, `send*`, `write*`
- Side effects never go inside pure functions

### SOLID
- **S**: Each file/class has one reason to change
- **D**: Services receive dependencies via constructor, not `new` inside
- **I**: Keep interfaces small and focused

### Testing
- Every `.ts` file → `.test.ts` counterpart
- Pure functions: Vitest directly, no mocks needed
- I/O: inject deps, mock at the boundary

### JSR Packages
- `@std/async/delay` for waits
- `@std/assert` for test assertions
- `@std/path`, `@std/fs`, `@std/yaml` as applicable
- Add: `pnpm add jsr:@scope/package`

### Arrow Functions & JSDoc
- Arrow functions everywhere except top-level React components (function declarations for DevTools)
- JSDoc required for all exports; place above `const` for arrow functions

## Full Compiled Document

See `AGENTS.md` for all rules expanded into a single document.
