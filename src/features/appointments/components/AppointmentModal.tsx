// ============================================================
// AppointmentModal.tsx
// Location: src/features/appointments/components/AppointmentModal.tsx
//
// Book an appointment for a patient (clinician). Supports recurring series:
// daily/weekly/monthly × count, so one registration can generate a whole
// follow-up course (e.g. weekly physio for 6 weeks).
// ============================================================

import { useEffect, useState, type FormEvent } from 'react';
import toast from 'react-hot-toast';
import { Loader2, UserRound, CheckCircle2, History } from 'lucide-react';
import { AppointmentService } from '../services/appointmentService';
import { PatientService } from '@/features/patients/services/patientService';
import { ConsultationService } from '@/features/consultations/services/consultationService';
import type { ConsultationRecord } from '@/features/consultations/types/consultation';
import type { PatientSummary } from '@/features/patients/types/patient';
import type { Appointment } from '../types/appointment';
import { CLINIC_TYPES } from '@/features/clinical/clinics';
import { ageFromDateOfBirth, formatDateTime } from '@/lib/format';

interface Props {
  patient?: PatientSummary | null;
  onClose: () => void;
  onCreated: (appts: Appointment[]) => void;
}

const TYPES = [
  { value: 'Consultation', label: 'Consultation' },
  { value: 'FollowUp', label: 'Follow-up' },
  { value: 'CheckUp', label: 'Check-up' },
  { value: 'Review', label: 'Review' },
  { value: 'Procedure', label: 'Procedure' },
  { value: 'Other', label: 'Other' },
];

const RECURRENCES = [
  { value: 'None', label: 'Once' },
  { value: 'Daily', label: 'Daily' },
  { value: 'Weekly', label: 'Weekly' },
  { value: 'Monthly', label: 'Monthly' },
];

export default function AppointmentModal({ patient: presetPatient, onClose, onCreated }: Props) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<PatientSummary[]>([]);
  const [selected, setSelected] = useState<PatientSummary | null>(presetPatient ?? null);
  const [searching, setSearching] = useState(false);
  const [clinicType, setClinicType] = useState('GeneralOutpatient');
  const [type, setType] = useState('FollowUp');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('09:00');
  const [durationMinutes, setDurationMinutes] = useState(20);
  const [reason, setReason] = useState('');
  const [recurrence, setRecurrence] = useState('None');
  const [recurrenceCount, setRecurrenceCount] = useState(1);
  const [saving, setSaving] = useState(false);
  const [priorVisits, setPriorVisits] = useState<ConsultationRecord[]>([]);
  const [previousConsultationId, setPreviousConsultationId] = useState<string>('');

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

  // When a patient is selected and this is a follow-up/check-up, load their past
  // consultations so the clinician can link the visit to the index consultation.
  useEffect(() => {
    if (!selected || !['FollowUp', 'CheckUp', 'Review'].includes(type)) {
      setPriorVisits([]);
      setPreviousConsultationId('');
      return;
    }
    let mounted = true;
    ConsultationService.medicalRecord(selected.id)
      .then((rec) => {
        if (mounted) setPriorVisits(rec.consultations.filter((c) => c.status === 'Completed'));
      })
      .catch(() => { if (mounted) setPriorVisits([]); });
    return () => { mounted = false; };
  }, [selected, type]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!selected) {
      toast.error('Select a patient first.');
      return;
    }
    if (!date || !time) {
      toast.error('Date and time are required.');
      return;
    }
    const scheduledAtUtc = new Date(`${date}T${time}:00`).toISOString();
    setSaving(true);
    try {
      const created = await AppointmentService.create({
        patientId: selected.id,
        clinicType,
        type,
        scheduledAtUtc,
        durationMinutes,
        reason: reason.trim() || null,
        previousConsultationId: previousConsultationId || null,
        recurrencePattern: recurrence,
        recurrenceCount: recurrence === 'None' ? 1 : recurrenceCount,
        recurrenceEndDate: null,
      });
      onCreated(created);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to book appointment');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="card w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 sticky top-0 bg-white rounded-t-xl">
          <h2 className="text-sm font-semibold text-slate-900">Book appointment</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-sm">✕</button>
        </div>

        <form onSubmit={submit} className="p-5 space-y-4">
          {/* Patient */}
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
              {!presetPatient && (
                <button type="button" className="text-xs text-slate-400 hover:text-slate-600 shrink-0" onClick={() => setSelected(null)}>
                  Change
                </button>
              )}
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

          {/* Follow-up linkage — for follow-up/check-up/review types */}
          {selected && ['FollowUp', 'CheckUp', 'Review'].includes(type) && (
            <div className="p-3 rounded-lg bg-violet-50 border border-violet-200">
              <p className="text-xs font-semibold text-violet-700 flex items-center gap-1.5 mb-2">
                <History size={12} /> Follow-up of
              </p>
              {priorVisits.length === 0 ? (
                <p className="text-xs text-violet-500">No completed visits on record — this will be a standalone {type.toLowerCase()}.</p>
              ) : (
                <select
                  className="input"
                  value={previousConsultationId}
                  onChange={(e) => setPreviousConsultationId(e.target.value)}
                >
                  <option value="">No prior visit (standalone)</option>
                  {priorVisits.map((c) => (
                    <option key={c.id} value={c.id}>
                      {formatDateTime(c.startedAtUtc)}
                      {c.diagnoses.length > 0 ? ` — ${c.diagnoses.map((d) => d.description).join(', ')}` : ''}
                    </option>
                  ))}
                </select>
              )}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">Clinic *</label>
              <select className="input" value={clinicType} onChange={(e) => setClinicType(e.target.value)}>
                {CLINIC_TYPES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">Type *</label>
              <select className="input" value={type} onChange={(e) => setType(e.target.value)}>
                {TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">Date *</label>
              <input type="date" className="input" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1.5">Time *</label>
                <input type="time" className="input" value={time} onChange={(e) => setTime(e.target.value)} />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1.5">Mins</label>
                <input type="number" min={5} max={480} step={5} className="input" value={durationMinutes}
                  onChange={(e) => setDurationMinutes(Number(e.target.value))} />
              </div>
            </div>
          </div>

          {/* Recurrence */}
          <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-slate-600">Recurrence</p>
              <div className="flex gap-1">
                {RECURRENCES.map((r) => (
                  <button key={r.value} type="button" onClick={() => setRecurrence(r.value)}
                    className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                      recurrence === r.value ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-500 border-slate-200'
                    }`}>
                    {r.label}
                  </button>
                ))}
              </div>
            </div>
            {recurrence !== 'None' && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500">Number of visits</span>
                <input type="number" min={2} max={52} className="input w-20 py-1.5" value={recurrenceCount}
                  onChange={(e) => setRecurrenceCount(Number(e.target.value))} />
                <span className="text-xs text-slate-400">
                  {recurrence === 'Daily' ? 'day' : recurrence === 'Weekly' ? 'week' : 'month'} intervals
                </span>
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1.5">Reason (optional)</label>
            <textarea className="input min-h-[60px]" placeholder="e.g. Review blood results, wound check, physio session…"
              value={reason} onChange={(e) => setReason(e.target.value)} />
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <button type="button" className="btn-ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={saving || !selected}>
              {saving && <Loader2 size={15} className="animate-spin" />}
              {recurrence === 'None' ? 'Book appointment' : `Book ${recurrenceCount} appointments`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
