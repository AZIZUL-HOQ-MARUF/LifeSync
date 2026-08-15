# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev       # Dev server on http://localhost:3000
npm run build     # Production build → dist/
npm run preview   # Serve the production build locally
```

There are no test, lint, or format scripts configured.

## Environment Variables

Create a `.env.local` file with:
- `VITE_GEMINI_PROXY_URL` — URL of the deployed Cloudflare Worker (`cloudflare-worker/`)
- `VITE_ONESIGNAL_APP_ID` — OneSignal app ID (only applied in production; skipped on localhost)

## Architecture

**Entry chain:** `index.html` → `index.tsx` → `App.tsx`

**Routing:** `HashRouter` (react-router-dom v7) defined in `App.tsx`. All routes are wrapped in `<AuthProvider>` and `<Layout>`. Routes: `/` → TasksPage, `/games` → GamesPage, `/clock` → ClockPage, `/settings` → SettingsPage, `/login` → LoginPage.

**State management:** No Redux/Zustand. State lives in:
- `AuthContext` (`context/AuthContext.tsx`) — user session, login/logout, sync status; session persisted to `localStorage` under `ls_user_session`.
- Each page manages its own `useState`.

**Data persistence flow:**
1. Tasks load from `localStorage` (`ls_tasks`) on mount.
2. Mutations write back to `localStorage` immediately.
3. When logged in, a debounced (1 s) call to `cloudService.syncTasks()` also writes to a per-user key (`cloud_db_<userId>_tasks`) — this is a **fully mocked** cloud backend (no real network call).
4. On login, tasks are fetched from the per-user key and replace local state.

**AI features:** `services/geminiService.ts` calls a **Cloudflare Worker proxy** (`cloudflare-worker/worker.js`) which forwards to Google Gemini 2.5 Flash. Used for: smart task parsing (free text → `{title, dueDate, priority}`) and city → IANA timezone resolution. The Gemini API key lives only in the Worker environment.

**`@` path alias** resolves to the **repository root** (not `src/`), so `@/types`, `@/services/...`, `@/context/...` all point to root-level files.

## Key Patterns

- **Tailwind via CDN** — not installed as a dev dependency; no `tailwind.config.js` on disk. The Tailwind config (`darkMode: 'class'`, custom colors) lives inline in `index.html`. There is no PurgeCSS.
- **Mock authentication** — `LoginPage` accepts any email + non-empty password; `cloudService.login` derives a user ID from `btoa(email)` and ignores the password.
- **Service worker** — `public/sw.js` handles caching, push, and background sync. It is registered both in `index.html` (inline) and in `index.tsx`, which can result in duplicate registrations.
- **TypeScript config** — `noEmit: true` with `allowImportingTsExtensions: true`; Vite handles transpilation, tsc is type-checking only.
- **Task reminders** — `TasksPage` polls every 15 seconds checking for due tasks and fires browser push notifications via `notificationService.ts` / `oneSignalService.ts`.
