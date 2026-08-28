# Jacana HRMS — Frontend (jacana-ui)

Single-page application for the **Jacana HRMS** backend. Follows the Nivela App UI
**folder structure and design patterns** (feature-folder architecture) with its own
light theme. Wired to the real `/api/v1` bearer-token contracts.

## Stack

- **React 19** + **TypeScript** (strict) + **Vite 8**
- **Tailwind CSS v4** (design tokens in `src/index.css`)
- **react-router-dom v7** — `routes/index.tsx` AppRoutes, lazy-loaded pages
- **recharts** — dashboard/report charts
- **react-hot-toast** — notifications

## Folder structure (Nivela feature-folder pattern)

```
src/
├── App.tsx                     # Lazy page map + Toaster
├── main.tsx                    # BrowserRouter + AuthProvider + App
├── config.ts                   # window._env.API_BASE_URL (deploy-time override)
├── index.css                   # Light theme tokens (Tailwind v4)
├── lib/
│   ├── apiClient.ts            # Shared transport: bearer + refresh + X-Auth-Mode
│   ├── format.ts               # Date / money / age helpers
│   └── permissions.ts          # Role → permission map (mirrors backend seed)
├── routes/
│   ├── index.tsx               # AppRoutes — every route, permission-guarded
│   └── components/ProtectedRoute.tsx
└── features/
    ├── auth/                   # components (AuthContext, LoginForm) · pages (LoginPage) · services (authService) · types
    ├── layout/                 # components (AppLayout — sidebar shell)
    ├── dashboard/              # pages (DashboardPage) · services · types
    ├── patients/               # pages (PatientsPage, Patient360Page) · components (RegisterPatientModal) · services · types
    ├── consultations/          # pages (ConsultationsPage) · components (DetailView, StartModal) · services · types
    ├── pharmacy/               # pages (PharmacyPage) · components (CreatePrescriptionModal) · services · types
    ├── laboratory/             # pages (LaboratoryPage) · services · types
    ├── billing/                # pages (BillingPage) · services · types
    ├── inpatient/              # pages (WardsPage) · services · types
    ├── inventory/              # pages (InventoryPage) · services · types
    ├── reports/                # pages (ReportsPage) · services · types
    └── audit/                  # pages (AuditPage) · services · types
```

Each feature owns its `pages/`, `components/`, `services/` and `types/` — the
same shape as Nivela, so features are self-contained and portable.

## Getting started

```bash
npm install
npm run dev        # http://localhost:5173 — proxies /api → http://localhost:5099
npm run build      # tsc -b && vite build (strict typecheck + production bundle)
npm run preview    # serve the production build
```

Point the dev proxy at your API if it runs elsewhere:

```bash
VITE_API_TARGET=http://localhost:5099 npm run dev
```

For production, the API base is same-origin (`/api/v1`) — serve `dist/` behind
the API host (or any reverse proxy that forwards `/api` to the backend). The
`window._env.API_BASE_URL` hook overrides it at deploy time without a rebuild.

## Auth model

Matches the backend's **bearer** scheme (not cookies):

- `POST /api/v1/auth/login` → access + refresh tokens; TOTP challenge supported
- Access token held **in memory**; refresh token in `localStorage`
- Every request sends `Authorization: Bearer` + `X-Auth-Mode: bearer`
- On 401 the client silently refreshes once (single-flight) and retries
- Session restores on reload from the stored user + refresh token

## Seeded access

| Email | Role |
|---|---|
| `admin@stfrancis.local` | Administrator |
| `doctor@stfrancis.local` | Doctor |
| `pharmacist@stfrancis.local` | Pharmacist |

Password for all seeded users: `ChangeMe123!` — change before any real deployment.
