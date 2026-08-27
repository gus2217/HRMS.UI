# Jacana HRMS — Frontend (jacana-ui)

Production-ready single-page application for the **Jacana HRMS** backend. Dark hospital console modeled on the Nivela design system — deep-navy shell, orange accent, feature-folder structure — wired to the real `/api/v1` contracts.

## Stack

- **React 19** + **TypeScript** (strict) + **Vite 8**
- **Tailwind CSS v4** (design tokens in `src/index.css`)
- **react-router-dom v7** — lazy-loaded, permission-gated routes
- **recharts** — dashboard/report charts
- **zustand** — auth session store
- **react-hot-toast** — notifications

## Project structure

```
src/
├── App.tsx                     # Route table (code-split, permission-guarded)
├── main.tsx                    # Entry + session restore
├── config.ts                   # API base (same-origin /api/v1, proxied in dev)
├── index.css                   # Design tokens (Nivela-inspired)
├── lib/
│   ├── api.ts                  # Typed API client — the single source of backend contracts
│   ├── format.ts               # Date / money / age helpers
│   └── permissions.ts          # Role → permission mapping (mirrors backend seed)
├── store/
│   └── authStore.ts            # Session: access token in memory, refresh in localStorage
├── components/
│   ├── auth/RequireAuth.tsx    # Route guard (session restore + permission)
│   └── layout/AppLayout.tsx    # Sidebar shell (brand, nav, user)
└── pages/                      # One page per module
    ├── Login.tsx               # Email/password + TOTP step
    ├── Dashboard.tsx           # KPIs + low-stock alerts
    ├── Patients.tsx            # Search, register (dup detection), pagination
    ├── Patient360.tsx          # Demographics, allergies, consents, clinical history
    ├── Consultations.tsx       # Start, triage, diagnosis, notes, complete
    ├── Pharmacy.tsx            # Prescriptions
    ├── Lab.tsx                 # Orders + result recording
    ├── Billing.tsx             # Invoices, payments, SHA claims
    ├── Wards.tsx               # Occupancy, admissions, discharge, ward notes
    ├── Inventory.tsx           # Drug catalog, receive stock, low-stock alerts
    ├── Reports.tsx             # Registrations / revenue / stock / SHA / workload
    └── Audit.tsx               # Audit log with before/after diff
```

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

For production, the API base is same-origin (`/api/v1`) — serve `dist/` behind the API host (or any reverse proxy that forwards `/api` to the backend).

## Auth model

Matches the backend's **bearer** scheme (not cookies):

- `POST /api/v1/auth/login` → access + refresh tokens
- Access token held **in memory**; refresh token in `localStorage`
- Every request sends `Authorization: Bearer` + `X-Auth-Mode: bearer` (opts out of the cookie/CSRF scheme)
- On 401 the client silently refreshes once (single-flight) and retries
- Session restores on reload from the stored refresh token

## Design language

Nivela-inspired: `#040911` shell, `#0b1220` cards, `#FFA500` accent, Montserrat, hairline `white/6%` borders, 8px radii, subtle hover states. All styles are tokens/utilities — no component library lock-in.

## Seeded access

| Email | Role |
|---|---|
| `admin@stfrancis.local` | Administrator |
| `doctor@stfrancis.local` | Doctor |
| `pharmacist@stfrancis.local` | Pharmacist |

Password for all seeded users: `ChangeMe123!` — change before any real deployment.
