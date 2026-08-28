import { Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute';
import AppLayout from '@/features/layout/components/AppLayout';
import { PERMISSIONS } from '@/lib/permissions';
import type { ComponentType } from 'react';

export interface AppPages {
  LoginPage: ComponentType;
  DashboardPage: ComponentType;
  PatientsPage: ComponentType;
  Patient360Page: ComponentType;
  ConsultationsPage: ComponentType;
  PharmacyPage: ComponentType;
  LaboratoryPage: ComponentType;
  BillingPage: ComponentType;
  WardsPage: ComponentType;
  InventoryPage: ComponentType;
  ReportsPage: ComponentType;
  AuditPage: ComponentType;
}

const AppRoutes = ({ pages }: { pages: AppPages }) => (
  <Routes>
    <Route path="/login" element={<pages.LoginPage />} />
    <Route
      path="/"
      element={
        <ProtectedRoute>
          <AppLayout>
            <pages.DashboardPage />
          </AppLayout>
        </ProtectedRoute>
      }
    />
    <Route
      path="/patients"
      element={
        <ProtectedRoute permission={PERMISSIONS.PATIENT_VIEW}>
          <AppLayout>
            <pages.PatientsPage />
          </AppLayout>
        </ProtectedRoute>
      }
    />
    <Route
      path="/patients/:id"
      element={
        <ProtectedRoute permission={PERMISSIONS.PATIENT_VIEW}>
          <AppLayout>
            <pages.Patient360Page />
          </AppLayout>
        </ProtectedRoute>
      }
    />
    <Route
      path="/consultations"
      element={
        <ProtectedRoute permission={PERMISSIONS.CLINICAL_VIEW}>
          <AppLayout>
            <pages.ConsultationsPage />
          </AppLayout>
        </ProtectedRoute>
      }
    />
    <Route
      path="/pharmacy"
      element={
        <ProtectedRoute permission={PERMISSIONS.PHARMACY_DISPENSE}>
          <AppLayout>
            <pages.PharmacyPage />
          </AppLayout>
        </ProtectedRoute>
      }
    />
    <Route
      path="/lab"
      element={
        <ProtectedRoute permission={PERMISSIONS.LABORATORY_ORDER}>
          <AppLayout>
            <pages.LaboratoryPage />
          </AppLayout>
        </ProtectedRoute>
      }
    />
    <Route
      path="/billing"
      element={
        <ProtectedRoute permission={PERMISSIONS.BILLING_VIEW}>
          <AppLayout>
            <pages.BillingPage />
          </AppLayout>
        </ProtectedRoute>
      }
    />
    <Route
      path="/wards"
      element={
        <ProtectedRoute permission={PERMISSIONS.CLINICAL_VIEW}>
          <AppLayout>
            <pages.WardsPage />
          </AppLayout>
        </ProtectedRoute>
      }
    />
    <Route
      path="/inventory"
      element={
        <ProtectedRoute permission={PERMISSIONS.INVENTORY_RECEIVE}>
          <AppLayout>
            <pages.InventoryPage />
          </AppLayout>
        </ProtectedRoute>
      }
    />
    <Route
      path="/reports"
      element={
        <ProtectedRoute>
          <AppLayout>
            <pages.ReportsPage />
          </AppLayout>
        </ProtectedRoute>
      }
    />
    <Route
      path="/audit"
      element={
        <ProtectedRoute>
          <AppLayout>
            <pages.AuditPage />
          </AppLayout>
        </ProtectedRoute>
      }
    />
    <Route path="*" element={<Navigate to="/" replace />} />
  </Routes>
);

export default AppRoutes;
