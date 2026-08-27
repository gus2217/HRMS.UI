import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import {
  Users,
  BedDouble,
  Banknote,
  FlaskConical,
  AlertTriangle,
  ArrowRight,
  Loader2,
} from 'lucide-react'
import { reportApi, inventoryApi, type FacilityDashboardSummary } from '@/lib/api'
import { formatMoney, formatNumber } from '@/lib/format'

interface Stat {
  label: string
  value: string
  icon: React.ReactNode
  accent: string
}

export default function DashboardPage() {
  const [stats, setStats] = useState<Stat[]>([])
  const [loading, setLoading] = useState(true)
  const [lowStock, setLowStock] = useState<{ drugCode: string; drugName: string; quantityOnHand: number; reorderLevel: number }[]>([])

  useEffect(() => {
    let mounted = true
    const load = async () => {
      try {
        const [summary, low] = await Promise.all([
          reportApi.dashboard(),
          inventoryApi.lowStock().catch(() => [] as never[]),
        ])
        if (!mounted) return
        setStats(buildStats(summary))
        setLowStock(low as typeof lowStock)
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Failed to load dashboard')
      } finally {
        if (mounted) setLoading(false)
      }
    }
    void load()
    return () => {
      mounted = false
    }
  }, [])

  if (loading) {
    return (
      <div className="min-h-full flex flex-col items-center justify-center gap-3">
        <Loader2 size={24} className="animate-spin text-[#FFA500]" />
        <p className="text-white/40 text-sm">Loading dashboard…</p>
      </div>
    )
  }

  return (
    <div className="p-5 lg:p-8 space-y-6">
      <div>
        <h1 className="text-xl font-bold text-white tracking-tight">Facility Overview</h1>
        <p className="text-sm text-white/40 mt-0.5">St. Francis Hospital — live operational summary</p>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s) => (
          <div key={s.label} className="card p-4">
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center mb-3 ${s.accent}`}>
              {s.icon}
            </div>
            <p className="text-2xl font-bold text-white">{s.value}</p>
            <p className="text-xs text-white/40 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Quick actions */}
        <div className="card p-5 lg:col-span-1">
          <h2 className="text-sm font-semibold text-white mb-4">Quick actions</h2>
          <div className="space-y-2">
            <QuickLink to="/patients" label="Register / find patient" />
            <QuickLink to="/consultations" label="Start a consultation" />
            <QuickLink to="/pharmacy" label="Dispense prescription" />
            <QuickLink to="/lab" label="Order lab tests" />
            <QuickLink to="/billing" label="Issue invoice / record payment" />
            <QuickLink to="/wards" label="Admissions & ward occupancy" />
          </div>
        </div>

        {/* Low stock alerts */}
        <div className="card p-5 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-white">Low stock alerts</h2>
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-[#FFA500] bg-[#FFA500]/10 border border-[#FFA500]/20 rounded-full px-2.5 py-1">
              <AlertTriangle size={12} />
              {lowStock.length} item{lowStock.length === 1 ? '' : 's'}
            </span>
          </div>
          {lowStock.length === 0 ? (
            <p className="text-sm text-white/35 py-6 text-center">All stock levels are healthy.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="table-base">
                <thead>
                  <tr>
                    <th>Drug</th>
                    <th className="text-right">On hand</th>
                    <th className="text-right">Reorder level</th>
                  </tr>
                </thead>
                <tbody>
                  {lowStock.slice(0, 6).map((d) => (
                    <tr key={d.drugCode}>
                      <td>
                        <p className="font-medium text-white">{d.drugName}</p>
                        <p className="text-xs text-white/35">{d.drugCode}</p>
                      </td>
                      <td className="text-right font-semibold text-[#FFA500]">{formatNumber(d.quantityOnHand)}</td>
                      <td className="text-right text-white/60">{formatNumber(d.reorderLevel)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <div className="mt-4">
            <Link
              to="/inventory"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-[#FFA500] hover:text-[#ffb32e]"
            >
              Manage inventory <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

function buildStats(summary: FacilityDashboardSummary): Stat[] {
  return [
    {
      label: 'Total patients',
      value: formatNumber(summary.totalPatients),
      icon: <Users size={17} />,
      accent: 'bg-sky-500/15 text-sky-400 border border-sky-500/20',
    },
    {
      label: 'Open admissions',
      value: formatNumber(summary.openAdmissions),
      icon: <BedDouble size={17} />,
      accent: 'bg-violet-500/15 text-violet-400 border border-violet-500/20',
    },
    {
      label: 'Revenue (paid)',
      value: formatMoney(summary.totalRevenue),
      icon: <Banknote size={17} />,
      accent: 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20',
    },
    {
      label: 'Pending lab orders',
      value: formatNumber(summary.pendingLabOrders),
      icon: <FlaskConical size={17} />,
      accent: 'bg-[#FFA500]/15 text-[#FFA500] border border-[#FFA500]/20',
    },
  ]
}

function QuickLink({ to, label }: { to: string; label: string }) {
  return (
    <Link
      to={to}
      className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg text-sm text-white/70 hover:text-white hover:bg-white/[0.05] border border-transparent hover:border-white/[0.08] transition-colors group"
    >
      {label}
      <ArrowRight size={14} className="text-white/25 group-hover:text-[#FFA500] transition-colors" />
    </Link>
  )
}
