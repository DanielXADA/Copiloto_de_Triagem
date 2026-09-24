# Base44 Dev Environment

## Project Overview
Lovable-generated TanStack Start (SSR via Nitro) + Vite 8 + React 19 + Tailwind v4 app.
A medical triage SaaS interface ("Copiloto Med") using mock data for all screens.
Package manager: **bun** (bun.lock + bunfig.toml present).

## Structure
- App source lives in `copilot-clinic-interface-main/` (not repo root).
- Routes: `src/routes/*.tsx` (file-based: index, pacientes, triagens, agenda, dossies, relatorios, configuracoes).
- UI uses mock data from `src/lib/mock-data.ts` — no live database queries needed to render.
- Supabase integration exists (`src/integrations/supabase/`) but is lazily initialized (Proxy pattern) and not required for UI rendering. Publishable keys are committed in `.env`.

## Running
```sh
docker compose -f docker-compose.base44.yml up -d
```
- Image: `oven/bun:1`, bind-mounted at `/app`.
- Dev command: `bun run dev -- --host 0.0.0.0 --port 3000` (Vite dev server with SSR).
- Port 3000 mapped to host.
- Live reload is active; edits to `copilot-clinic-interface-main/src/` appear in the preview automatically.

## Notes
- `bunfig.toml` has a 24h supply-chain guard (`minimumReleaseAge = 86400`) that can reject very fresh packages.
- No external secrets required — Supabase publishable keys are in the committed `.env`.
- The `SUPABASE_SERVICE_ROLE_KEY` is not present and not needed for the UI; it would only be needed for server-side admin operations.
