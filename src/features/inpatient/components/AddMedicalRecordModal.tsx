// ============================================================
// AddMedicalRecordModal.tsx
// Location: src/features/inpatient/components/AddMedicalRecordModal.tsx
//
// Day-to-day ward follow-up: SOAP progress note + vitals. The
// discharge gate requires at least one record with assessment + plan.
// ============================================================

import { useState } from 'react';
import toast from 'react-hot-toast';
import { Loader2 } from 'lucide-react';
import { InpatientService } from '../services/inpatientService';

interface Props {
  admissionId: string;
  onClose: () => void;
  onSaved: () => void;
}

export default function AddMedicalRecordModal({ admissionId, onClose, onSaved }: Props) {
  const [temperature, setTemperature] = useState('');
  const [systolic, setSystolic] = useState('');
  const [diastolic, setDiastolic] = useState('');
  const [pulse, setPulse] = useState('');
  const [respiratory, setRespiratory] = useState('');
  const [spo2, setSpo2] = useState('');
  const [weight, setWeight] = useState('');
  const [subjective, setSubjective] = useState('');
  const [objective, setObjective] = useState('');
  const [assessment, setAssessment] = useState('');
  const [plan, setPlan] = useState('');
  const [saving, setSaving] = useState(false);

  const num = (v: string): number | null => {
    if (v.trim() === '') return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  };

  const save = async () => {
    setSaving(true);
    try {
      await InpatientService.addMedicalRecord(admissionId, {
        temperatureCelsius: num(temperature),
        systolicBp: num(systolic),
        diastolicBp: num(diastolic),
        pulseRate: num(pulse),
        respiratoryRate: num(respiratory),
        oxygenSaturation: num(spo2),
        weightKg: num(weight),
        subjective: subjective || null,
        objective: objective || null,
        assessment: assessment || null,
        plan: plan || null,
      });
      toast.success('Ward record saved');
      onSaved();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save record');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="card w-full max-w-2xl max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 sticky top-0 bg-white">
          <h2 className="text-sm font-semibold text-slate-900">Day-to-day ward record</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-sm">✕</button>
        </div>

        <div className="p-5 space-y-5">
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Vitals</p>
            <div className="grid grid-cols-4 gap-3">
              <VitalField label="Temp °C" value={temperature} onChange={setTemperature} />
              <VitalField label="Systolic BP" value={systolic} onChange={setSystolic} />
              <VitalField label="Diastolic BP" value={diastolic} onChange={setDiastolic} />
              <VitalField label="Pulse" value={pulse} onChange={setPulse} />
              <VitalField label="Resp rate" value={respiratory} onChange={setRespiratory} />
              <VitalField label="SpO₂ %" value={spo2} onChange={setSpo2} />
              <VitalField label="Weight kg" value={weight} onChange={setWeight} />
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">SOAP note</p>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">S — Subjective</label>
                <textarea className="input" rows={2} placeholder="Patient's own account / complaints" value={subjective} onChange={(e) => setSubjective(e.target.value)} />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">O — Objective</label>
                <textarea className="input" rows={2} placeholder="Examination findings, observations" value={objective} onChange={(e) => setObjective(e.target.value)} />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">
                  A — Assessment <span className="text-emerald-600">(required for discharge)</span>
                </label>
                <textarea className="input" rows={2} placeholder="Clinical impression / working diagnosis" value={assessment} onChange={(e) => setAssessment(e.target.value)} />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">
                  P — Plan <span className="text-emerald-600">(required for discharge)</span>
                </label>
                <textarea className="input" rows={2} placeholder="Next steps, medications, reviews" value={plan} onChange={(e) => setPlan(e.target.value)} />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <button className="btn-ghost" onClick={onClose}>Cancel</button>
            <button className="btn-primary" disabled={saving} onClick={() => void save()}>
              {saving && <Loader2 size={15} className="animate-spin" />}
              Save record
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function VitalField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="block text-[11px] font-medium text-slate-500 mb-1">{label}</label>
      <input className="input" type="number" step="any" value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}
