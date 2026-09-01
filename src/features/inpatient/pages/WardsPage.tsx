// ============================================================
// WardsPage.tsx
// Location: src/features/inpatient/pages/WardsPage.tsx
//
// Hospital-oriented wards & admissions suite:
//  • occupancy dashboard (real admin-managed wards)
//  • elegant admission flow (ward + bed + diagnosis + attending)
//  • day-to-day follow-up board: SOAP medical records with vitals
//    and media/image uploads per record
//  • discharge gating — a patient can only be discharged once
//    medical records are filled AND the bill is cleared
// ============================================================

import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import {
  Loader2, BedDouble, DoorOpen, Inbox, Plus, Download, Paperclip, ShieldCheck,
} from 'lucide-react';
import { InpatientService } from '../services/inpatientService';
import type { AdmissionDetail, AdmissionListItem, WardOccupancyDto } from '../types/inpatient';
import { formatDateTime } from '@/lib/format';
import { useAuth } from '@/features/auth/components/AuthContext';
import { hasPermission, PERMISSIONS } from '@/lib/permissions';
import AdmitPatientModal from '../components/AdmitPatientModal';
import WardManageModal from '../components/WardManageModal';
import AddMedicalRecordModal from '../components/AddMedicalRecordModal';

const STATUS_CLS: Record<string, string> = {
  Admitted: 'bg-emerald-100 text-emerald-700',
  UnderObservation: 'bg-sky-100 text-sky-700',
  Transferred: 'bg-violet-100 text-violet-700',
  DeceasedInFacility: 'bg-slate-100 text-slate-500',
  Discharged: 'bg-slate-100 text-slate-500',
};

