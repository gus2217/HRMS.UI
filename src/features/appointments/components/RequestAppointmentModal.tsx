// ============================================================
// RequestAppointmentModal.tsx
// Location: src/features/appointments/components/RequestAppointmentModal.tsx
//
// Reception raises a request for an appointment at a specific clinic, for a
// clinician to approve. Captures patient, target clinic, reason and a
// preferred date.
// ============================================================

import { useEffect, useState, type FormEvent } from 'react';
import toast from 'react-hot-toast';
import { Loader2, UserRound, CheckCircle2 } from 'lucide-react';
import { AppointmentService } from '../services/appointmentService';
import { PatientService } from '@/features/patients/services/patientService';
import type { PatientSummary } from '@/features/patients/types/patient';
import type { AppointmentRequest } from '../types/appointment';
import { CLINIC_TYPES } from '@/features/clinical/clinics';
import { ageFromDateOfBirth } from '@/lib/format';

interface Props {
  onClose: () => void;
  onRequested: (req: AppointmentRequest) => void;
}

export default function RequestAppointmentModal({ onClose, onRequested }: Props) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<PatientSummary[]>([]);
  const [selected, setSelected] = useState<PatientSummary | null>(null);
  const [searching, setSearching] = useState(false);
  const [clinicType, setClinicType] = useState('GeneralOutpatient');
  const [reason, setReason] = useState('');
  const [notes, setNotes] = useState('');
  const [preferredDate, setPreferredDate] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (!query.trim()) {
        setResults([]);
        return;
      }
      setSearching(true);
      PatientService.search(query.trim(), 1, 8)
        .then((res) => setResults(res.items))
        .catch(() => setResults([]))
        .finally(() => setSearching(false));
    }, 350);
    return () => clearTimeout(timer);
  }, [query]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!selected) {
      toast.error('Select a patient first.');
      return;
    }
    if (!reason.trim()) {
      toast.error('Reason for the appointment is required.');
      return;
    }
    setSaving(true);
    try {
      const req = await AppointmentService.createRequest({
        patientId: selected.id,
        clinicType,
        reason: reason.trim(),
        notes: notes.trim() || null,
        preferredDate: preferredDate || null,
      });
      onRequested(req);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to send request');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="card w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 sticky top-0 bg-white rounded-t-xl">
          <h2 className="text-sm font-semibold text-slate-900">Request appointment</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-sm">✕</button>
        </div>

        <form onSubmit={submit} className="p-5 space-y-4">
          {selected ? (
            <div className="flex items-center justify-between gap-2 p-3 rounded-lg bg-indigo-50 border border-indigo-200">
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="w-8 h-8 rounded-full bg-indigo-600/10 text-indigo-700 flex items-center justify-center text-xs font-semibold shrink-0">
                  {selected.fullName.slice(0, 2).toUpperCase()}
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-900 truncate">{selected.fullName}</p>
                  <p className="text-[11px] text-indigo-600 font-mono">
                    {selected.patientNumber}
                    {selected.dateOfBirth ? ` · ${ageFromDateOfBirth(selected.dateOfBirth) ?? '—'} yrs` : ''}
                  </p>
                </div>
              </div>
              <button type="button" className="text-xs text-slate-400 hover:text-slate-600 shrink-0" onClick={() => setSelected(null)}>
                Change
              </button>
            </div>
          ) : (
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">Patient *</label>
              <input className="input" placeholder="Search by name or number…" value={query} onChange={(e) => setQuery(e.target.value)} autoFocus />
              {searching && <p className="flex items-center gap-1.5 text-xs text-slate-400 mt-2"><Loader2 size={12} className="animate-spin" /> Searching…</p>}
              {results.length > 0 && (
                <ul className="mt-2 space-y-1 max-h-44 overflow-y-auto">
                  {results.map((p) => (
                    <li key={p.id}>
                      <button type="button" className="w-full flex items-center gap-2.5 p-2 rounded-lg hover:bg-slate-50 text-left"
                        onClick={() => { setSelected(p); setQuery(''); setResults([]); }}>
                        <UserRound size={16} className="text-slate-400 shrink-0" />
                        <span className="min-w-0 flex-1">
                          <span className="block text-sm text-slate-800 truncate">{p.fullName}</span>
                          <span className="block text-[11px] text-slate-400 font-mono">{p.patientNumber}</span>
                        </span>
                        <CheckCircle2 size={15} className="text-indigo-500 shrink-0" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1.5">Clinic *</label>
            <select className="input" value={clinicType} onChange={(e) => setClinicType(e.target.value)}>
              {CLINIC_TYPES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1.5">Reason for appointment *</label>
            <textarea className="input min-h-[72px]" placeholder="e.g. Tooth pain 2 weeks, needs extraction review…"
              value={reason} onChange={(e) => setReason(e.target.value)} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">Preferred date</label>
              <input type="date" className="input" value={preferredDate} onChange={(e) => setPreferredDate(e.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">Notes</label>
              <input className="input" placeholder="Optional" value={notes} onChange={(e) => setNotes(e.target.value)} />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <button type="button" className="btn-ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={saving || !selected}>
              {saving && <Loader2 size={15} className="animate-spin" />}
              Send request
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
