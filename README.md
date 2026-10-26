# @manuelrueedi/ui

Shared React components and design tokens for CircuitDocs and messen.app. The look comes from
messen.app's Svelte component library; this package rebuilds those components in React.

## Use it in an app

Install the package file of a release. It is already built, so the install needs no build, no
Git and no token:

```bash
npm install https://github.com/ManuelRueedi/ui/releases/download/v0.3.0/manuelrueedi-ui-0.3.0.tgz
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
Input, Menu, NavItem, PageLoading, SearchableSelect, SegmentControl, Select, Sheet, Sidebar,
Textarea, Toast (with `Toaster` and `useToast`) and Tooltip, plus the `useSpotlight` hook for the
hover light on custom surfaces. Storybook shows every state in light and dark mode; its toolbar
switches between the four languages.

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

## App composition hooks (0.2.1)

- Dialog size="xl" is about 1160 px wide and may use the full viewport height; the size can
  change while the dialog is open. onClose(reason) says what asked to close it: 'button',
  'escape' or 'backdrop'. The parent owns open, so it can ignore a reason, for example
  'backdrop' while a form holds typed input. A caller's aria-describedby is added to the
  description instead of replaced. A dialog that unmounts while open closes first, so the
  browser returns focus to the opener.
- Collapsible.headingLevel also takes 5, 6 and 'none' (the toggle sits in a plain block, for
  folds in alerts or repeated rows). Collapsible.className goes on the root element.
- SegmentOption.title is the option's hover hint. SegmentControl.describedBy sets the group's
  aria-describedby.
- Tooltip opens on focus only when the focus is visible (keyboard), so a script that restores
  focus after a mouse action no longer opens it. describe={false} leaves out aria-describedby
  when the tooltip only repeats the trigger's name.
- PageLoading's default label comes from the catalogs (pageLoading.label).

## App composition hooks (0.3.0)

- The open Menu panel sits in the browser's top layer, fixed next to its trigger, so sticky bars,
  clipping parents and z-indices cannot cover it. placement and align (now also 'center') are
  preferences: the panel flips to the other side when there is no room, moves along the trigger
  to stay 12 px inside the window and scrolls when it is taller than the room left. Without
  popover support it stays the absolute panel under the trigger. Escape that closes the menu with
  the focus outside it is marked as used (defaultPrevented), so page-level Escape handlers that
  check it leave it alone.
- MenuItem.current takes true, 'page', 'location' or 'step' for aria-current; an aria-current
  passed through is kept. MenuItem.pressed marks a toggle (aria-pressed) with the same look as
  the current entry. MenuItem.description adds a second line, read out as the description; a
  disabled item with a description stays focusable and in the arrow order but does nothing.
- Button.wrap lets a long label break onto several lines, aligned to the start.
- Input type="search" draws its own gray clear button instead of the browser's blue one.
- New: `Toaster`, `useToast()` and `<Toast>` for short status messages with an optional action
  (see [Toasts](#toasts)). The catalogs gain `toast.region` and `toast.dismiss`.
- New: `Sheet`, a bottom sheet for phones: modal on the native dialog or non-modal in place,
  with optional peek and full snaps, a drag handle and swipe to close (see [Sheets](#sheets)).
  The catalogs gain `sheet.close`, `sheet.expand` and `sheet.collapse`.

## Toasts

Mount one `Toaster` inside `UiProvider`, around the app, then show toasts with `useToast()` or
write them as `<Toast>` elements:

```tsx
const toast = useToast();
toast.show({ id: 'save', message: 'Saved', tone: 'success' }); // the same id replaces in place
toast.update('save', { message: 'Saved at 10:02' });
toast.dismiss('save');

<Toast open={offline} tone="warning" message="You are offline" duration={null} />;
```

- Tones: neutral and success stay grayscale with an icon; warning and error carry colour.
  Durations default to 5 s (neutral, success) and 8 s (warning); errors and `duration: null`
  stay until dismissed. Timers pause on hover, while focus is inside and while the page is hidden.
- `action` adds one button (Undo, Reload, Cancel); it closes the toast unless `closes: false`.
  `onDismiss(reason)` says what removed it: 'timeout', 'button', 'action', 'escape', 'replaced'
  (the same id again, or pushed out beyond `max`) or 'code'. A `<Toast>` that closes or unmounts
  does not call it.
- The region sits in the top layer (a manual popover) and is shown again when a toast arrives,
  so it stays above sheets and tooltips. Errors go to a `role="alert"` region, the other tones to
  a `role="status"` region. Toasts never take focus; Escape closes the focused toast, and focus
  then returns to where it came from (a text field only after a keyboard dismissal).
- Keep it clear of app bars with `--toast-offset-top` / `--toast-offset-bottom` (default 16 px,
  plus the safe-area insets). Inside an open modal dialog the page behind is inert, so dialogs
  keep their own inline status lines.

## Sheets

`Sheet` is a bottom sheet for phones (the layout follows `(max-width: 760px)` unless `layout`
says 'phone' or 'wide'). The parent owns `open`:

```tsx
<Sheet open={adding} title="Add installation" initialFocus={search} onClose={() => setAdding(false)}>
  …
</Sheet>

<Sheet
  open={selected !== null}
  modal={false}
  wide="inline"
  snap={snap}
  onSnapChange={setSnap}
  onHeightChange={(px) => canvas.style.setProperty('--covered', `${px}px`)}
  title={selected?.name ?? ''}
  onClose={() => setSelected(null)}
/>
```

- Modal sheets (the default) use the native dialog, like Dialog: onClose(reason) says 'button',
  'escape', 'backdrop' or 'swipe', a close the browser forces is undone while `open` stays
  true, a Suspense boundary that hides it reports nothing, and an open sheet that unmounts closes
  first so focus returns to the opener. The page behind is inert and does not scroll;
  `initialFocus` picks the first focused element. Tab is not wrapped (native behaviour).
- Non-modal sheets render a labelled section in place, with the caller's className, data-\*
  attributes and role on it: fixed at `--sheet-z` (30), or absolute in the nearest positioned
  ancestor with `contained`. No backdrop, no focus move and no Escape handling.
- `snap` / `defaultSnap` ('peek' | 'full') add a drag handle (a button with aria-expanded; click,
  Enter or Space toggles). Peek is `peekHeight` (232 px), at most 42% of the visual viewport;
  full fills it. A drag of the handle, or a touch drag of the body once it is scrolled to the
  top, moves the sheet; a swipe down from peek asks to close it ('swipe') unless
  `dismissible={false}`. A tap that does not move keeps the scroll position. The rules are
  CircuitDocs' selection drawer's. Without snaps the sheet is as tall as its content, at most
  `--sheet-max-height` (88dvh).
- `onHeightChange(px)` reports the covered height on phones, also while dragging; 0 when wide,
  closed or unmounted. The root carries `data-layout`, `data-snap` and `data-dragging`.
- Above the breakpoint `wide` picks a bottom sheet capped by `size` (360/520/720 px), a centred
  dialog, or 'inline' (non-modal only: no positioning, the parent places it).
- `heading` replaces the visible title (the title stays the name), `headerActions` sit before
  the close button; `footer`, `hideClose`, `closeLabel`, `expandLabel` and `collapseLabel`.

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
2. Tag the merge commit (`git tag v0.3.0 && git push origin v0.3.0`). The Release workflow checks
   the package, builds it and attaches `manuelrueedi-ui-0.3.0.tgz` to a new GitHub release.
3. Point each app at the new file (`npm install <release file URL>`).
