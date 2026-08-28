import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Loader2, FlaskConical, TestTube2 } from 'lucide-react';
import { LaboratoryService } from '../services/laboratoryService';
import { ConsultationService } from '@/features/consultations/services/consultationService';
import { PatientService } from '@/features/patients/services/patientService';
import type { LabOrderDetail } from '../types/laboratory';
import type { PatientSummary } from '@/features/patients/types/patient';
import { formatDateTime } from '@/lib/format';
import { useAuth } from '@/features/auth/components/AuthContext';

interface LabRow extends LabOrderDetail {
  patientName?: string;
}

export default function LaboratoryPage() {
  const { user } = useAuth();
  const [orders, setOrders] = useState<LabRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [active, setActive] = useState<LabRow | null>(null);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<PatientSummary[]>([]);
  const [selected, setSelected] = useState<PatientSummary | null>(null);
  const [tests, setTests] = useState([{ testCode: '', testName: '' }]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const res = await PatientService.search(undefined, 1, 20).catch(() => null);
        if (!mounted) return;
        setOrders(
          (res?.items ?? []).slice(0, 10).map((p: PatientSummary) => ({
            id: p.id,
            patientId: p.id,
            consultationId: '',
            orderedByUserId: '',
            status: '—',
            orderedAtUtc: p.lastVisitDate ?? p.dateOfBirth,
            tests: [],
            patientName: p.fullName,
          })),
        );
      } catch {
        /* tolerate */
      } finally {
        if (mounted) setLoading(false);
      }
    };
    void load();
    return () => {
      mounted = false;
    };
  }, []);

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

  const open = async (o: LabRow) => {
    try {
      const detail = await LaboratoryService.detail(o.id);
      setActive({ ...o, ...detail });
    } catch {
      toast.error('No lab order for this patient yet — create one.');
      setActive(null);
    }
  };

  const setTest = (index: number, patch: Partial<(typeof tests)[number]>) =>
    setTests((ts) => ts.map((t, i) => (i === index ? { ...t, ...patch } : t)));

  const createOrder = async () => {
    if (!selected) {
      toast.error('Select a patient first.');
      return;
    }
    const valid = tests.filter((t) => t.testCode.trim() && t.testName.trim());
    if (valid.length === 0) {
      toast.error('Add at least one test.');
      return;
    }
    setSaving(true);
    try {
      const consultation = await ConsultationService.start(selected.id, user?.id ?? '');
      const res = await LaboratoryService.createOrder({
        patientId: selected.id,
        consultationId: consultation.id,
        tests: valid.map((t) => ({ testCode: t.testCode.trim(), testName: t.testName.trim() })),
      });
      toast.success('Lab order created');
      setShowCreate(false);
      setActive({ ...res, patientName: selected.fullName });
      setQuery('');
      setSelected(null);
      setTests([{ testCode: '', testName: '' }]);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create order');
    } finally {
      setSaving(false);
    }
  };

  const recordResult = async (testItemId: string, input: { resultValue: string; resultUnit?: string; isAbnormal?: boolean }) => {
    if (!active) return;
    try {
      const updated = await LaboratoryService.recordResult(active.id, { testItemId, ...input });
      setActive((prev) => (prev ? { ...prev, ...updated } : prev));
      toast.success('Result recorded');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to record result');
    }
  };

  return (
    <div className="p-5 lg:p-8 space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Laboratory</h1>
          <p className="text-sm text-slate-500 mt-0.5">Lab orders & results</p>
        </div>
        <button className="btn-primary" onClick={() => setShowCreate(true)}>
          <TestTube2 size={16} />
          New lab order
        </button>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="card overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200">
            <h2 className="text-sm font-semibold text-slate-900">Recent orders</h2>
          </div>
          {loading ? (
            <div className="flex items-center justify-center gap-3 py-14">
              <Loader2 size={20} className="animate-spin text-indigo-600" />
              <p className="text-sm text-slate-400">Loading…</p>
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
                      <td className="font-medium text-slate-900">{o.patientName}</td>
                      <td>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">{o.status}</span>
                      </td>
                      <td className="text-slate-500">{formatDateTime(o.orderedAtUtc)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="card p-5 min-h-[300px]">
          <h2 className="text-sm font-semibold text-slate-900 mb-4 flex items-center gap-2">
            <FlaskConical size={15} className="text-indigo-600" /> Order details
          </h2>
          {active && active.status !== '—' ? (
            <div className="space-y-3">
              <p className="text-xs text-slate-400">Ordered {formatDateTime(active.orderedAtUtc)} · {active.status}</p>
              <div className="space-y-2">
                {active.tests.map((t) => (
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
                    ) : (
                      <ResultForm onSave={(input) => void recordResult(t.id, input)} />
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

      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4" onClick={() => setShowCreate(false)}>
          <div className="card w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 sticky top-0 bg-white rounded-t-xl">
              <h2 className="text-sm font-semibold text-slate-900">New lab order</h2>
              <button onClick={() => setShowCreate(false)} className="text-slate-400 hover:text-slate-600 text-sm">✕</button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1.5">Patient</label>
                <input className="input" placeholder="Search patient…" value={query} onChange={(e) => setQuery(e.target.value)} />
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
                <button className="btn-primary" disabled={saving} onClick={() => void createOrder()}>
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
