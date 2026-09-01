// ============================================================
// RecordImmunizationModal.tsx
// Location: src/features/patients/components/RecordImmunizationModal.tsx
// ============================================================

import { useState } from 'react';
import toast from 'react-hot-toast';
import { Loader2 } from 'lucide-react';
import { PatientClinicalService } from '@/features/consultations/services/patientClinicalService';

interface Props {
  patientId: string;
  onClose: () => void;
  onSaved: () => void;
}

const COMMON_VACCINES = [
  'BCG', 'OPV', 'Pentavalent (DPT-HepB-Hib)', 'PCV', 'Rotavirus',
  'Measles-Rubella (MR)', 'Yellow Fever', 'Td (Tetanus-diphtheria)',
  'HPV', 'COVID-19', 'Influenza', 'Hepatitis B',
];

export default function RecordImmunizationModal({ patientId, onClose, onSaved }: Props) {
  const [vaccineName, setVaccineName] = useState('');
  const [doseNumber, setDoseNumber] = useState('1');
  const [administeredDate, setAdministeredDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [nextDueDate, setNextDueDate] = useState('');
  const [lotNumber, setLotNumber] = useState('');
  const [site, setSite] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!vaccineName.trim()) return toast.error('Vaccine name is required');
    setSaving(true);
    try {
      await PatientClinicalService.recordImmunization(patientId, {
        vaccineName: vaccineName.trim(),
        doseNumber: Math.max(1, parseInt(doseNumber, 10) || 1),
        administeredDate,
        nextDueDate: nextDueDate || null,
        lotNumber: lotNumber || null,
        site: site || null,
        notes: notes || null,
      });
      toast.success('Immunization recorded');
      onSaved();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to record immunization');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="card w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
          <h2 className="text-sm font-semibold text-slate-900">Record immunization</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-sm">✕</button>
        </div>
        <div className="p-5 grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className="block text-xs font-medium text-slate-500 mb-1.5">Vaccine</label>
            <input
              className="input"
              list="vaccines"
              placeholder="Select or type a vaccine…"
              value={vaccineName}
              onChange={(e) => setVaccineName(e.target.value)}
              autoFocus
            />
            <datalist id="vaccines">
              {COMMON_VACCINES.map((v) => <option key={v} value={v} />)}
            </datalist>
          </div>
          <Field label="Dose number" value={doseNumber} onChange={setDoseNumber} type="number" />
          <Field label="Administered date" value={administeredDate} onChange={setAdministeredDate} type="date" />
          <Field label="Next due date" value={nextDueDate} onChange={setNextDueDate} type="date" />
          <Field label="Lot number" value={lotNumber} onChange={setLotNumber} />
          <Field label="Site" value={site} onChange={setSite} placeholder="e.g. Left thigh" />
          <div className="col-span-2">
            <label className="block text-xs font-medium text-slate-500 mb-1.5">Notes</label>
            <textarea className="input" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
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
  label, value, onChange, type = 'text', placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-slate-500 mb-1.5">{label}</label>
      <input
        type={type}
        className="input"
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}
