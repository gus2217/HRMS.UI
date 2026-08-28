import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Loader2, BedDouble, DoorOpen, Inbox } from 'lucide-react';
import { InpatientService } from '../services/inpatientService';
import { PatientService } from '@/features/patients/services/patientService';
import type { AdmissionDetail, AdmissionListItem, WardOccupancyDto } from '../types/inpatient';
import type { PatientSummary } from '@/features/patients/types/patient';
import { formatDateTime } from '@/lib/format';
import { useAuth } from '@/features/auth/components/AuthContext';
import { hasPermission, PERMISSIONS } from '@/lib/permissions';

interface AdmissionRow extends AdmissionListItem {
  detail?: AdmissionDetail;
}

const WARDS = ['General Ward', 'Maternity', 'Pediatric', 'Surgical', 'ICU', 'Isolation'];

export default function WardsPage() {
  const { user, permissions } = useAuth();
  const [occupancy, setOccupancy] = useState<WardOccupancyDto[]>([]);
  const [admissions, setAdmissions] = useState<AdmissionRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [showAdmit, setShowAdmit] = useState(false);
  const [active, setActive] = useState<AdmissionRow | null>(null);
  const [activeLoading, setActiveLoading] = useState(false);
  const [busy, setBusy] = useState(false);

  const canAdmit = hasPermission(permissions, PERMISSIONS.CLINICAL_CONSULT);

  // Admit modal state
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<PatientSummary[]>([]);
  const [selected, setSelected] = useState<PatientSummary | null>(null);
  const [wardName, setWardName] = useState('General Ward');
  const [bedNumber, setBedNumber] = useState('');
  const [saving, setSaving] = useState(false);

  const load = async (pageNumber: number) => {
    setLoading(true);
    try {
      const [occ, list] = await Promise.all([
        InpatientService.wardOccupancy().catch(() => [] as WardOccupancyDto[]),
        InpatientService.list(pageNumber, 20, true),
      ]);
      setOccupancy(occ);
      setAdmissions(list.items);
      setTotal(list.totalCount);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to load admissions');
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

  const open = async (a: AdmissionRow) => {
    setActiveLoading(true);
    setActive(a);
    try {
      const detail = await InpatientService.detail(a.id);
      setActive({ ...a, detail });
    } catch {
      setActive({ ...a, detail: undefined });
    } finally {
      setActiveLoading(false);
    }
  };

  const discharge = async () => {
    if (!active?.detail) return;
    setBusy(true);
    try {
      const updated = await InpatientService.discharge(active.detail.id);
      setActive((prev) => (prev ? { ...prev, detail: updated, status: updated.status } : prev));
      toast.success('Patient discharged');
      void load(page);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Discharge failed');
    } finally {
      setBusy(false);
    }
  };

  const addNote = async (content: string) => {
    if (!active?.detail || !content.trim()) return;
    setBusy(true);
    try {
      const updated = await InpatientService.addNote(active.detail.id, content.trim());
      setActive((prev) => (prev ? { ...prev, detail: updated } : prev));
      toast.success('Ward note added');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to add note');
    } finally {
      setBusy(false);
    }
  };

  const admit = async () => {
    if (!selected) {
      toast.error('Select a patient first.');
      return;
    }
    if (!wardName.trim() || !bedNumber.trim()) {
      toast.error('Ward and bed number are required.');
      return;
    }
    setSaving(true);
    try {
      const res = await InpatientService.admit({
        patientId: selected.id,
        admittingClinicianUserId: user?.id ?? '',
        wardName: wardName.trim(),
        bedNumber: bedNumber.trim(),
      });
      toast.success(`Admitted to ${res.wardName} · Bed ${res.bedNumber}`);
      setShowAdmit(false);
      setActive({
        ...res,
        patientName: selected.fullName,
        patientNumber: selected.patientNumber,
        detail: res,
      });
      setQuery('');
      setSelected(null);
      setBedNumber('');
      void load(page);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Admission failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-5 lg:p-8 space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Wards & Admissions</h1>
          <p className="text-sm text-slate-500 mt-0.5">Occupancy, admissions and discharge</p>
        </div>
        {canAdmit && (
          <button className="btn-primary" onClick={() => setShowAdmit(true)}>
            <DoorOpen size={16} />
            Admit patient
          </button>
        )}
      </div>

      {/* Occupancy */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {occupancy.map((w) => {
          const pct = w.totalBeds > 0 ? Math.round((w.occupiedBeds / w.totalBeds) * 100) : w.occupiedBeds > 0 ? 100 : 0;
          return (
            <div key={w.wardName} className="card p-4">
              <p className="text-xs font-medium text-slate-500 truncate">{w.wardName}</p>
              <p className="text-xl font-bold text-slate-900 mt-1">
                {w.occupiedBeds}{w.totalBeds > 0 && <span className="text-sm font-medium text-slate-400">/{w.totalBeds}</span>}
              </p>
              {w.totalBeds > 0 && (
                <div className="mt-2 h-1.5 rounded-full bg-slate-100 overflow-hidden">
                  <div
                    className={`h-full rounded-full ${pct > 90 ? 'bg-red-500' : pct > 70 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                    style={{ width: `${Math.min(100, pct)}%` }}
                  />
                </div>
              )}
            </div>
          );
        })}
        {occupancy.length === 0 && !loading && (
          <p className="text-sm text-slate-400 col-span-full text-center py-6">No ward occupancy data.</p>
        )}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="card overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200">
            <h2 className="text-sm font-semibold text-slate-900">Active admissions</h2>
          </div>
          {loading ? (
            <div className="flex items-center justify-center gap-3 py-14">
              <Loader2 size={20} className="animate-spin text-indigo-600" />
              <p className="text-sm text-slate-400">Loading…</p>
            </div>
          ) : admissions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
              <Inbox size={28} className="text-slate-300" />
              <p className="text-sm text-slate-400 max-w-xs">No active admissions.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="table-base">
                <thead>
                  <tr>
                    <th>Patient</th>
                    <th>Ward</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {admissions.map((a) => (
                    <tr key={a.id} className="cursor-pointer" onClick={() => void open(a)}>
                      <td>
                        <p className="font-medium text-slate-900">{a.patientName}</p>
                        <p className="font-mono text-xs text-indigo-600">{a.patientNumber}</p>
                      </td>
                      <td className="text-slate-500">{a.wardName} · {a.bedNumber}</td>
                      <td>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          a.status === 'Discharged' ? 'bg-slate-100 text-slate-500' : 'bg-emerald-100 text-emerald-700'
                        }`}>
                          {a.status}
                        </span>
                      </td>
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
            <BedDouble size={15} className="text-indigo-600" /> Admission details
          </h2>
          {activeLoading ? (
            <div className="flex items-center justify-center gap-3 py-16">
              <Loader2 size={20} className="animate-spin text-indigo-600" />
              <p className="text-sm text-slate-400">Loading…</p>
            </div>
          ) : active && active.detail ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="text-sm">
                  <p className="font-medium text-slate-900">{active.patientName}</p>
                  <p className="text-slate-600 mt-0.5">
                    Ward <span className="font-medium text-slate-900">{active.detail.wardName}</span> · Bed{' '}
                    <span className="font-medium text-slate-900">{active.detail.bedNumber}</span>
                  </p>
                  <p className="text-xs text-slate-400 mt-0.5">Admitted {formatDateTime(active.detail.admittedAtUtc)}</p>
                  {active.detail.dischargedAtUtc && (
                    <p className="text-xs text-slate-400 mt-0.5">Discharged {formatDateTime(active.detail.dischargedAtUtc)}</p>
                  )}
                </div>
                <span className="text-xs px-2.5 py-1 rounded-full border border-slate-200 bg-slate-100 text-slate-600">
                  {active.detail.status}
                </span>
              </div>

              {active.detail.status !== 'Discharged' && canAdmit && (
                <button className="btn-ghost w-full text-red-600 border-red-200 hover:bg-red-50" disabled={busy} onClick={() => void discharge()}>
                  {busy && <Loader2 size={14} className="animate-spin" />}
                  Discharge patient
                </button>
              )}

              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Ward notes</p>
                {active.detail.notes.length > 0 && (
                  <ul className="space-y-2 mb-3">
                    {active.detail.notes.map((n, i) => (
                      <li key={i} className="text-sm text-slate-600">
                        {n.content}
                        <span className="block text-[11px] text-slate-400 mt-0.5">{formatDateTime(n.recordedAtUtc)}</span>
                      </li>
                    ))}
                  </ul>
                )}
                {canAdmit && <WardNoteComposer onAdd={(content) => void addNote(content)} />}
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
              <BedDouble size={28} className="text-slate-300" />
              <p className="text-sm text-slate-400 max-w-xs">Select an admission to view ward notes and discharge.</p>
            </div>
          )}
        </div>
      </div>

      {showAdmit && canAdmit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4" onClick={() => setShowAdmit(false)}>
          <div className="card w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
              <h2 className="text-sm font-semibold text-slate-900">Admit patient</h2>
              <button onClick={() => setShowAdmit(false)} className="text-slate-400 hover:text-slate-600 text-sm">✕</button>
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
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1.5">Ward</label>
                  <select className="input" value={wardName} onChange={(e) => setWardName(e.target.value)}>
                    {WARDS.map((w) => <option key={w}>{w}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1.5">Bed number</label>
                  <input className="input" placeholder="e.g. A-12" value={bedNumber} onChange={(e) => setBedNumber(e.target.value)} />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button className="btn-ghost" onClick={() => setShowAdmit(false)}>Cancel</button>
                <button className="btn-primary" disabled={saving} onClick={() => void admit()}>
                  {saving && <Loader2 size={15} className="animate-spin" />}
                  Admit
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function WardNoteComposer({ onAdd }: { onAdd: (content: string) => void }) {
  const [note, setNote] = useState('');
  return (
    <div className="flex gap-2">
      <input className="input" placeholder="Add ward note…" value={note} onChange={(e) => setNote(e.target.value)} />
      <button
        className="btn-primary shrink-0"
        disabled={!note.trim()}
        onClick={() => {
          onAdd(note);
          setNote('');
        }}
      >
        Add
      </button>
    </div>
  );
}
