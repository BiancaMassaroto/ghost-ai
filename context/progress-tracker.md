# Progress Tracker

Update this file whenever the current phase, active feature, or implementation state changes.

## Current Phase

- Phase 1: Foundation — design system and UI primitives, now with authentication wired in

## Current Goal

- `03-auth.md` is complete, and the `/editor` route it redirects authenticated users to now exists (chrome only — navbar, project sidebar, canvas placeholder). No feature-spec file defines the next unit yet.

## Completed

- `01-design-system.md`: shadcn/ui initialized (`components.json`, base-nova/Base UI preset); Button, Card, Dialog, Input, Tabs, Textarea, ScrollArea added to `components/ui/`; `lucide-react` installed; `lib/utils.ts` created with `cn()`; dark-only palette from `context/ui-context.md` wired into `app/globals.css` (mapped onto shadcn's semantic tokens and onto project utility tokens — `bg-base`, `text-copy-primary`, `border-surface-border`, `text-brand`, `bg-accent-dim`, etc.); `<html>` carries a permanent `dark` class since the app has no light mode. Verified: `tsc --noEmit`, `next build`, and `eslint` all pass clean; no `oklch` light-theme values remain in `globals.css`.
- `02-editor.md`:
  - `components/editor/editor-navbar.tsx` — fixed `h-14` top navbar (client component), dark `bg-surface` with `border-b border-surface-border`; left/center/right sections; left section holds the sidebar toggle `Button`, swapping `PanelLeftOpen`/`PanelLeftClose` off an `isSidebarOpen` prop; toggling itself is delegated to the caller via `onToggleSidebar` so navbar and sidebar can share one piece of state later; center and right sections are empty placeholders for now.
  - `components/editor/project-sidebar.tsx` — `fixed` overlay (`top-14 bottom-0 left-0`, `z-40`) so it floats above the canvas and never pushes layout; `isOpen` prop drives a `translate-x-0` / `-translate-x-full` slide transition; header with "Projects" title + close button; shadcn `Tabs` with "My Projects" / "Shared", each rendering the same empty-placeholder component; full-width `New Project` button with a `Plus` icon pinned to the bottom.
  - Dialog pattern: no new file added. `components/ui/dialog.tsx` (from `01-design-system.md`) already exposes `DialogTitle`, `DialogDescription`, and `DialogFooter` and already styles through the token-mapped shadcn semantic vars (`--popover`, `--popover-foreground`, `--muted`) from `globals.css`, so it already satisfies "title + description + footer actions, styled from tokens." Per the spec ("do not build actual dialogs yet") and the protected-foundation rule in `ai-workflow-rules.md`, it was left unmodified — no feature dialog (e.g. "New Project") was built.
  - Scope intentionally excludes wiring these two components into a shared layout or route — deferred per explicit instruction.
  - Verified: `tsc --noEmit` (via `next build`, after clearing stale `.next` typegen), `eslint`, and `next build` all pass clean on the new components.
- `03-auth.md`: Clerk wired into the app end to end.
  - Installed `@clerk/ui` (peer of the already-installed `@clerk/nextjs@7.8.3`).
  - `proxy.ts` (project root) — this Next.js 16 app uses `proxy.ts`, not `middleware.ts` (Next 16 renamed the convention; functionality is unchanged). Wraps `clerkMiddleware` from `@clerk/nextjs/server`; public routes are derived from `NEXT_PUBLIC_CLERK_SIGN_IN_URL`/`NEXT_PUBLIC_CLERK_SIGN_UP_URL` via `createRouteMatcher`, everything else calls `auth.protect()`. Note: `createRouteMatcher`/middleware-based protection is marked `@deprecated` in this Clerk version in favor of per-route `auth.protect()` calls, but the spec explicitly calls for the public-routes-in-middleware pattern, so that's what's implemented.
  - Added `NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in` and `NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up` to `.env.local` — these are Clerk's own well-known env var names (read directly by `@clerk/nextjs` internals), not invented ones; they didn't exist in `.env.local` yet so were added per the spec's "define public routes using the existing sign-in/sign-up env vars."
  - `lib/clerk-appearance.ts` — exports `clerkAppearance`, passed to `ClerkProvider`. Uses `@clerk/ui`'s `dark` theme (`{ theme: dark }` — note this Clerk version renamed the old `baseTheme` prop to `theme`) as the base, with `variables` overridden using the project's CSS custom properties from `globals.css` (`var(--accent-primary)`, `var(--bg-surface)`, etc.) instead of hardcoded colors, per spec and `code-standards.md`.
  - `app/layout.tsx` — wraps `<html>` with `ClerkProvider appearance={clerkAppearance}`.
  - `app/(auth)/layout.tsx` — shared two-panel (50/50) layout for auth pages (route group, doesn't affect URLs): left panel on `bg-surface` (vs. the right panel's `bg-base`) to differentiate it from the page background per the user's follow-up screenshot, holding a logo mark, a headline + supporting paragraph, an icon-badge feature list (`Sparkles`/`Share2`/`FileText` from `lucide-react`, each in a `bg-accent-dim`/`text-brand` badge), and a copyright footer pinned to the bottom via `justify-between`; hidden below `lg`. Right panel stays a centered, unstyled Clerk form column on `bg-base`. Copy matches the actual features in `project-overview.md`, not invented. This deviates from `03-auth.md`'s literal "text-only feature list" line — done at the user's explicit direction after they shared a target screenshot; no gradients, hero sections, boxed/bordered feature cards, or scroll-heavy layout, so the rest of the spec's constraints still hold.
  - `app/(auth)/sign-in/[[...sign-in]]/page.tsx` and `app/(auth)/sign-up/[[...sign-up]]/page.tsx` — Clerk's `<SignIn />`/`<SignUp />` components, unstyled beyond the global `appearance`; Clerk's own user menu/profile flows are left untouched.
  - `app/page.tsx` — server component; `auth()` from `@clerk/nextjs/server` redirects authenticated users to `/editor`, unauthenticated to `/sign-in`. (`/` is also protected by default in `proxy.ts`, so unauthenticated requests are actually redirected there first — this component's own unauthenticated branch is a defensive fallback, not the primary path.)
  - `components/editor/editor-navbar.tsx` — added Clerk's `<UserButton />` to the right section; no custom styling, inherits the global `appearance`.
  - Verified: `tsc --noEmit`, `eslint`, and `next build` all pass clean; manually smoke-tested with `next dev` — unauthenticated `GET /` returns a 307 to `/sign-in` (confirmed via raw headers, not just `-L`), and both `/sign-in` and `/sign-up` render 200 with the two-panel layout and the CSS-variable-driven appearance overrides present in the response HTML.
- `/editor` route: user hit a real 404 post-login because the route never existed (flagged as an open gap right after `03-auth.md` above). Fixed minimally — no feature-spec file covers this yet, so scope was kept to exactly the deferred wiring step already called out in `02-editor.md`, nothing more:
  - `components/editor/editor-shell.tsx` (new, client component) — lifts `isSidebarOpen` state (defaults `true`) and composes `EditorNavbar` + `ProjectSidebar`. Below the navbar, a `relative flex-1` region hosts the (still-`fixed`-overlay) `ProjectSidebar` plus a plain centered "Canvas workspace coming soon." placeholder — the real collaborative canvas (Liveblocks + React Flow, per `architecture-context.md`) isn't built yet, so nothing beyond an empty-state placeholder was added, consistent with the existing empty-state pattern already in `ProjectSidebar`'s tabs.
  - `app/editor/page.tsx` (new, server component) — just renders `<EditorShell />`; protected by `proxy.ts`'s default-protect rule like every other non-auth route.
  - Verified: `next build` now lists `○ /editor` as a real prerendered route (previously nonexistent); `eslint` clean; manually confirmed via `next dev` that unauthenticated `GET /editor` now 307s to `/sign-in?redirect_url=...` instead of 404ing.

## In Progress

- None — all completed work above is done as scoped.

## Next Up

- Add the next planned feature unit here (real canvas subsystem, project persistence, etc. — none of these have a feature-spec file yet).

## Open Questions

- `createRouteMatcher` + middleware-based `auth.protect()` (used in `proxy.ts`) is marked `@deprecated` in the installed `@clerk/nextjs@7.8.3` in favor of per-route `auth.protect()` calls (Clerk's stated reason: path-matching in middleware can diverge from how Next.js actually routes a request). `03-auth.md` explicitly specifies the public-routes-in-middleware pattern, so that's what's built. Worth revisiting if/when new protected routes are added — confirm the matcher in `proxy.ts` actually covers them, or migrate to resource-based checks.

## Architecture Decisions

- Route protection lives in `proxy.ts` at the project root, not `middleware.ts` — Next.js 16 renamed the file convention (`middleware` → `proxy`); the API and semantics are otherwise unchanged.
- Clerk `appearance` is themed once, centrally, in `lib/clerk-appearance.ts` (`{ theme: dark, variables: {...} }` using this Clerk version's `theme` key, not the older `baseTheme` prop) and passed to `ClerkProvider` in the root layout, rather than repeated per-component — all Clerk UI (`SignIn`, `SignUp`, `UserButton`) inherits it automatically.

## Session Notes

- This app runs on pre-release Next.js 16 and a very new `@clerk/nextjs@7.8.3`/`@clerk/ui@1.31.0` — both diverge from older training-data conventions (`proxy.ts` instead of `middleware.ts`; Clerk's `theme` appearance key instead of `baseTheme`; `createRouteMatcher` deprecated). Per `AGENTS.md`, check `node_modules/next/dist/docs/` and the installed package's own `.d.ts`/dist files before assuming an API shape here.
- `/editor` now exists (chrome only, no real canvas) — the post-login 404 the user hit is fixed.
