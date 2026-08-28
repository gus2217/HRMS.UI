// ============================================================
// ConsultationDetailView.tsx
// Location: src/features/consultations/components/ConsultationDetailView.tsx
//
// Works one consultation: start (when none exists), triage vitals,
// begin clinical phase, record diagnosis, add notes, complete.
// Every action is gated by the backend-mirroring permission:
//   triage/begin/notes  → Clinical.Consult
//   diagnosis/complete  → Clinical.RecordDiagnosis
// ============================================================

import { useState, type FormEvent } from 'react';
import toast from 'react-hot-toast';
import { Loader2, Activity, ClipboardList, CheckCircle2 } from 'lucide-react';
import { ConsultationService } from '../services/consultationService';
import type { ConsultationDetail } from '../types/consultation';
import { formatDateTime } from '@/lib/format';
import { useAuth } from '@/features/auth/components/AuthContext';
import { hasPermission, PERMISSIONS } from '@/lib/permissions';

interface Props {
  consultation: ConsultationDetail | null;
  patientId?: string;
  patientName?: string;
  patientNumber?: string;
  onChanged: (c: ConsultationDetail) => void;
}

export default function ConsultationDetailView({ consultation, patientId, patientName, patientNumber, onChanged }: Props) {
  const { user, permissions } = useAuth();
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [showDiagnosis, setShowDiagnosis] = useState(false);

  const canConsult = hasPermission(permissions, PERMISSIONS.CLINICAL_CONSULT);
  const canDiagnose = hasPermission(permissions, PERMISSIONS.CLINICAL_RECORD_DIAGNOSIS);

  const run = async (fn: () => Promise<ConsultationDetail>) => {
    setBusy(true);
    try {
      const updated = await fn();
      onChanged(updated);
      toast.success('Saved');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Request failed');
    } finally {
      setBusy(false);
    }
  };

  if (!consultation) {
    return (
      <div className="text-center py-10">
        <p className="text-sm text-slate-500 mb-4">
          {patientName ? `No active consultation for ${patientName}${patientNumber ? ` (${patientNumber})` : ''} yet.` : 'No consultation selected.'}
        </p>
        {canConsult && patientId && (
          <button
            className="btn-primary"
            disabled={busy}
            onClick={() => void run(() => ConsultationService.start(patientId, user?.id ?? ''))}
          >
            {busy && <Loader2 size={15} className="animate-spin" />}
            Start consultation
          </button>
        )}
        {canConsult && !patientId && (
          <p className="text-xs text-slate-400">Select a patient to start a consultation.</p>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-slate-900">Consultation</p>
          <p className="text-xs text-slate-400 mt-0.5">{formatDateTime(consultation.startedAtUtc)}</p>
        </div>
        <span className="text-xs px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
          {consultation.status}
        </span>
      </div>

      {/* Triage */}
      <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
          <Activity size={12} /> Triage vitals
        </p>
        {consultation.triage ? (
          <div className="grid grid-cols-5 gap-2 text-center text-sm">
            <Vital label="Temp" value={consultation.triage.temperatureCelsius ? `${consultation.triage.temperatureCelsius}°C` : '—'} />
            <Vital label="BP" value={consultation.triage.bloodPressure ?? '—'} />
            <Vital label="Pulse" value={consultation.triage.pulseRate?.toString() ?? '—'} />
            <Vital label="Resp" value={consultation.triage.respiratoryRate?.toString() ?? '—'} />
            <Vital label="Weight" value={consultation.triage.weightKg ? `${consultation.triage.weightKg}kg` : '—'} />
          </div>
        ) : canConsult ? (
          <TriageForm onSave={(input) => void run(() => ConsultationService.recordTriage(consultation.id, input))} />
        ) : (
          <p className="text-sm text-slate-400">Not recorded.</p>
        )}
      </div>

      {/* Begin clinical phase — required before diagnosis/complete (backend workflow) */}
      {(consultation.status === 'Triaged' || consultation.status === 'AwaitingClinician') && canConsult && (
        <button
          className="btn-ghost w-full text-sky-600 border-sky-300 hover:bg-sky-50"
          disabled={busy}
          onClick={() => void run(() => ConsultationService.begin(consultation.id))}
        >
          {busy && <Loader2 size={15} className="animate-spin" />}
          Begin clinical phase
        </button>
      )}

      {/* Diagnoses */}
      <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200">
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
            <ClipboardList size={12} /> Diagnoses
          </p>
          {canDiagnose && (
            <button className="text-xs font-medium text-indigo-600" onClick={() => setShowDiagnosis((v) => !v)}>
              + Add
            </button>
          )}
        </div>
        {consultation.diagnoses.length === 0 && !showDiagnosis ? (
          <p className="text-sm text-slate-400">None recorded.</p>
        ) : (
          <div className="space-y-2">
            {consultation.diagnoses.map((d, i) => (
              <div key={i} className="flex items-start gap-2 text-sm">
                <span className="font-mono text-xs px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-700">{d.icdCode}</span>
                <span className="text-slate-600">{d.description}</span>
              </div>
            ))}
            {showDiagnosis && canDiagnose && (
              <DiagnosisForm
                onCancel={() => setShowDiagnosis(false)}
                onSave={(input) =>
                  void run(() => {
                    setShowDiagnosis(false);
                    return ConsultationService.recordDiagnosis(consultation.id, input);
                  })
                }
              />
            )}
          </div>
        )}
      </div>

      {/* Notes */}
      <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Clinical notes</p>
        {consultation.notes.length > 0 && (
          <ul className="space-y-2 mb-3">
            {consultation.notes.map((n, i) => (
              <li key={i} className="text-sm text-slate-600">
                {n.content}
                <span className="block text-[11px] text-slate-400 mt-0.5">{formatDateTime(n.recordedAtUtc)}</span>
              </li>
            ))}
          </ul>
        )}
        {canConsult && (
          <div className="flex gap-2">
            <input className="input" placeholder="Add a clinical note…" value={note} onChange={(e) => setNote(e.target.value)} />
            <button
              className="btn-primary shrink-0"
              disabled={busy || !note.trim()}
              onClick={() => {
                const content = note.trim();
                setNote('');
                void run(() => ConsultationService.addNote(consultation.id, content));
              }}
            >
              Add
            </button>
          </div>
        )}
      </div>

      {/* Complete */}
      {consultation.status !== 'Completed' && canDiagnose && (
        <button
          className="btn-ghost w-full text-emerald-600 border-emerald-300 hover:bg-emerald-50"
          disabled={busy}
          onClick={() => void run(() => ConsultationService.complete(consultation.id))}
        >
          <CheckCircle2 size={15} />
          Complete consultation
        </button>
      )}
    </div>
  );
}

function Vital({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[11px] text-slate-400">{label}</p>
      <p className="font-medium text-slate-700">{value}</p>
    </div>
  );
}

function TriageForm({
  onSave,
}: {
  onSave: (input: {
    temperatureCelsius?: number | null;
    bloodPressure?: string | null;
    pulseRate?: number | null;
    respiratoryRate?: number | null;
    weightKg?: number | null;
  }) => void;
}) {
  const [temperatureCelsius, setTemperatureCelsius] = useState('');
  const [bloodPressure, setBloodPressure] = useState('');
  const [pulseRate, setPulseRate] = useState('');
  const [respiratoryRate, setRespiratoryRate] = useState('');
  const [weightKg, setWeightKg] = useState('');

  const submit = (e: FormEvent) => {
    e.preventDefault();
    onSave({
      temperatureCelsius: temperatureCelsius ? Number(temperatureCelsius) : null,
      bloodPressure: bloodPressure.trim() || null,
      pulseRate: pulseRate ? Number(pulseRate) : null,
      respiratoryRate: respiratoryRate ? Number(respiratoryRate) : null,
      weightKg: weightKg ? Number(weightKg) : null,
    });
  };

  return (
    <form onSubmit={submit} className="space-y-2">
      <div className="grid grid-cols-5 gap-2">
        <input className="input text-xs py-1.5" placeholder="Temp °C" value={temperatureCelsius} onChange={(e) => setTemperatureCelsius(e.target.value)} />
        <input className="input text-xs py-1.5" placeholder="BP" value={bloodPressure} onChange={(e) => setBloodPressure(e.target.value)} />
        <input className="input text-xs py-1.5" placeholder="Pulse" value={pulseRate} onChange={(e) => setPulseRate(e.target.value)} />
        <input className="input text-xs py-1.5" placeholder="Resp" value={respiratoryRate} onChange={(e) => setRespiratoryRate(e.target.value)} />
        <input className="input text-xs py-1.5" placeholder="Weight kg" value={weightKg} onChange={(e) => setWeightKg(e.target.value)} />
      </div>
      <button type="submit" className="btn-primary text-xs py-1.5">Save triage</button>
    </form>
  );
}

function DiagnosisForm({
  onCancel,
  onSave,
}: {
  onCancel: () => void;
  onSave: (input: { icdCode: string; description: string; isPrimary: boolean }) => void;
}) {
  const [icdCode, setIcdCode] = useState('');
  const [description, setDescription] = useState('');
  const [isPrimary, setIsPrimary] = useState(true);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!icdCode.trim() || !description.trim()) {
      toast.error('ICD code and description are required.');
      return;
    }
    onSave({ icdCode: icdCode.trim(), description: description.trim(), isPrimary });
  };

  return (
    <form onSubmit={submit} className="space-y-2 pt-2">
      <div className="flex gap-2">
        <input className="input w-28" placeholder="ICD-10" value={icdCode} onChange={(e) => setIcdCode(e.target.value)} />
        <input className="input" placeholder="Description" value={description} onChange={(e) => setDescription(e.target.value)} />
      </div>
      <div className="flex items-center justify-between">
        <label className="flex items-center gap-2 text-xs text-slate-500">
          <input type="checkbox" checked={isPrimary} onChange={(e) => setIsPrimary(e.target.checked)} />
          Primary diagnosis
        </label>
        <div className="flex gap-2">
          <button type="button" className="btn-ghost text-xs py-1.5" onClick={onCancel}>Cancel</button>
          <button type="submit" className="btn-primary text-xs py-1.5">Save</button>
        </div>
      </div>
    </form>
  );
}
