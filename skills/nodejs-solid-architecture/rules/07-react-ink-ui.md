# React Ink UI Guidelines

## Rule

Keep components and hooks **thin**. UI code handles only rendering and local
interaction state. All business logic must live in separate, pure-function modules
that can be tested without React.

---

## Thin Component Layer

❌ Incorrect — business logic embedded in component:
```tsx
const ManualOutputScreen = ({ outputs, onSetOutput }: Props) => {
  const [selected, setSelected] = useState(0);
  // Computing valid range from chip spec is business logic — extract it
  const max = outputs[selected].id.startsWith("OUT") ? 10000 : 4095;
  ...
};
```

✅ Correct — logic extracted into pure function:
```ts
// src/outputRange.ts
/** Returns the maximum output value for a given channel ID. */
export const getOutputMax = (channelId: string): number =>
  channelId.startsWith("OUT") ? 10000 : 4095;
```

```tsx
// ManualOutputScreen.tsx — only rendering
import { getOutputMax } from "../outputRange.ts";

const ManualOutputScreen = ({ outputs, onSetOutput }: Props) => {
  const [selected, setSelected] = useState(0);
  const max = getOutputMax(outputs[selected].id);
  ...
};
```

---

## Reusable UI Parts

When the same UI pattern appears in two or more screens, extract it into a
**custom hook** or **React Ink component**.

```tsx
// hooks/useChannelNavigation.ts
/**
 * Manages keyboard navigation across a list of channels.
 *
 * @param count - Total number of channels.
 * @returns The currently selected index and a setter.
 */
export const useChannelNavigation = (count: number) => {
  const [selected, setSelected] = useState(0);
  useInput((input, key) => {
    if (key.upArrow) setSelected((i) => Math.max(0, i - 1));
    if (key.downArrow) setSelected((i) => Math.min(count - 1, i + 1));
  });
  return { selected, setSelected };
};
```

---

## Prefer ink Built-in Useful Components

Before building a custom component, check
[ink's Useful Components](https://github.com/vadimdemedes/ink?tab=readme-ov-file#useful-components)
for an existing solution. Notable examples:

| Component | Package | Use case |
|-----------|---------|----------|
| `<TextInput>` | `@inkjs/ui` or `ink-text-input` | Keyboard text input |
| `<Spinner>` | `@inkjs/ui` | Loading indicator |
| `<ProgressBar>` | `@inkjs/ui` | Value/progress visualization |
| `<Select>` | `@inkjs/ui` | Arrow-key selection menus |
| `<Table>` | `ink-table` | Tabular data display |
| `<Markdown>` | `ink-markdown` | Rich text rendering |

Install: `pnpm add @inkjs/ui` or the appropriate package.

---

## React Optimization (memo, useMemo, useCallback)

For component-level optimizations, follow the **`vercel-react-best-practices`** skill,
specifically the *Re-render Optimization* category.

**Important:** The following rules from that skill do **not** apply here (terminal UI,
not a browser application):
- `bundle-*` rules (no JS bundle to optimize)
- `server-*` rules (no SSR, RSC, or server actions)
- `rendering-hydration-*` rules (no hydration)
- `client-swr-*` and `client-localstorage-*` rules

---

## Arrow Functions for Component Helpers

All functions inside or alongside a component (helpers, callbacks) must be arrow
functions. Only the top-level exported component may use a `function` declaration:

```tsx
// ✅ Top-level component as function declaration (for DevTools display name)
export default function MainScreen(props: MainScreenProps) {
  // ✅ Arrow functions for derived computations
  const calibratedInputs = useMemo(
    () => props.inputs.map(applyCalibrationToChannel),
    [props.inputs],
  );
  ...
}
```
