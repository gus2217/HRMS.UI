import { lazy, Suspense } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { AppLayout } from '@/components/layout/AppLayout'
import { RequireAuth } from '@/components/auth/RequireAuth'
import { PERMISSIONS } from '@/lib/permissions'

// Route-level code splitting — each module loads on demand.
const LoginPage = lazy(() => import('@/pages/Login'))
const DashboardPage = lazy(() => import('@/pages/Dashboard'))
const PatientsPage = lazy(() => import('@/pages/Patients'))
const Patient360Page = lazy(() => import('@/pages/Patient360'))
const ConsultationsPage = lazy(() => import('@/pages/Consultations'))
const PharmacyPage = lazy(() => import('@/pages/Pharmacy'))
const LabPage = lazy(() => import('@/pages/Lab'))
const BillingPage = lazy(() => import('@/pages/Billing'))
const WardsPage = lazy(() => import('@/pages/Wards'))
const InventoryPage = lazy(() => import('@/pages/Inventory'))
const ReportsPage = lazy(() => import('@/pages/Reports'))
const AuditPage = lazy(() => import('@/pages/Audit'))

function PageFallback() {
  return (
    <div className="min-h-full flex flex-col items-center justify-center gap-3">
      <div className="w-7 h-7 border-2 border-white/10 border-t-[#FFA500] rounded-full animate-spin" />
      <p className="text-white/40 text-sm">Loading…</p>
    </div>
  )
}

function withLayout(page: React.ReactNode) {
  return (
    <AppLayout>
      <Suspense fallback={<PageFallback />}>{page}</Suspense>
    </AppLayout>
  )
}

export default function App() {
  return (
    <>
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: '#0b1220',
            color: 'rgba(255,255,255,0.9)',
            border: '1px solid rgba(255,255,255,0.08)',
            fontSize: '0.85rem',
          },
        }}
      />
      <Suspense fallback={<PageFallback />}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route
            path="/"
            element={
              <RequireAuth>
                {withLayout(<DashboardPage />)}
              </RequireAuth>
            }
          />
          <Route
            path="/patients"
            element={
              <RequireAuth permission={PERMISSIONS.PATIENT_VIEW}>
                {withLayout(<PatientsPage />)}
              </RequireAuth>
            }
          />
          <Route
            path="/patients/:id"
            element={
              <RequireAuth permission={PERMISSIONS.PATIENT_VIEW}>
                {withLayout(<Patient360Page />)}
              </RequireAuth>
            }
          />
          <Route
            path="/consultations"
            element={
              <RequireAuth permission={PERMISSIONS.CLINICAL_VIEW}>
                {withLayout(<ConsultationsPage />)}
              </RequireAuth>
            }
          />
          <Route
            path="/pharmacy"
            element={
              <RequireAuth permission={PERMISSIONS.PHARMACY_DISPENSE}>
                {withLayout(<PharmacyPage />)}
              </RequireAuth>
            }
          />
          <Route
            path="/lab"
            element={
              <RequireAuth permission={PERMISSIONS.LABORATORY_ORDER}>
                {withLayout(<LabPage />)}
              </RequireAuth>
            }
          />
          <Route
            path="/billing"
            element={
              <RequireAuth permission={PERMISSIONS.BILLING_VIEW}>
                {withLayout(<BillingPage />)}
              </RequireAuth>
            }
          />
          <Route
            path="/wards"
            element={
              <RequireAuth permission={PERMISSIONS.CLINICAL_VIEW}>
                {withLayout(<WardsPage />)}
              </RequireAuth>
            }
          />
          <Route
            path="/inventory"
            element={
              <RequireAuth permission={PERMISSIONS.INVENTORY_RECEIVE}>
                {withLayout(<InventoryPage />)}
              </RequireAuth>
            }
          />
          <Route
            path="/reports"
            element={
              <RequireAuth>
                {withLayout(<ReportsPage />)}
              </RequireAuth>
            }
          />
          <Route
            path="/audit"
            element={
              <RequireAuth>
                {withLayout(<AuditPage />)}
              </RequireAuth>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </>
  )
}
