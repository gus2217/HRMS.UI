import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Loader2, FlaskConical, TestTube2, Inbox } from 'lucide-react';
import { LaboratoryService } from '../services/laboratoryService';
import { ConsultationService } from '@/features/consultations/services/consultationService';
import { PatientService } from '@/features/patients/services/patientService';
import type { LabOrderDetail, LabOrderListItem } from '../types/laboratory';
import type { PatientSummary } from '@/features/patients/types/patient';
import { formatDateTime } from '@/lib/format';
import { useAuth } from '@/features/auth/components/AuthContext';
import { hasPermission, PERMISSIONS } from '@/lib/permissions';

interface LabRow extends LabOrderListItem {
  detail?: LabOrderDetail;
}

const STATUS_STYLES: Record<string, string> = {
  Pending: 'bg-amber-100 text-amber-700',
  InProgress: 'bg-sky-100 text-sky-700',
  PartiallyCompleted: 'bg-violet-100 text-violet-700',
  Completed: 'bg-emerald-100 text-emerald-700',
  Cancelled: 'bg-red-100 text-red-700',
};

export default function LaboratoryPage() {
  const { permissions } = useAuth();
  const [orders, setOrders] = useState<LabRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [active, setActive] = useState<LabRow | null>(null);
  const [activeLoading, setActiveLoading] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<PatientSummary[]>([]);
  const [selected, setSelected] = useState<PatientSummary | null>(null);
  const [consultationId, setConsultationId] = useState<string | null>(null);
  const [resolving, setResolving] = useState(false);
  const [tests, setTests] = useState([{ testCode: '', testName: '' }]);
  const [saving, setSaving] = useState(false);

  const canOrder = hasPermission(permissions, PERMISSIONS.LABORATORY_ORDER);
  const canRecordResult = hasPermission(permissions, PERMISSIONS.LABORATORY_RECORD_RESULT);

  const load = async (pageNumber: number) => {
    setLoading(true);
    try {
      const res = await LaboratoryService.list(pageNumber, 20);
      setOrders(res.items);
      setTotal(res.totalCount);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to load lab orders');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load(page);
  }, [page]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (!query.trim()) {
        setResults([]);
        return;
      }
      PatientService.search(query.trim(), 1, 6)
        .then((res) => setResults(res.items))
        .catch(() => setResults([]));
    }, 350);
    return () => clearTimeout(timer);
  }, [query]);

  // Resolve the patient's latest active consultation for the order context.
  useEffect(() => {
    if (!selected) {
      setConsultationId(null);
      return;
    }
    let mounted = true;
    setResolving(true);
    ConsultationService.history(selected.id)
      .then((history) => {
        if (!mounted) return;
        const active = history.consultations.find((c) => c.status !== 'Completed');
        const latest = active ?? history.consultations[0] ?? null;
        setConsultationId(latest?.id ?? null);
      })
      .catch(() => {
        if (mounted) setConsultationId(null);
      })
      .finally(() => {
        if (mounted) setResolving(false);
      });
    return () => {
      mounted = false;
    };
  }, [selected]);

  const open = async (o: LabRow) => {
    setActiveLoading(true);
    setActive(o);
    try {
      const detail = await LaboratoryService.detail(o.id);
      setActive({ ...o, detail });
    } catch {
      setActive({ ...o, detail: undefined });
    } finally {
      setActiveLoading(false);
    }
  };

  const setTest = (index: number, patch: Partial<(typeof tests)[number]>) =>
    setTests((ts) => ts.map((t, i) => (i === index ? { ...t, ...patch } : t)));

  const createOrder = async () => {
    if (!selected) {
      toast.error('Select a patient first.');
      return;
    }
    if (!consultationId) {
      toast.error('This patient has no consultation yet — start one from Consultations first.');
      return;
    }
    const valid = tests.filter((t) => t.testCode.trim() && t.testName.trim());
    if (valid.length === 0) {
      toast.error('Add at least one test.');
      return;
    }
    setSaving(true);
    try {
      const res = await LaboratoryService.createOrder({
        patientId: selected.id,
        consultationId,
        tests: valid.map((t) => ({ testCode: t.testCode.trim(), testName: t.testName.trim() })),
      });
      toast.success('Lab order created');
      setShowCreate(false);
      setActive({ ...res, patientName: selected.fullName, patientNumber: selected.patientNumber, testCount: res.tests.length, detail: res });
      setQuery('');
      setSelected(null);
      setTests([{ testCode: '', testName: '' }]);
      void load(page);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create order');
    } finally {
      setSaving(false);
    }
  };

  const recordResult = async (testItemId: string, input: { resultValue: string; resultUnit?: string; isAbnormal?: boolean }) => {
    if (!active?.detail) return;
    try {
      const updated = await LaboratoryService.recordResult(active.detail.id, { testItemId, ...input });
      setActive((prev) => (prev ? { ...prev, detail: updated } : prev));
      void load(page);
      toast.success('Result recorded');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to record result');
    }
  };

  const cancelOrder = async () => {
    if (!active?.detail) return;
    if (!window.confirm('Cancel this lab order? Results cannot be recorded afterwards.')) return;
    try {
      const updated = await LaboratoryService.cancelOrder(active.detail.id, 'Cancelled by clinician');
      setActive((prev) => (prev ? { ...prev, detail: updated } : prev));
      void load(page);
      toast.success('Lab order cancelled');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to cancel order');
    }
  };

  return (
    <div className="p-5 lg:p-8 space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Laboratory</h1>
          <p className="text-sm text-slate-500 mt-0.5">{total.toLocaleString()} lab orders</p>
        </div>
        {canOrder && (
          <button className="btn-primary" onClick={() => setShowCreate(true)}>
            <TestTube2 size={16} />
            New lab order
          </button>
        )}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="card overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200">
            <h2 className="text-sm font-semibold text-slate-900">Lab orders</h2>
          </div>
          {loading ? (
            <div className="flex items-center justify-center gap-3 py-14">
              <Loader2 size={20} className="animate-spin text-indigo-600" />
              <p className="text-sm text-slate-400">Loading…</p>
            </div>
          ) : orders.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
              <Inbox size={28} className="text-slate-300" />
              <p className="text-sm text-slate-400 max-w-xs">No lab orders yet.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="table-base">
                <thead>
                  <tr>
                    <th>Patient</th>
                    <th>Status</th>
                    <th>Ordered</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((o) => (
                    <tr key={o.id} className="cursor-pointer" onClick={() => void open(o)}>
                      <td>
                        <p className="font-medium text-slate-900">{o.patientName}</p>
                        <p className="font-mono text-xs text-indigo-600">{o.patientNumber}</p>
                      </td>
                      <td>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_STYLES[o.status] ?? 'bg-slate-100 text-slate-600'}`}>
                          {o.status}
                        </span>
                      </td>
                      <td className="text-slate-500 text-xs">{formatDateTime(o.orderedAtUtc)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {total > 20 && (
            <div className="flex items-center justify-between px-5 py-3 border-t border-slate-200 text-sm">
              <p className="text-slate-500">Page {page} of {Math.max(1, Math.ceil(total / 20))}</p>
              <div className="flex gap-2">
                <button className="btn-ghost text-xs" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Previous</button>
                <button className="btn-ghost text-xs" disabled={page >= Math.ceil(total / 20)} onClick={() => setPage((p) => p + 1)}>Next</button>
              </div>
            </div>
          )}
        </div>

        <div className="card p-5 min-h-[300px]">
          <h2 className="text-sm font-semibold text-slate-900 mb-4 flex items-center gap-2">
            <FlaskConical size={15} className="text-indigo-600" /> Order details
          </h2>
          {activeLoading ? (
            <div className="flex items-center justify-center gap-3 py-16">
              <Loader2 size={20} className="animate-spin text-indigo-600" />
              <p className="text-sm text-slate-400">Loading…</p>
            </div>
          ) : active && active.detail ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-900">{active.patientName}</p>
                  <p className="text-xs text-slate-400">Ordered {formatDateTime(active.detail.orderedAtUtc)}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs px-2.5 py-1 rounded-full ${STATUS_STYLES[active.detail.status] ?? 'bg-slate-100 text-slate-600'}`}>
                    {active.detail.status}
                  </span>
                  {canOrder && active.detail.status !== 'Completed' && active.detail.status !== 'Cancelled' && (
                    <button
                      className="text-xs text-red-600 border border-red-200 rounded-lg px-2 py-1 hover:bg-red-50 transition-colors"
                      onClick={() => void cancelOrder()}
                    >
                      Cancel order
                    </button>
                  )}
                </div>
              </div>
              <div className="space-y-2">
                {active.detail.tests.map((t) => (
                  <div key={t.id} className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-sm">
                    <div className="flex items-center justify-between">
                      <p className="font-medium text-slate-900">
                        {t.testName} <span className="ml-1 font-mono text-xs text-indigo-600">{t.testCode}</span>
                      </p>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">{t.status}</span>
                    </div>
                    {t.resultValue ? (
                      <div className="mt-2 text-xs text-slate-600">
                        Result: <span className={t.isAbnormal ? 'text-red-600 font-semibold' : 'text-emerald-600 font-semibold'}>{t.resultValue}</span>
                        {t.resultUnit && <span className="text-slate-400"> {t.resultUnit}</span>}
                        {t.referenceRange && <span className="text-slate-400"> (ref {t.referenceRange})</span>}
                      </div>
                    ) : canRecordResult ? (
                      <ResultForm onSave={(input) => void recordResult(t.id, input)} />
                    ) : (
                      <p className="mt-2 text-xs text-slate-400">Awaiting result.</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
              <FlaskConical size={28} className="text-slate-300" />
              <p className="text-sm text-slate-400 max-w-xs">Select an order to view tests and record results.</p>
            </div>
          )}
        </div>
      </div>

      {showCreate && canOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4" onClick={() => setShowCreate(false)}>
          <div className="card w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 sticky top-0 bg-white rounded-t-xl">
              <h2 className="text-sm font-semibold text-slate-900">New lab order</h2>
              <button onClick={() => setShowCreate(false)} className="text-slate-400 hover:text-slate-600 text-sm">✕</button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1.5">Patient</label>
                <input className="input" placeholder="Search by name, number, phone or ID…" value={query} onChange={(e) => setQuery(e.target.value)} />
                {results.length > 0 && (
                  <ul className="mt-2 space-y-1">
                    {results.map((p) => (
                      <li key={p.id}>
                        <button
                          type="button"
                          onClick={() => {
                            setSelected(p);
                            setQuery('');
                            setResults([]);
                          }}
                          className="w-full text-left px-3 py-2 rounded-lg text-sm bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
                        >
                          {p.fullName} <span className="ml-2 font-mono text-xs text-indigo-600">{p.patientNumber}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
                {selected && <p className="text-xs text-emerald-600 mt-2">✓ {selected.fullName}</p>}
                {selected && !resolving && !consultationId && (
                  <p className="text-xs text-amber-600 mt-1">No consultation on record — start one from Consultations first.</p>
                )}
              </div>

              <div className="space-y-3">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Tests</p>
                {tests.map((t, i) => (
                  <div key={i} className="grid grid-cols-[90px_1fr] gap-2">
                    <input className="input" placeholder="Code" value={t.testCode} onChange={(e) => setTest(i, { testCode: e.target.value })} />
                    <input className="input" placeholder="Test name (e.g. Full Blood Count)" value={t.testName} onChange={(e) => setTest(i, { testName: e.target.value })} />
                  </div>
                ))}
                <button
                  type="button"
                  className="text-xs font-medium text-indigo-600 hover:text-indigo-700"
                  onClick={() => setTests((ts) => [...ts, { testCode: '', testName: '' }])}
                >
                  + Add test
                </button>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button className="btn-ghost" onClick={() => setShowCreate(false)}>Cancel</button>
                <button className="btn-primary" disabled={saving || !consultationId} onClick={() => void createOrder()}>
                  {saving && <Loader2 size={15} className="animate-spin" />}
                  Create order
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ResultForm({ onSave }: { onSave: (input: { resultValue: string; resultUnit?: string; isAbnormal?: boolean }) => void }) {
  const [resultValue, setResultValue] = useState('');
  const [resultUnit, setResultUnit] = useState('');
  const [isAbnormal, setIsAbnormal] = useState(false);

  const save = () => {
    if (!resultValue.trim()) {
      toast.error('Enter a result value.');
      return;
    }
    onSave({ resultValue: resultValue.trim(), resultUnit: resultUnit.trim() || undefined, isAbnormal });
    setResultValue('');
    setResultUnit('');
    setIsAbnormal(false);
  };

  return (
    <div className="mt-2 grid grid-cols-[1fr_80px_auto] gap-2 items-end">
      <input className="input text-xs py-1.5" placeholder="Result value" value={resultValue} onChange={(e) => setResultValue(e.target.value)} />
      <input className="input text-xs py-1.5" placeholder="Unit" value={resultUnit} onChange={(e) => setResultUnit(e.target.value)} />
      <div className="flex items-center gap-2">
        <label className="flex items-center gap-1.5 text-xs text-slate-500 shrink-0">
          <input type="checkbox" checked={isAbnormal} onChange={(e) => setIsAbnormal(e.target.checked)} />
          Abnormal
        </label>
        <button className="btn-primary text-xs py-1.5 shrink-0" onClick={save}>Save</button>
      </div>
    </div>
  );
}
