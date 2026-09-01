// ============================================================
// QueuePatientModal.tsx
// Location: src/features/queue/components/QueuePatientModal.tsx
//
// Reception queues a patient for a consultation: search patient →
// allocate clinic → triage priority → notes. Built for the front
// desk of a level-3 facility — minimal fields, fast flow.
// ============================================================

import { useEffect, useState, type FormEvent } from 'react';
import toast from 'react-hot-toast';
import { Loader2, UserRound, CheckCircle2 } from 'lucide-react';
import { QueueService } from '../services/queueService';
import { PatientService } from '@/features/patients/services/patientService';
import type { PatientSummary } from '@/features/patients/types/patient';
import type { QueueEntry } from '../types/queue';
import { ageFromDateOfBirth } from '@/lib/format';

interface Props {
  onClose: () => void;
  onQueued: (entry: QueueEntry) => void;
}

const CLINIC_TYPES = [
  { value: 'GeneralOutpatient', label: 'General outpatient' },
  { value: 'Counselling', label: 'Counselling' },
  { value: 'Laboratory', label: 'Laboratory' },
  { value: 'Immunization', label: 'Immunization' },
  { value: 'Wellness', label: 'Wellness' },
  { value: 'ReproductiveHealth', label: 'Reproductive health (RH)' },
  { value: 'ChildWelfare', label: 'Child welfare' },
  { value: 'MaternalChildHealth', label: 'Maternal & child health (MCH)' },
  { value: 'Antenatal', label: 'Antenatal (ANC)' },
  { value: 'Postnatal', label: 'Postnatal (PNC)' },
  { value: 'FamilyPlanning', label: 'Family planning' },
  { value: 'ComprehensiveCareCentre', label: 'Comprehensive care (CCC)' },
  { value: 'Tuberculosis', label: 'TB clinic' },
  { value: 'Nutrition', label: 'Nutrition' },
  { value: 'Dental', label: 'Dental' },
  { value: 'Eye', label: 'Eye clinic' },
  { value: 'Ent', label: 'ENT' },
  { value: 'Physiotherapy', label: 'Physiotherapy / rehab' },
  { value: 'AdolescentYouthFriendly', label: 'Adolescent & youth friendly' },
];

const PRIORITIES = [
  { value: 'Routine', label: 'Routine', hint: 'Standard clinic visit' },
  { value: 'Urgent', label: 'Urgent', hint: 'Needs attention today, not immediate' },
  { value: 'Emergency', label: 'Emergency', hint: 'Immediate attention required' },
];

export default function QueuePatientModal({ onClose, onQueued }: Props) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<PatientSummary[]>([]);
  const [selected, setSelected] = useState<PatientSummary | null>(null);
  const [searching, setSearching] = useState(false);
  const [clinicType, setClinicType] = useState('GeneralOutpatient');
  const [priority, setPriority] = useState('Routine');
  const [notes, setNotes] = useState('');
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
    setSaving(true);
    try {
      const entry = await QueueService.create({
        patientId: selected.id,
        clinicType,
        priority,
        notes: notes.trim() || null,
      });
      onQueued(entry);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to queue patient');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="card w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 sticky top-0 bg-white rounded-t-xl">
          <h2 className="text-sm font-semibold text-slate-900">Queue patient for consultation</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-sm">✕</button>
        </div>

        <form onSubmit={submit} className="p-5 space-y-4">
          {/* Patient picker */}
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1.5">Patient *</label>
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
                <input
                  className="input"
                  placeholder="Search by name, number, phone or ID…"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  autoFocus
                />
                {searching && (
                  <p className="flex items-center gap-1.5 text-xs text-slate-400 mt-2">
                    <Loader2 size={12} className="animate-spin" /> Searching…
                  </p>
                )}
                {results.length > 0 && (
                  <ul className="mt-2 space-y-1 max-h-48 overflow-y-auto">
                    {results.map((p) => (
                      <li key={p.id}>
                        <button
                          type="button"
                          className="w-full flex items-center gap-2.5 p-2 rounded-lg hover:bg-slate-50 text-left"
                          onClick={() => {
                            setSelected(p);
                            setQuery('');
                            setResults([]);
                          }}
                        >
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
                {!searching && query.trim() && results.length === 0 && (
                  <p className="text-xs text-slate-400 mt-2">
                    No patients found — register the patient first, then queue them.
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Clinic allocation */}
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1.5">Clinic *</label>
            <select className="input" value={clinicType} onChange={(e) => setClinicType(e.target.value)}>
              {CLINIC_TYPES.map((c) => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
          </div>

          {/* Priority */}
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1.5">Priority *</label>
            <div className="grid grid-cols-3 gap-2">
              {PRIORITIES.map((p) => (
                <button
                  key={p.value}
                  type="button"
                  onClick={() => setPriority(p.value)}
                  title={p.hint}
                  className={`p-2.5 rounded-lg border text-center transition-colors ${
                    priority === p.value
                      ? p.value === 'Emergency'
                        ? 'bg-red-50 border-red-300 text-red-700'
                        : p.value === 'Urgent'
                          ? 'bg-amber-50 border-amber-300 text-amber-700'
                          : 'bg-indigo-50 border-indigo-300 text-indigo-700'
                      : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
                  }`}
                >
                  <span className="block text-xs font-semibold">{p.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1.5">Notes (optional)</label>
            <textarea
              className="input min-h-[64px]"
              placeholder="e.g. Fever 3 days, referred from MCH, review lab results…"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <button type="button" className="btn-ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={saving || !selected}>
              {saving && <Loader2 size={15} className="animate-spin" />}
              Queue patient
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
