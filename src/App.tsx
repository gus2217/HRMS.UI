import { lazy, Suspense } from 'react';
import { Toaster } from 'react-hot-toast';
import AppRoutes from './routes';

// Route-level code splitting — each feature page loads on demand.
const LoginPage = lazy(() => import('./features/auth/pages/LoginPage'));
const DashboardPage = lazy(() => import('./features/dashboard/pages/DashboardPage'));
const PatientsPage = lazy(() => import('./features/patients/pages/PatientsPage'));
const Patient360Page = lazy(() => import('./features/patients/pages/Patient360Page'));
const ConsultationsPage = lazy(() => import('./features/consultations/pages/ConsultationsPage'));
const PharmacyPage = lazy(() => import('./features/pharmacy/pages/PharmacyPage'));
const LaboratoryPage = lazy(() => import('./features/laboratory/pages/LaboratoryPage'));
const BillingPage = lazy(() => import('./features/billing/pages/BillingPage'));
const WardsPage = lazy(() => import('./features/inpatient/pages/WardsPage'));
const InventoryPage = lazy(() => import('./features/inventory/pages/InventoryPage'));
const ReportsPage = lazy(() => import('./features/reports/pages/ReportsPage'));
const AuditPage = lazy(() => import('./features/audit/pages/AuditPage'));

function PageFallback() {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center gap-3">
      <div className="w-7 h-7 border-2 border-slate-200 border-t-indigo-500 rounded-full animate-spin" />
      <p className="text-slate-400 text-sm">Loading…</p>
    </div>
  );
}

export default function App() {
  return (
    <>
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: '#ffffff',
            color: '#0f172a',
            border: '1px solid #e2e8f0',
            fontSize: '0.85rem',
          },
        }}
      />
      <Suspense fallback={<PageFallback />}>
        <AppRoutes
          pages={{
            LoginPage,
            DashboardPage,
            PatientsPage,
            Patient360Page,
            ConsultationsPage,
            PharmacyPage,
            LaboratoryPage,
            BillingPage,
            WardsPage,
            InventoryPage,
            ReportsPage,
            AuditPage,
          }}
        />
      </Suspense>
    </>
  );
}
