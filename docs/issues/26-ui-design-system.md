title: UI foundation: design tokens, base components and motion
labels: feature
milestone: M3 Platform UI
---
**Branch:** `26-ui-design-system`  |  **Estimate:** 6-8 h  |  **Depends on:** none. **Every other M3 issue builds on this one, so do it first.**

## Context
The web app is plain Tailwind on each page, with repeated class strings, no shared components, no dark mode and no animation. The new platform needs one minimal, consistent look. This issue builds the parts every page will reuse; it does not redesign any page yet.

## Scope
In: design tokens, light and dark theme, base UI components, motion presets, icons, a component showcase page, component tests.
Out: page redesigns (issues 27 to 40).

## Design
- **Look:** minimal. Neutral greys, one accent colour, generous white space, one font family (keep Geist), 2 or 3 type sizes per page, soft radius, very light shadows.
- **Tokens** in `web/src/app/globals.css` with Tailwind v4 `@theme`: colours (`--color-bg`, `--color-surface`, `--color-border`, `--color-text`, `--color-muted`, `--color-accent`, `--color-danger`, `--color-success`), radius, shadow, spacing scale. Components use tokens, never raw hex values.
- **Dark mode:** follows `prefers-color-scheme` by default, with a manual toggle (light / dark / system) stored in `localStorage` and applied as a class on `<html>` before paint (no flash).
- **Components** in `web/src/components/ui/`:
  `Button` (primary, secondary, ghost, danger; sm/md; `loading` shows a spinner and disables), `Input`, `Textarea`, `Select`, `Label` + `FieldError`, `Card`, `Badge`, `Tabs`, `Dialog`, `DropdownMenu`, `Toast` (+ `useToast`), `Skeleton`, `EmptyState`, `Avatar`, `Spinner`.
  Use Radix UI primitives for Dialog, DropdownMenu, Tabs and Toast (keyboard and screen-reader support for free), styled with Tailwind.
- **Icons:** `lucide-react`.
- **Motion:** the `motion` package. Presets in `web/src/components/motion.ts`: fade-in, slide-up, stagger for lists, layout animation for list changes. Short (150-250 ms), subtle. **All motion is off when `prefers-reduced-motion: reduce`.**
- **Showcase:** `/dev/ui` page listing every component in every state, both themes. Only available in development (returns 404 in production).
- Pin exact versions of new packages.

## Tests
- Set up `@testing-library/react` with a `jsdom` environment in Vitest.
- `Button`: `loading` disables it and shows the spinner; `onClick` not called while disabled.
- `Dialog`: opens, traps focus, closes on Escape, returns focus to the trigger.
- `Toast`: appears and disappears after its timeout.
- Theme: the stored choice is applied; "system" follows the media query.
- Reduced motion: the motion presets return no animation when the media query matches.

## Acceptance criteria
- [ ] `/dev/ui` shows all components in light and dark mode.
- [ ] No page has changed visually yet, except the theme toggle being available.
- [ ] Lint, typecheck, tests and build pass in CI.
