# @manuelrueedi/ui

Shared React components and design tokens for CircuitDocs and messen.app. The look comes from
messen.app's Svelte component library; this package rebuilds those components in React.

## Use it in an app

Install it straight from GitHub, pinned to a tag or commit:

```bash
npm install github:ManuelRueedi/ui#v0.1.0
```

npm runs the `prepare` script, which builds `dist/` during the install. React 19, React DOM 19
and `lucide-react` come from the app (peer dependencies).

Load the styles once, then wrap the app in `UiProvider`:

```tsx
import '@manuelrueedi/ui/tokens.css'; // colors, spacing, type, the Google Sans Flex font
import '@manuelrueedi/ui/base.css'; // optional: reset and element styles
import '@manuelrueedi/ui/styles.css'; // component styles
import { Button, UiProvider } from '@manuelrueedi/ui';

export function App() {
  return (
    <UiProvider locale="de-CH">
      <Button variant="primary">Speichern</Button>
    </UiProvider>
  );
}
```

- **Dark mode:** set `data-theme="dark"` (or the class `dark`) on `<html>` or any wrapper.
- **Languages:** `locale` is `en` or `de-CH`. Pass `messages` to override single texts.
- **Class names** are readable and scoped, for example `ui-Button-primary`, so they never clash
  with an app's own CSS.
- **Tokens** keep messen.app's names (`--fg-1`, `--bg-2`, `--space-4`, `--radius-1` …). Watch
  out in CircuitDocs: `--focus-ring` is a color there but a box-shadow here.

## Components

Avatar, Badge, Button, Card, Checkbox, Collapsible, Dialog, EditableSelect, Field, IconButton,
Input, NavItem, PageLoading, SearchableSelect, SegmentControl, Select, Sidebar, Textarea and
Tooltip, plus the `useSpotlight` hook for the hover light on custom surfaces. Storybook shows
every state in light and dark mode and in both languages.

messen.app's map view (MapLibre, swisstopo) is not part of this package; it moves with
messen.app's screens.

## Develop

Use the Node version in `.node-version`.

| Command                  | What it does                                                    |
| ------------------------ | --------------------------------------------------------------- |
| `npm install`            | Install dependencies (also builds `dist/`)                      |
| `npm run storybook`      | Storybook on http://localhost:6006                              |
| `npm test`               | Unit tests (Vitest, jsdom)                                      |
| `npm run test:storybook` | Every story as a browser test, with the accessibility check     |
| `npm run check`          | Format, lint, types, unit tests and the package build           |
| `npm run test:full`      | `check`, the story tests and the Storybook build; run before PR |

The story tests need Chromium once: `npx playwright install chromium`. To use a Chromium that is
already installed, set `PLAYWRIGHT_CHROMIUM_PATH` to its executable.

## Release

1. Raise `version` in `package.json` and merge to `main`.
2. Tag the merge commit (`git tag v0.2.0 && git push origin v0.2.0`).
3. Update the tag in each app's `package.json` and run `npm install`.
