# Jacana HRMS — Frontend (jacana-ui)

Single-page application for the **Jacana HRMS** backend. Follows a **feature-folder
architecture** (self-contained `pages/` / `components/` / `services/` / `types/` per
feature) with a clean light theme. Wired to the real `/api/v1` bearer-token contracts.

## Stack

- **React 19** + **TypeScript** (strict) + **Vite 8**
- **Tailwind CSS v4** (design tokens in `src/index.css`)
- **react-router-dom v7** — `routes/index.tsx` `AppRoutes`, lazy-loaded pages, permission-guarded
- **recharts** — dashboard/report charts
- **react-hot-toast** — notifications
- **zustand** — light client state
- **@headlessui/react** — accessible primitives (modals, menus)

## Folder structure (feature-folder pattern)

```
src/
├── App.tsx                     # Lazy page map + Toaster
├── main.tsx                    # BrowserRouter + AuthProvider + App
├── index.css                   # Light theme tokens (Tailwind v4)
├── lib/
│   ├── apiClient.ts            # Shared transport: bearer + refresh + X-Auth-Mode
│   ├── format.ts               # Date / money / age helpers
│   └── permissions.ts          # Role → permission map (mirrors backend seed)
├── routes/
│   ├── index.tsx               # AppRoutes — every route, permission-guarded
│   └── components/ProtectedRoute.tsx
└── features/
    ├── auth/                   # AuthContext, LoginForm · LoginPage · authService · types
    ├── layout/                 # AppLayout (sidebar shell)
    ├── dashboard/              # DashboardPage · services · types
    ├── patients/               # PatientsPage, Patient360Page · RegisterPatientModal · MedicalRecordTimeline · services · types
    ├── consultations/          # ConsultationsPage · ConsultationDetailView (full-screen workspace) · StartConsultationModal · Icd10Search · services · types
    ├── queue/                  # QueuePage · QueuePatientModal · services · types
    ├── appointments/           # AppointmentsPage · AppointmentModal · calendar/day-queue/requests components · services · types
    ├── pharmacy/               # PharmacyPage · services · types
    ├── laboratory/             # LaboratoryPage · services · types
    ├── billing/                # BillingPage · services · types
    ├── inpatient/              # WardsPage · services · types
    ├── inventory/              # InventoryPage · services · types
    ├── reports/                # ReportsPage · services · types
    └── audit/                  # AuditPage · services · types
```

Each feature owns its `pages/`, `components/`, `services/` and `types/`, so features
are self-contained and portable.

## Routes

| Path | Page | Permission |
|---|---|---|
| `/login` | Login | public |
| `/` | Dashboard (or first permitted module) | `Identity.User.View` |
| `/patients` | Patients list | `Patient.View` |
| `/patients/:id` | Patient 360 | `Patient.View` |
| `/consultations` | Consultations workspace | `Clinical.View` |
| `/queue` | Consultation queue | `Queue.View` |
| `/appointments` | Appointments | `Appointment.View` |
| `/pharmacy` | Pharmacy | `Pharmacy.Dispense` |
| `/lab` | Laboratory | `Laboratory.Order` |
| `/billing` | Billing | `Billing.View` |
| `/wards` | Inpatient wards | `Clinical.View` |
| `/inventory` | Inventory | `Inventory.Receive` |
| `/reports` | Reports | `Identity.User.View` |
| `/audit` | Audit log | `Identity.User.View` |

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
| `nurse@stfrancis.local` | Nurse |
| `reception@stfrancis.local` | Receptionist |
| `lab@stfrancis.local` | Lab Technician |
| `pharmacist@stfrancis.local` | Pharmacist |
| `storekeeper@stfrancis.local` | Storekeeper |
| `accountant@stfrancis.local` | Accountant |
| `cashier@stfrancis.local` | Cashier |
| `records@stfrancis.local` | Records Officer |
| `itsupport@stfrancis.local` | IT Support |

Password for all seeded users: `ChangeMe123!` — change before any real deployment.
