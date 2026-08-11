# Crime Nexus — Frontend

React investigation dashboard for the Crime Nexus forensics workspace. Built with Vite, Tailwind CSS 4, and Supabase auth.

For the architecture overview and API reference, see the [root README](../README.md).

## Setup

```bash
npm install
cp .env.example .env.local   # fill in the Supabase values
```

## Running

```bash
npm run dev       # http://localhost:5173
npm run build     # production build to dist/
npm run preview   # serve the production build
npm run lint      # ESLint
```

The backend must be running on `http://localhost:8000` (or wherever `VITE_API_URL` points). CORS on the backend allows only ports 5173 and 3000.

## Environment

Vite exposes only `VITE_`-prefixed variables to client code, and reads them at startup — restart the dev server after editing.

| Variable | Required | Default | Purpose |
|---|---|---|---|
| `VITE_API_URL` | No | `http://localhost:8000` | Backend base URL |
| `VITE_SUPABASE_URL` | Yes | — | Supabase project URL. Must be non-empty. |
| `VITE_SUPABASE_ANON_KEY` | Yes | — | Supabase anon key. Must be non-empty. |
| `VITE_DEV_BYPASS_AUTH` | No | `false` | Local development only — skips the Supabase login gate |

Both Supabase values must be non-empty even when the bypass is on: `createClient()` throws `supabaseUrl is required.` on an empty string, and since `lib/supabase.js` runs at module load, that exception kills the app before React mounts — a blank page with nothing in the console. Any placeholder works.

To develop without a Supabase project, put this in `.env.local`:

```bash
VITE_DEV_BYPASS_AUTH=true
VITE_SUPABASE_URL=http://localhost:54321
VITE_SUPABASE_ANON_KEY=dev-placeholder-anon-key
```

## Structure

| Path | Contents |
|---|---|
| `src/App.jsx` | Routing and top-level investigation state |
| `src/components/views/` | Full-page views: Landing, Auth, Upload, Processing, Dashboard, Hero |
| `src/components/tabs/` | Dashboard tabs: Chat, Timeline, Evidence, People, RawEvidence |
| `src/components/layout/` | Sidebar |
| `src/components/ui/` | Reusable pieces: StatCard, AnomalyBadge, RelevanceBar, NotesSidebar, SidebarItem, GlobalStyles |
| `src/utils/api.js` | Backend client — every fetch call lives here |
| `src/lib/supabase.js` | Supabase client |
| `src/data/mockData.js` | Placeholder data |

## Notable dependencies

- `react-force-graph-2d` — entity relationship graph in the People tab
- `react-markdown` with `@tailwindcss/typography` — renders chat responses
- `lucide-react` — icons
