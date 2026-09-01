// ============================================================
// RecordVitalsModal.tsx
// Location: src/features/patients/components/RecordVitalsModal.tsx
// ============================================================

import { useState } from 'react';
import toast from 'react-hot-toast';
import { Loader2 } from 'lucide-react';
import { PatientClinicalService } from '@/features/consultations/services/patientClinicalService';
import type { RecordVitalsInput } from '@/features/consultations/types/patientClinical';

interface Props {
  patientId: string;
  onClose: () => void;
  onSaved: () => void;
}

const EMPTY: RecordVitalsInput = {
  temperatureCelsius: null,
  systolicBp: null,
  diastolicBp: null,
  pulseRate: null,
  respiratoryRate: null,
  oxygenSaturation: null,
  weightKg: null,
  heightCm: null,
};

function num(v: string): number | null {
  if (v.trim() === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

export default function RecordVitalsModal({ patientId, onClose, onSaved }: Props) {
  const [form, setForm] = useState<RecordVitalsInput>(EMPTY);
  const [saving, setSaving] = useState(false);

  const set = (key: keyof RecordVitalsInput) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [key]: num(e.target.value) }));

  const save = async () => {
    setSaving(true);
    try {
      await PatientClinicalService.recordVitals(patientId, form);
      toast.success('Vitals recorded');
      onSaved();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to record vitals');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="card w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
          <h2 className="text-sm font-semibold text-slate-900">Record vitals</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-sm">✕</button>
        </div>
        <div className="p-5 grid grid-cols-2 gap-4">
          <Field label="Temperature (°C)" value={form.temperatureCelsius} onChange={set('temperatureCelsius')} placeholder="36.8" />
          <Field label="SpO₂ (%)" value={form.oxygenSaturation} onChange={set('oxygenSaturation')} placeholder="98" />
          <Field label="Systolic BP" value={form.systolicBp} onChange={set('systolicBp')} placeholder="120" />
          <Field label="Diastolic BP" value={form.diastolicBp} onChange={set('diastolicBp')} placeholder="80" />
          <Field label="Pulse (bpm)" value={form.pulseRate} onChange={set('pulseRate')} placeholder="72" />
          <Field label="Respiratory rate" value={form.respiratoryRate} onChange={set('respiratoryRate')} placeholder="16" />
          <Field label="Weight (kg)" value={form.weightKg} onChange={set('weightKg')} placeholder="70" />
          <Field label="Height (cm)" value={form.heightCm} onChange={set('heightCm')} placeholder="170" />
        </div>
        <div className="flex justify-end gap-2 px-5 pb-5">
          <button className="btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn-primary" disabled={saving} onClick={() => void save()}>
            {saving && <Loader2 size={15} className="animate-spin" />}
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({
  label, value, onChange, placeholder,
}: {
  label: string;
  value: number | null | undefined;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-slate-500 mb-1.5">{label}</label>
      <input
        type="number"
        step="any"
        className="input"
        placeholder={placeholder}
        value={value ?? ''}
        onChange={onChange}
      />
    </div>
  );
}
