# UI library development

Rules for AI coding agents in this repository. `CLAUDE.md` only imports this file.

## What this is

The shared React component library for CircuitDocs and messen.app. The look follows messen.app's
original Svelte components. Keep components generic: no app data, no app routes, no technical
drawing colors.

## Conventions

- One folder per component in `src/components/<Name>/`: `<Name>.tsx`, `<Name>.module.css` and
  `<Name>.stories.tsx`. Export it from `src/index.ts`.
- Use the tokens in `src/styles/tokens.css` for color, spacing, radius, type, shadows and motion.
  Grayscale first; color only for warnings and errors. Minimal radius (`var(--radius-1)`).
- Styles are CSS Modules. Do not style another component's internals; add a prop or a
  `className` hook instead.
- Texts that a component shows on its own come from `src/i18n/messages.ts` (`en`, `de-CH`, `fr-CH`
  and `it-CH`).
- Copy is short, sentence case and neutral. No emoji or decorative gradients.
- File names must stay unique when case is ignored (Windows and macOS).

## Stories

- Cover every visual state: default, variants, disabled or read only, loading, success and error
  for async controls, German texts, and a hidden dark story (`darkA11y` from
  `src/stories/storyHelpers.ts`).
- Prefer `play` functions that click and type over static screenshots. Each story runs as a
  browser test with the accessibility check (`npm run test:storybook`).

## Verification

- While working: `npm test`, `npm run typecheck` and `npm run test:storybook -- <path>`.
- Before a pull request: `npm run test:full`, and report the result in the PR description.
- GitHub Actions runs `npm run check` and the story tests on every pull request (free for this
  public repository). A version tag builds the package and attaches it to a GitHub release.
