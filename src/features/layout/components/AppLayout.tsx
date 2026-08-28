// ============================================================
// AppLayout.tsx
// Location: src/features/layout/components/AppLayout.tsx
//
// Application shell: sidebar navigation (permission-filtered),
// mobile header, and content area. Mirrors the Nivela admin shell
// pattern (sidebar + header + main) with a light theme.
//
// RBAC: nav items carry backend-mirroring permissions. The dashboard
// endpoint requires Identity.User.View on the backend, so the
// Dashboard item uses that permission — not an invented "Dashboard.*".
// Reports appears only when the user holds at least one report
// permission. Audit is Identity.User.View only.
// ============================================================

import { useState, type ReactNode } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  Stethoscope,
  Pill,
  FlaskConical,
  Receipt,
  BedDouble,
  Boxes,
  BarChart3,
  ScrollText,
  LogOut,
  Menu,
  X,
  Hospital,
} from 'lucide-react';
import { useAuth } from '@/features/auth/components/AuthContext';
import { hasAnyPermission, hasPermission, PERMISSIONS, REPORT_PERMISSIONS, type Permission } from '@/lib/permissions';
import { initials } from '@/lib/format';

interface NavItem {
  to: string;
  label: string;
  icon: ReactNode;
  permission?: Permission | Permission[];
  end?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { to: '/', label: 'Dashboard', icon: <LayoutDashboard size={17} />, permission: PERMISSIONS.IDENTITY_USER_VIEW, end: true },
  { to: '/patients', label: 'Patients', icon: <Users size={17} />, permission: PERMISSIONS.PATIENT_VIEW },
  { to: '/consultations', label: 'Consultations', icon: <Stethoscope size={17} />, permission: PERMISSIONS.CLINICAL_VIEW },
  { to: '/pharmacy', label: 'Pharmacy', icon: <Pill size={17} />, permission: PERMISSIONS.PHARMACY_DISPENSE },
  { to: '/lab', label: 'Laboratory', icon: <FlaskConical size={17} />, permission: PERMISSIONS.LABORATORY_ORDER },
  { to: '/billing', label: 'Billing', icon: <Receipt size={17} />, permission: PERMISSIONS.BILLING_VIEW },
  { to: '/wards', label: 'Wards', icon: <BedDouble size={17} />, permission: PERMISSIONS.CLINICAL_VIEW },
  { to: '/inventory', label: 'Inventory', icon: <Boxes size={17} />, permission: PERMISSIONS.INVENTORY_RECEIVE },
  { to: '/reports', label: 'Reports', icon: <BarChart3 size={17} />, permission: REPORT_PERMISSIONS },
  { to: '/audit', label: 'Audit Log', icon: <ScrollText size={17} />, permission: PERMISSIONS.IDENTITY_USER_VIEW },
];

function itemVisible(item: NavItem, permissions: Set<Permission>): boolean {
  if (!item.permission) return true;
  return Array.isArray(item.permission)
    ? hasAnyPermission(permissions, item.permission)
    : hasPermission(permissions, item.permission);
}

export default function AppLayout({ children }: { children: ReactNode }) {
  const { user, permissions, logout } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const visible = NAV_ITEMS.filter((item) => itemVisible(item, permissions));

  const handleLogout = async () => {
    logout();
    navigate('/login', { replace: true });
  };

  const sidebar = (
    <div className="flex flex-col h-full">
      {/* Brand */}
      <div className="flex items-center justify-between px-5 py-5 border-b border-slate-200 flex-shrink-0">
        <div className="flex items-center gap-2.5">
          <span className="w-8 h-8 rounded-lg bg-indigo-600/10 border border-indigo-600/20 flex items-center justify-center text-indigo-600">
            <Hospital size={17} />
          </span>
          <div>
            <p className="text-sm font-bold text-slate-900 tracking-tight">Jacana HRMS</p>
            <p className="text-[11px] text-slate-400">St. Francis Hospital</p>
          </div>
        </div>
        <button className="lg:hidden text-slate-400" onClick={() => setSidebarOpen(false)} aria-label="Close menu">
          <X size={18} />
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        {visible.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            onClick={() => setSidebarOpen(false)}
            className={({ isActive }) =>
              `w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-150 ${
                isActive
                  ? 'bg-indigo-600/10 text-indigo-700 font-semibold'
                  : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
              }`
            }
          >
            <span className="flex-shrink-0">{item.icon}</span>
            <span className="truncate">{item.label}</span>
          </NavLink>
        ))}
      </nav>

      {/* User */}
      <div className="border-t border-slate-200 p-4 flex-shrink-0">
        <div className="flex items-center gap-3 mb-3">
          <span className="w-9 h-9 rounded-full bg-indigo-600/15 text-indigo-700 flex items-center justify-center text-xs font-bold">
            {initials(user?.fullName)}
          </span>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-slate-900 truncate">{user?.fullName}</p>
            <p className="text-[11px] text-slate-400 truncate">{user?.roles.join(', ')}</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors"
        >
          <LogOut size={16} />
          Sign out
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          aria-hidden="true"
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-30 lg:hidden"
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed lg:static inset-y-0 left-0 z-40 w-64 bg-white border-r border-slate-200 flex flex-col transform transition-transform duration-300 ease-in-out ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {sidebar}
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile header */}
        <header className="flex items-center gap-3 px-5 py-4 border-b border-slate-200 bg-white lg:hidden flex-shrink-0">
          <button onClick={() => setSidebarOpen(true)} className="text-slate-500" aria-label="Open menu">
            <Menu size={20} />
          </button>
          <p className="text-sm font-bold text-slate-900">Jacana HRMS</p>
        </header>

        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
