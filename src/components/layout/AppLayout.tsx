import { useState, type ReactNode } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
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
} from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { hasPermission, PERMISSIONS, type Permission } from '@/lib/permissions'
import { initials } from '@/lib/format'

interface NavItem {
  to: string
  label: string
  icon: ReactNode
  permission?: Permission
  end?: boolean
}

const NAV_ITEMS: NavItem[] = [
  { to: '/', label: 'Dashboard', icon: <LayoutDashboard size={17} />, end: true },
  { to: '/patients', label: 'Patients', icon: <Users size={17} />, permission: PERMISSIONS.PATIENT_VIEW },
  { to: '/consultations', label: 'Consultations', icon: <Stethoscope size={17} />, permission: PERMISSIONS.CLINICAL_VIEW },
  { to: '/pharmacy', label: 'Pharmacy', icon: <Pill size={17} />, permission: PERMISSIONS.PHARMACY_DISPENSE },
  { to: '/lab', label: 'Laboratory', icon: <FlaskConical size={17} />, permission: PERMISSIONS.LABORATORY_ORDER },
  { to: '/billing', label: 'Billing', icon: <Receipt size={17} />, permission: PERMISSIONS.BILLING_VIEW },
  { to: '/wards', label: 'Wards', icon: <BedDouble size={17} />, permission: PERMISSIONS.CLINICAL_VIEW },
  { to: '/inventory', label: 'Inventory', icon: <Boxes size={17} />, permission: PERMISSIONS.INVENTORY_RECEIVE },
  { to: '/reports', label: 'Reports', icon: <BarChart3 size={17} /> },
  { to: '/audit', label: 'Audit Log', icon: <ScrollText size={17} /> },
]

export function AppLayout({ children }: { children: ReactNode }) {
  const user = useAuthStore((s) => s.user)
  const permissions = useAuthStore((s) => s.permissions)
  const logout = useAuthStore((s) => s.logout)
  const navigate = useNavigate()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const visible = NAV_ITEMS.filter((item) => !item.permission || hasPermission(permissions, item.permission))

  const handleLogout = async () => {
    await logout()
    navigate('/login', { replace: true })
  }

  const sidebar = (
    <div className="flex flex-col h-full">
      {/* Brand */}
      <div className="flex items-center justify-between px-5 py-5 border-b border-white/[0.06] flex-shrink-0">
        <div className="flex items-center gap-2.5">
          <span className="w-8 h-8 rounded-lg bg-[#FFA500]/10 border border-[#FFA500]/20 flex items-center justify-center text-[#FFA500]">
            <Hospital size={17} />
          </span>
          <div>
            <p className="text-sm font-semibold text-white tracking-tight">Jacana HRMS</p>
            <p className="text-[11px] text-white/35">St. Francis Hospital</p>
          </div>
        </div>
        <button className="lg:hidden text-white/50" onClick={() => setSidebarOpen(false)} aria-label="Close menu">
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
              `w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-150 border ${
                isActive
                  ? 'bg-[#FFA500]/10 text-[#FFA500] border-[#FFA500]/20'
                  : 'text-white/40 hover:text-white/80 hover:bg-white/[0.05] border-transparent'
              }`
            }
          >
            <span className={`flex-shrink-0 ${'text-inherit'}`}>{item.icon}</span>
            <span className="truncate">{item.label}</span>
          </NavLink>
        ))}
      </nav>

      {/* User */}
      <div className="border-t border-white/[0.06] p-4 flex-shrink-0">
        <div className="flex items-center gap-3 mb-3">
          <span className="w-9 h-9 rounded-full bg-[#FFA500]/15 text-[#FFA500] flex items-center justify-center text-xs font-bold">
            {initials(user?.fullName)}
          </span>
          <div className="min-w-0">
            <p className="text-sm font-medium text-white truncate">{user?.fullName}</p>
            <p className="text-[11px] text-white/35 truncate">{user?.roles.join(', ')}</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-white/40 hover:text-white hover:bg-white/[0.05] transition-colors"
        >
          <LogOut size={16} />
          Sign out
        </button>
      </div>
    </div>
  )

  return (
    <div className="flex h-screen bg-[#040911] text-white overflow-hidden">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          aria-hidden="true"
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-30 lg:hidden"
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed lg:static inset-y-0 left-0 z-40 w-64 bg-[#040911] border-r border-white/[0.06] flex flex-col transform transition-transform duration-300 ease-in-out ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {sidebar}
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile header */}
        <header className="flex items-center gap-3 px-5 py-4 border-b border-white/[0.06] lg:hidden flex-shrink-0">
          <button onClick={() => setSidebarOpen(true)} className="text-white/60" aria-label="Open menu">
            <Menu size={20} />
          </button>
          <p className="text-sm font-semibold text-white">Jacana HRMS</p>
        </header>

        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  )
}

export { Link }
