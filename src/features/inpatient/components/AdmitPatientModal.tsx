// ============================================================
// AdmitPatientModal.tsx
// Location: src/features/inpatient/components/AdmitPatientModal.tsx
//
// Hospital-oriented admission: search patient → pick ward (from the
// live admin-managed list) → bed → admitting diagnosis → attending
// clinician.
// ============================================================

import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Loader2 } from 'lucide-react';
import { InpatientService } from '../services/inpatientService';
import { PatientService } from '@/features/patients/services/patientService';
import type { PatientSummary } from '@/features/patients/types/patient';
import type { WardDto, WardType } from '../types/inpatient';
import { useAuth } from '@/features/auth/components/AuthContext';

interface Props {
  onClose: () => void;
  onAdmitted: (admissionId: string) => void;
}

const WARD_TYPE_LABELS: Record<WardType, string> = {
  General: 'General',
  Maternity: 'Maternity',
  Pediatric: 'Pediatric',
  Surgical: 'Surgical',
  Icu: 'ICU',
  Isolation: 'Isolation',
  Private: 'Private',
  Recovery: 'Recovery',
};

export default function AdmitPatientModal({ onClose, onAdmitted }: Props) {
  const { user } = useAuth();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<PatientSummary[]>([]);
  const [selected, setSelected] = useState<PatientSummary | null>(null);
  const [wards, setWards] = useState<WardDto[]>([]);
  const [wardId, setWardId] = useState('');
  const [bedNumber, setBedNumber] = useState('');
  const [diagnosis, setDiagnosis] = useState('');
  const [attending, setAttending] = useState(user?.id ?? '');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    InpatientService.wards(true)
      .then((w) => {
        setWards(w);
        if (w.length > 0) setWardId(w[0].id);
      })
      .catch(() => setWards([]));
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

  const admit = async () => {
    if (!selected) return toast.error('Select a patient first.');
    if (!wardId) return toast.error('Select a ward.');
    if (!bedNumber.trim()) return toast.error('Bed number is required.');
    setSaving(true);
    try {
      const res = await InpatientService.admit({
        patientId: selected.id,
        admittingClinicianUserId: user?.id ?? '',
        wardId,
        bedNumber: bedNumber.trim(),
        admittingDiagnosis: diagnosis.trim() || null,
        attendingClinicianUserId: attending || null,
      });
      toast.success(`Admitted to ${res.wardName} · Bed ${res.bedNumber}`);
      onAdmitted(res.id);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Admission failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="card w-full max-w-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
          <h2 className="text-sm font-semibold text-slate-900">Admit patient</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-sm">✕</button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1.5">Patient</label>
            <input className="input" placeholder="Search by name, number, phone or ID…" value={query} onChange={(e) => setQuery(e.target.value)} autoFocus />
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
              <select className="input" value={wardId} onChange={(e) => setWardId(e.target.value)}>
                {wards.length === 0 && <option value="">No active wards — ask admin</option>}
                {wards.map((w) => (
                  <option key={w.id} value={w.id}>{w.name} ({WARD_TYPE_LABELS[w.type]})</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">Bed number</label>
              <input className="input" placeholder="e.g. A-12" value={bedNumber} onChange={(e) => setBedNumber(e.target.value)} />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1.5">Admitting diagnosis</label>
            <input className="input" placeholder="e.g. Severe pneumonia, RTA — poly-trauma" value={diagnosis} onChange={(e) => setDiagnosis(e.target.value)} />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1.5">Attending clinician (in charge)</label>
            <input className="input" placeholder="Clinician user ID (defaults to you)" value={attending} onChange={(e) => setAttending(e.target.value)} />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button className="btn-ghost" onClick={onClose}>Cancel</button>
            <button className="btn-primary" disabled={saving} onClick={() => void admit()}>
              {saving && <Loader2 size={15} className="animate-spin" />}
              Admit
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
