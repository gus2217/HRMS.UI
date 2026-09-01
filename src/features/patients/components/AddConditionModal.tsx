// ============================================================
// AddConditionModal.tsx
// Location: src/features/patients/components/AddConditionModal.tsx
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

export default function AddConditionModal({ patientId, onClose, onSaved }: Props) {
  const [description, setDescription] = useState('');
  const [code, setCode] = useState('');
  const [onsetDate, setOnsetDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!description.trim()) return toast.error('Description is required');
    setSaving(true);
    try {
      await PatientClinicalService.addCondition(patientId, {
        description: description.trim(),
        code: code.trim() || null,
        onsetDate,
      });
      toast.success('Condition added to problem list');
      onSaved();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to add condition');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="card w-full max-w-md" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
          <h2 className="text-sm font-semibold text-slate-900">Add condition</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-sm">✕</button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1.5">Condition description</label>
            <input
              className="input"
              placeholder="e.g. Type 2 diabetes mellitus"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              autoFocus
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">ICD-10 code (optional)</label>
              <input
                className="input"
                placeholder="e.g. E11.9"
                value={code}
                onChange={(e) => setCode(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">Onset date</label>
              <input
                type="date"
                className="input"
                value={onsetDate}
                onChange={(e) => setOnsetDate(e.target.value)}
              />
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-2 px-5 pb-5">
          <button className="btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn-primary" disabled={saving} onClick={() => void save()}>
            {saving && <Loader2 size={15} className="animate-spin" />}
            Add
          </button>
        </div>
      </div>
    </div>
  );
}