export default function WardsPage() {
  const { permissions } = useAuth();
  const canAdmit = hasPermission(permissions, PERMISSIONS.CLINICAL_CONSULT);
  const canManageWards = hasPermission(permissions, PERMISSIONS.IDENTITY_USER_VIEW);

  const [occupancy, setOccupancy] = useState<WardOccupancyDto[]>([]);
  const [admissions, setAdmissions] = useState<AdmissionListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  const [showAdmit, setShowAdmit] = useState(false);
  const [showWards, setShowWards] = useState(false);
  const [showRecord, setShowRecord] = useState(false);

  const [active, setActive] = useState<AdmissionDetail | null>(null);
  const [activeLoading, setActiveLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState('');

  const load = useCallback(async (pageNumber: number) => {
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
  }, []);

  useEffect(() => {
    void load(page);
  }, [load, page]);

  const refreshActive = useCallback(async (id: string) => {
    try {
      setActive(await InpatientService.detail(id));
    } catch {
      /* keep last known */
    }
  }, []);

  const open = async (a: AdmissionListItem) => {
    setActiveLoading(true);
    setActive(null);
    try {
      const detail = await InpatientService.detail(a.id);
      setActive(detail);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to load admission');
    } finally {
      setActiveLoading(false);
    }
  };

  const discharge = async () => {
    if (!active) return;
    setBusy(true);
    try {
      const updated = await InpatientService.discharge(active.id);
      setActive(updated);
      toast.success('Patient discharged');
      void load(page);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Discharge failed');
    } finally {
      setBusy(false);
    }
  };

  const addNote = async () => {
    if (!active || !note.trim()) return;
    setBusy(true);
    try {
      const updated = await InpatientService.addNote(active.id, note.trim());
      setActive(updated);
      setNote('');
      toast.success('Ward note added');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to add note');
    } finally {
      setBusy(false);
    }
  };

  const attachFile = async (recordId: string, file: File) => {
    try {
      const updated = await InpatientService.attachFile(recordId, file);
      setActive(updated);
      toast.success('File attached');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Upload failed');
    }
  };

  const downloadFile = (recordId: string, attachmentId: string) => {
    void (async () => {
      try {
        const { getAccessToken } = await import('@/lib/apiClient');
        const res = await fetch(InpatientService.attachmentDownloadUrl(recordId, attachmentId), {
          headers: { Authorization: `Bearer ${getAccessToken()}` },
        });
        if (!res.ok) throw new Error('Download failed');
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'attachment';
        a.click();
        URL.revokeObjectURL(url);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Download failed');
      }
    })();
  };

  const recordsComplete = active?.hasCompleteMedicalRecord ?? false;

  return (
    <div className="p-5 lg:p-8 space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Wards & Admissions</h1>
          <p className="text-sm text-slate-500 mt-0.5">Occupancy, daily follow-up and discharge</p>
        </div>
        <div className="flex items-center gap-2">
          {canManageWards && (
            <button className="btn-ghost" onClick={() => setShowWards(true)}>
              <Plus size={16} /> Manage wards
            </button>
          )}
          {canAdmit && (
            <button className="btn-primary" onClick={() => setShowAdmit(true)}>
              <DoorOpen size={16} /> Admit patient
            </button>
          )}
        </div>
      </div>

      {/* Occupancy */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {occupancy.map((w) => {
          const pct = w.totalBeds > 0 ? Math.round((w.occupiedBeds / w.totalBeds) * 100) : 0;
          return (
            <div key={w.wardId} className="card p-4">
              <p className="text-xs font-medium text-slate-500 truncate">{w.wardName}</p>
              <p className="text-xl font-bold text-slate-900 mt-1">
                {w.occupiedBeds}<span className="text-sm font-medium text-slate-400">/{w.totalBeds}</span>
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
          <p className="text-sm text-slate-400 col-span-full text-center py-6">
            No wards configured{canManageWards ? ' — use "Manage wards" to create them.' : '.'}
          </p>
        )}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Active admissions */}
        <div className="card overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-900">Active admissions</h2>
            {total > 20 && <span className="text-xs text-slate-400">{total} total</span>}
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
                    <th>Admitted</th>
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
                      <td className="text-slate-500">{formatDateTime(a.admittedAtUtc)}</td>
                      <td>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_CLS[a.status] ?? 'bg-slate-100 text-slate-500'}`}>
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

        {/* Admission detail */}
        <div className="card p-5 min-h-[300px]">
          <h2 className="text-sm font-semibold text-slate-900 mb-4 flex items-center gap-2">
            <BedDouble size={15} className="text-indigo-600" /> Admission & follow-up
          </h2>

          {activeLoading ? (
            <div className="flex items-center justify-center gap-3 py-16">
              <Loader2 size={20} className="animate-spin text-indigo-600" />
              <p className="text-sm text-slate-400">Loading…</p>
            </div>
          ) : active ? (
            <div className="space-y-5">
              {/* Admission summary */}
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="text-sm">
                  <p className="font-medium text-slate-900">{admissions.find((a) => a.id === active.id)?.patientName ?? 'Patient'}</p>
                  <p className="text-slate-600 mt-0.5">
                    <span className="font-medium text-slate-900">{active.wardName}</span> · Bed{' '}
                    <span className="font-medium text-slate-900">{active.bedNumber}</span>
                  </p>
                  {active.admittingDiagnosis && (
                    <p className="text-xs text-slate-500 mt-0.5"><span className="font-medium">Diagnosis:</span> {active.admittingDiagnosis}</p>
                  )}
                  <p className="text-xs text-slate-400 mt-0.5">Admitted {formatDateTime(active.admittedAtUtc)}</p>
                  {active.dischargedAtUtc && (
                    <p className="text-xs text-slate-400 mt-0.5">Discharged {formatDateTime(active.dischargedAtUtc)}</p>
                  )}
                </div>
                <span className={`text-xs px-2.5 py-1 rounded-full border ${STATUS_CLS[active.status] ?? 'bg-slate-100 text-slate-600'}`}>
                  {active.status}
                </span>
              </div>

              {/* Discharge gate */}
              {active.status !== 'Discharged' && (
                <div className={`rounded-lg border p-3 text-sm ${recordsComplete ? 'border-slate-200 bg-slate-50' : 'border-amber-200 bg-amber-50'}`}>
                  <div className="flex items-center gap-2 mb-2">
                    <ShieldCheck size={14} className={recordsComplete ? 'text-emerald-600' : 'text-amber-600'} />
                    <p className="text-xs font-semibold text-slate-700">Discharge checklist</p>
                  </div>
                  <ul className="space-y-1 text-xs">
                    <li className={`flex items-center gap-1.5 ${recordsComplete ? 'text-emerald-700' : 'text-amber-700'}`}>
                      {recordsComplete ? '✓' : '✗'} Ward medical records completed (assessment + plan)
                    </li>
                    <li className="text-slate-500 flex items-center gap-1.5">
                      <span>•</span> Bill cleared — enforced at discharge (the system checks automatically)
                    </li>
                  </ul>
                  <button
                    className={`mt-3 w-full ${recordsComplete ? 'btn-primary' : 'btn-ghost'} text-red-600 ${recordsComplete ? '' : 'border-red-200 hover:bg-red-50'}`}
                    disabled={busy}
                    onClick={() => void discharge()}
                  >
                    {busy && <Loader2 size={14} className="animate-spin" />}
                    Discharge patient
                  </button>
                  {!recordsComplete && (
                    <p className="text-[11px] text-amber-700 mt-2">Complete a ward record (with assessment & plan) to unlock discharge. The bill must also be cleared.</p>
                  )}
                </div>
              )}

              {/* Day-to-day medical records */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Day-to-day ward records</p>
                  {active.status !== 'Discharged' && canAdmit && (
                    <button className="btn-primary !py-1 !px-2.5 text-xs" onClick={() => setShowRecord(true)}>
                      <Plus size={13} /> New record
                    </button>
                  )}
                </div>

                {active.medicalRecords.length === 0 ? (
                  <p className="text-sm text-slate-400">No ward records yet.</p>
                ) : (
                  <div className="space-y-3">
                    {active.medicalRecords.map((r) => (
                      <div key={r.id} className={`rounded-lg border p-3 ${r.isComplete ? 'border-emerald-200 bg-emerald-50/40' : 'border-slate-200 bg-slate-50'}`}>
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-xs text-slate-400">{formatDateTime(r.recordedAtUtc)}</span>
                          {r.isComplete ? (
                            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-medium">Complete</span>
                          ) : (
                            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 font-medium">Incomplete</span>
                          )}
                        </div>

                        {(r.temperatureCelsius != null || r.systolicBp != null || r.pulseRate != null || r.oxygenSaturation != null) && (
                          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-600 mb-2">
                            {r.temperatureCelsius != null && <span>🌡 {r.temperatureCelsius}°C</span>}
                            {r.systolicBp != null && <span>🩸 {r.systolicBp}/{r.diastolicBp ?? '—'}</span>}
                            {r.pulseRate != null && <span>❤️ {r.pulseRate}</span>}
                            {r.respiratoryRate != null && <span>🫁 {r.respiratoryRate}</span>}
                            {r.oxygenSaturation != null && <span>SpO₂ {r.oxygenSaturation}%</span>}
                            {r.weightKg != null && <span>⚖️ {r.weightKg}kg</span>}
                          </div>
                        )}

                        <div className="space-y-1 text-xs text-slate-700">
                          {r.subjective && <p><span className="font-medium text-slate-500">S:</span> {r.subjective}</p>}
                          {r.objective && <p><span className="font-medium text-slate-500">O:</span> {r.objective}</p>}
                          {r.assessment && <p><span className="font-medium text-slate-500">A:</span> {r.assessment}</p>}
                          {r.plan && <p><span className="font-medium text-slate-500">P:</span> {r.plan}</p>}
                        </div>

                        {/* Attachments */}
                        {r.attachments.length > 0 && (
                          <div className="flex flex-wrap gap-2 mt-2">
                            {r.attachments.map((at) => (
                              <button
                                key={at.id}
                                type="button"
                                onClick={() => downloadFile(r.id, at.id)}
                                className="inline-flex items-center gap-1 text-[11px] px-2 py-1 rounded-lg bg-white border border-slate-200 text-slate-600 hover:text-indigo-600 hover:border-indigo-300 transition-colors"
                              >
                                <Download size={11} /> {at.fileName}
                              </button>
                            ))}
                          </div>
                        )}

                        {active.status !== 'Discharged' && canAdmit && (
                          <label className="mt-2 inline-flex items-center gap-1.5 text-[11px] font-medium text-indigo-600 hover:text-indigo-800 cursor-pointer">
                            <Paperclip size={12} /> Attach image/file
                            <input
                              type="file"
                              className="hidden"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                e.target.value = '';
                                if (file) void attachFile(r.id, file);
                              }}
                            />
                          </label>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Quick ward note */}
              {active.status !== 'Discharged' && canAdmit && (
                <div>
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Quick note</p>
                  <div className="flex gap-2">
                    <input className="input" placeholder="Add a brief ward note…" value={note} onChange={(e) => setNote(e.target.value)} />
                    <button className="btn-primary shrink-0" disabled={!note.trim() || busy} onClick={() => void addNote()}>Add</button>
                  </div>
                  {active.notes.length > 0 && (
                    <ul className="space-y-1.5 mt-3">
                      {active.notes.slice(-5).reverse().map((n, i) => (
                        <li key={i} className="text-xs text-slate-500">
                          {n.content}
                          <span className="block text-[10px] text-slate-400">{formatDateTime(n.recordedAtUtc)}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
              <BedDouble size={28} className="text-slate-300" />
              <p className="text-sm text-slate-400 max-w-xs">Select an admission to view daily follow-up records and discharge.</p>
            </div>
          )}
        </div>
      </div>

      {showAdmit && (
        <AdmitPatientModal
          onClose={() => setShowAdmit(false)}
          onAdmitted={(id) => {
            setShowAdmit(false);
            void load(page);
            void open({ id, patientId: '', patientNumber: '', patientName: '', wardId: '', wardName: '', bedNumber: '', status: 'Admitted', admittedAtUtc: '', dischargedAtUtc: null } as AdmissionListItem);
          }}
        />
      )}
      {showWards && <WardManageModal onClose={() => setShowWards(false)} onChanged={() => void load(page)} />}
      {showRecord && active && (
        <AddMedicalRecordModal
          admissionId={active.id}
          onClose={() => setShowRecord(false)}
          onSaved={() => {
            setShowRecord(false);
            void refreshActive(active.id);
          }}
        />
      )}
    </div>
  );
}
