# @manuelrueedi/ui

Shared React components and design tokens for CircuitDocs and messen.app. The look comes from
messen.app's Svelte component library; this package rebuilds those components in React.

## Use it in an app

Install the package file of a release. It is already built, so the install needs no build, no
Git and no token:

```bash
npm install https://github.com/ManuelRueedi/ui/releases/download/v0.2.0/manuelrueedi-ui-0.2.0.tgz
```

React 19, React DOM 19 and `lucide-react` come from the app (peer dependencies).

To try a branch before it is released, install it from Git instead
(`npm install github:ManuelRueedi/ui#<branch>`); npm then builds `dist/` with the `prepare` script.

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

- **Font:** Google Sans Flex ships as one 249 KB WOFF2 file (weight, grade and optical size
  stay variable).
- **Dark mode:** set `data-theme="dark"` (or the class `dark`) on `<html>` or any wrapper.
- **Languages:** `locale` is `en`, `de-CH`, `fr-CH` or `it-CH`. Other tags fall back by language
  (`fr` → `fr-CH`) and then to English. Pass `messages` to override single texts.
- **Class names** are readable and scoped, for example `ui-Button-primary`, so they never clash
  with an app's own CSS.
- **Tokens** keep messen.app's names (`--fg-1`, `--bg-2`, `--space-4`, `--radius-1` …). Watch
  out in CircuitDocs: `--focus-ring` is a color there but a box-shadow here.

## Components

Avatar, Badge, Button, Card, Checkbox, Collapsible, Dialog, EditableSelect, Field, IconButton,
Input, Menu, NavItem, PageLoading, SearchableSelect, SegmentControl, Select, Sidebar, Textarea and
Tooltip, plus the `useSpotlight` hook for the hover light on custom surfaces. Storybook shows
every state in light and dark mode; its toolbar switches between the four languages.

messen.app's map view (MapLibre, swisstopo) is not part of this package; it moves with
messen.app's screens.

## App composition hooks (0.1.3)

- A SegmentOption may supply a decorative prefix. Its string label remains the accessible
  name. SegmentControl.onActivate(value) runs on an enabled button's click, including activation
  of the selected option, before onValueChange; arrow-key selection only changes the value.
- Collapsible.headingClassName and panelClassName let an app mark a scroll/highlight target
  and adjust the animated panel's layout using its own class. Its default grid stays unchanged.
- Sidebar.mobileLauncherClassName marks the phone launcher's wrapper, for example while an
  app gives that element a view-transition name.

These optional hooks do not alter existing defaults. Apps keep navigation, responsive layout,
scrolling and transition timing in their own components.

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
2. Tag the merge commit (`git tag v0.2.0 && git push origin v0.2.0`). The Release workflow checks
   the package, builds it and attaches `manuelrueedi-ui-0.2.0.tgz` to a new GitHub release.
3. Point each app at the new file (`npm install <release file URL>`).
