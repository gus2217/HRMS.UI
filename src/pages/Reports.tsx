import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { Loader2, BarChart3, TrendingUp, Boxes, FileCheck2, UserCog } from 'lucide-react'
import {
  reportApi,
  type DailyRegistrationsReport,
  type RevenueByServiceReport,
  type StockLevelReportDto,
  type ShaClaimStatusReport,
  type ClinicianWorkloadReport,
} from '@/lib/api'
import { formatMoney, formatNumber, daysAgoInputValue, todayInputValue } from '@/lib/format'
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts'

type Tab = 'registrations' | 'revenue' | 'stock' | 'sha' | 'workload'

const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: 'registrations', label: 'Registrations', icon: <TrendingUp size={14} /> },
  { id: 'revenue', label: 'Revenue by service', icon: <BarChart3 size={14} /> },
  { id: 'stock', label: 'Stock levels', icon: <Boxes size={14} /> },
  { id: 'sha', label: 'SHA claims', icon: <FileCheck2 size={14} /> },
  { id: 'workload', label: 'Clinician workload', icon: <UserCog size={14} /> },
]

const PIE_COLORS = ['#FFA500', '#38bdf8', '#a78bfa', '#34d399', '#f472b6', '#facc15']

export default function ReportsPage() {
  const [tab, setTab] = useState<Tab>('registrations')
  const [loading, setLoading] = useState(false)
  const [registrations, setRegistrations] = useState<DailyRegistrationsReport[]>([])
  const [revenue, setRevenue] = useState<RevenueByServiceReport[]>([])
  const [stock, setStock] = useState<StockLevelReportDto[]>([])
  const [sha, setSha] = useState<ShaClaimStatusReport[]>([])
  const [workload, setWorkload] = useState<ClinicianWorkloadReport[]>([])
  const [from, setFrom] = useState(daysAgoInputValue(30))
  const [to, setTo] = useState(todayInputValue())

  const load = async (t: Tab) => {
    setLoading(true)
    try {
      if (t === 'registrations') {
        setRegistrations(await reportApi.registrations(new Date(from).toISOString(), new Date(to).toISOString()))
      } else if (t === 'revenue') {
        setRevenue(await reportApi.revenueByService())
      } else if (t === 'stock') {
        setStock(await reportApi.stockLevels())
      } else if (t === 'sha') {
        setSha(await reportApi.shaClaims())
      } else if (t === 'workload') {
        setWorkload(await reportApi.clinicianWorkload())
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to load report')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load(tab)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab])

  return (
    <div className="p-5 lg:p-8 space-y-5">
      <div>
        <h1 className="text-xl font-bold text-white tracking-tight">Reports</h1>
        <p className="text-sm text-white/40 mt-0.5">Facility analytics</p>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm border transition-colors ${
              tab === t.id
                ? 'bg-[#FFA500]/10 text-[#FFA500] border-[#FFA500]/25'
                : 'bg-white/[0.03] text-white/50 border-white/[0.08] hover:text-white/80'
            }`}
          >
            {t.icon}
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'registrations' && (
        <div className="flex flex-wrap items-center gap-3">
          <label className="text-xs text-white/50">From
            <input type="date" className="input ml-2 w-auto" value={from} onChange={(e) => setFrom(e.target.value)} />
          </label>
          <label className="text-xs text-white/50">To
            <input type="date" className="input ml-2 w-auto" value={to} onChange={(e) => setTo(e.target.value)} />
          </label>
          <button className="btn-ghost" onClick={() => void load('registrations')}>Apply</button>
        </div>
      )}

      <div className="card p-5">
        {loading ? (
          <div className="flex items-center justify-center gap-3 py-20">
            <Loader2 size={20} className="animate-spin text-[#FFA500]" />
            <p className="text-sm text-white/40">Loading report…</p>
          </div>
        ) : (
          <>
            {tab === 'registrations' && (
              <ReportChart
                title="Daily patient registrations"
                render={
                  registrations.length === 0 ? (
                    <EmptyNote text="No registrations in the selected window." />
                  ) : (
                    <ResponsiveContainer width="100%" height={320}>
                      <BarChart data={registrations}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                        <XAxis dataKey="date" stroke="rgba(255,255,255,0.3)" tick={{ fontSize: 11 }} />
                        <YAxis stroke="rgba(255,255,255,0.3)" tick={{ fontSize: 11 }} allowDecimals={false} />
                        <Tooltip contentStyle={tooltipStyle} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
                        <Bar dataKey="registrations" fill="#FFA500" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  )
                }
              />
            )}

            {tab === 'revenue' && (
              <ReportChart
                title="Revenue by service"
                render={
                  revenue.length === 0 ? (
                    <EmptyNote text="No revenue data." />
                  ) : (
                    <ResponsiveContainer width="100%" height={320}>
                      <BarChart data={revenue} layout="vertical" margin={{ left: 30 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                        <XAxis type="number" stroke="rgba(255,255,255,0.3)" tick={{ fontSize: 11 }} />
                        <YAxis type="category" dataKey="description" stroke="rgba(255,255,255,0.3)" tick={{ fontSize: 11 }} width={160} />
                        <Tooltip contentStyle={tooltipStyle} formatter={(v) => formatMoney(Number(v))} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
                        <Bar dataKey="totalRevenue" fill="#38bdf8" radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  )
                }
              />
            )}

            {tab === 'stock' && (
              <div>
                <p className="text-sm font-semibold text-white mb-4">Current stock levels</p>
                <div className="overflow-x-auto">
                  <table className="table-base">
                    <thead>
                      <tr>
                        <th>Drug</th>
                        <th>Code</th>
                        <th className="text-right">On hand</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stock.map((s) => (
                        <tr key={s.drugId}>
                          <td className="font-medium text-white">{s.drugName}</td>
                          <td className="font-mono text-xs text-white/45">{s.drugCode}</td>
                          <td className="text-right font-semibold">{formatNumber(s.quantityOnHand)}</td>
                        </tr>
                      ))}
                      {stock.length === 0 && (
                        <tr><td colSpan={3} className="text-center py-10 text-white/35">No stock data.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {tab === 'sha' && (
              <ReportChart
                title="SHA claim status"
                render={
                  sha.length === 0 ? (
                    <EmptyNote text="No SHA claims yet." />
                  ) : (
                    <ResponsiveContainer width="100%" height={320}>
                      <PieChart>
                        <Pie data={sha} dataKey="claimCount" nameKey="status" cx="50%" cy="50%" outerRadius={110} label>
                          {sha.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                        </Pie>
                        <Tooltip contentStyle={tooltipStyle} />
                        <Legend formatter={(v) => <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12 }}>{v}</span>} />
                      </PieChart>
                    </ResponsiveContainer>
                  )
                }
              />
            )}

            {tab === 'workload' && (
              <ReportChart
                title="Consultations per clinician"
                render={
                  workload.length === 0 ? (
                    <EmptyNote text="No workload data." />
                  ) : (
                    <ResponsiveContainer width="100%" height={320}>
                      <BarChart data={workload}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                        <XAxis dataKey="clinicianUserId" stroke="rgba(255,255,255,0.3)" tick={{ fontSize: 10 }} />
                        <YAxis stroke="rgba(255,255,255,0.3)" tick={{ fontSize: 11 }} allowDecimals={false} />
                        <Tooltip contentStyle={tooltipStyle} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
                        <Bar dataKey="consultationCount" fill="#a78bfa" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  )
                }
              />
            )}
          </>
        )}
      </div>
    </div>
  )
}

const tooltipStyle = {
  background: '#0b1220',
  border: '1px solid rgba(255,255,255,0.12)',
  borderRadius: 8,
  fontSize: 12,
  color: 'rgba(255,255,255,0.9)',
}

function ReportChart({ title, render }: { title: string; render: React.ReactNode }) {
  return (
    <div>
      <p className="text-sm font-semibold text-white mb-4">{title}</p>
      {render}
    </div>
  )
}

function EmptyNote({ text }: { text: string }) {
  return <p className="text-sm text-white/35 text-center py-16">{text}</p>
}
