import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Users, BedDouble, Banknote, FlaskConical, AlertTriangle, ArrowRight, Loader2 } from 'lucide-react';
import { DashboardService } from '../services/dashboardService';
import { formatMoney, formatNumber } from '@/lib/format';
import { useAuth } from '@/features/auth/components/AuthContext';
import { hasPermission, PERMISSIONS } from '@/lib/permissions';

interface Stat {
  label: string;
  value: string;
  icon: React.ReactNode;
  accent: string;
}

export default function DashboardPage() {
  const { permissions } = useAuth();
  const [stats, setStats] = useState<Stat[]>([]);
  const [lowStock, setLowStock] = useState<{ drugCode: string; drugName: string; quantityOnHand: number; reorderLevel: number }[]>([]);
  const [loading, setLoading] = useState(true);

  const canViewStock = hasPermission(permissions, PERMISSIONS.INVENTORY_RECEIVE);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const [summary, low] = await Promise.all([
          DashboardService.getSummary(),
          canViewStock ? DashboardService.getLowStock().catch(() => []) : Promise.resolve([]),
        ]);
        if (!mounted) return;
        setStats(buildStats(summary));
        setLowStock(low as typeof lowStock);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Failed to load dashboard');
      } finally {
        if (mounted) setLoading(false);
      }
    };
    void load();
    return () => {
      mounted = false;
    };
  }, [canViewStock]);

  if (loading) {
    return (
      <div className="min-h-full flex flex-col items-center justify-center gap-3">
        <Loader2 size={24} className="animate-spin text-indigo-600" />
        <p className="text-slate-400 text-sm">Loading dashboard…</p>
      </div>
    );
  }

  return (
    <div className="p-5 lg:p-8 space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900 tracking-tight">Facility Overview</h1>
        <p className="text-sm text-slate-500 mt-0.5">St. Francis Hospital — live operational summary</p>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s) => (
          <div key={s.label} className="card p-4">
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center mb-3 ${s.accent}`}>{s.icon}</div>
            <p className="text-2xl font-bold text-slate-900">{s.value}</p>
            <p className="text-xs text-slate-500 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Quick actions */}
        <div className="card p-5 lg:col-span-1">
          <h2 className="text-sm font-semibold text-slate-900 mb-4">Quick actions</h2>
          <div className="space-y-2">
            {hasPermission(permissions, PERMISSIONS.PATIENT_VIEW) && <QuickLink to="/patients" label="Register / find patient" />}
            {hasPermission(permissions, PERMISSIONS.CLINICAL_VIEW) && <QuickLink to="/consultations" label="Start a consultation" />}
            {hasPermission(permissions, PERMISSIONS.PHARMACY_DISPENSE) && <QuickLink to="/pharmacy" label="Dispense prescription" />}
            {hasPermission(permissions, PERMISSIONS.LABORATORY_ORDER) && <QuickLink to="/lab" label="Order lab tests" />}
            {hasPermission(permissions, PERMISSIONS.BILLING_VIEW) && <QuickLink to="/billing" label="Issue invoice / record payment" />}
            {hasPermission(permissions, PERMISSIONS.CLINICAL_VIEW) && <QuickLink to="/wards" label="Admissions & ward occupancy" />}
          </div>
        </div>

        {/* Low stock alerts */}
        {canViewStock && (
          <div className="card p-5 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-slate-900">Low stock alerts</h2>
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-2.5 py-1">
              <AlertTriangle size={12} />
              {lowStock.length} item{lowStock.length === 1 ? '' : 's'}
            </span>
          </div>
          {lowStock.length === 0 ? (
            <p className="text-sm text-slate-400 py-6 text-center">All stock levels are healthy.</p>
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
                        <p className="font-medium text-slate-900">{d.drugName}</p>
                        <p className="text-xs text-slate-400">{d.drugCode}</p>
                      </td>
                      <td className="text-right font-semibold text-amber-600">{formatNumber(d.quantityOnHand)}</td>
                      <td className="text-right text-slate-500">{formatNumber(d.reorderLevel)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <div className="mt-4">
            <Link to="/inventory" className="inline-flex items-center gap-1.5 text-sm font-medium text-indigo-600 hover:text-indigo-700">
              Manage inventory <ArrowRight size={14} />
            </Link>
          </div>
        </div>
        )}
      </div>
    </div>
  );
}

function buildStats(summary: { totalPatients: number; openAdmissions: number; totalRevenue: number; pendingLabOrders: number }): Stat[] {
  return [
    {
      label: 'Total patients',
      value: formatNumber(summary.totalPatients),
      icon: <Users size={17} />,
      accent: 'bg-sky-100 text-sky-600',
    },
    {
      label: 'Open admissions',
      value: formatNumber(summary.openAdmissions),
      icon: <BedDouble size={17} />,
      accent: 'bg-violet-100 text-violet-600',
    },
    {
      label: 'Revenue (paid)',
      value: formatMoney(summary.totalRevenue),
      icon: <Banknote size={17} />,
      accent: 'bg-emerald-100 text-emerald-600',
    },
    {
      label: 'Pending lab orders',
      value: formatNumber(summary.pendingLabOrders),
      icon: <FlaskConical size={17} />,
      accent: 'bg-indigo-100 text-indigo-600',
    },
  ];
}

function QuickLink({ to, label }: { to: string; label: string }) {
  return (
    <Link
      to={to}
      className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg text-sm text-slate-600 hover:text-slate-900 hover:bg-slate-50 border border-transparent hover:border-slate-200 transition-colors group"
    >
      {label}
      <ArrowRight size={14} className="text-slate-300 group-hover:text-indigo-600 transition-colors" />
    </Link>
  );
}
