// ============================================================
// TransferPatientModal.tsx
// Location: src/features/inpatient/components/TransferPatientModal.tsx
//
// Ward-to-ward transfer: pick a target ward (with live capacity
// shown) and a bed number. Backend enforces ward capacity and
// raises a PatientTransferred notification to doctors/nurses.
// ============================================================

import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Loader2 } from 'lucide-react';
import { InpatientService } from '../services/inpatientService';
import type { WardDto } from '../types/inpatient';

interface Props {
  admissionId: string;
  currentWardId: string;
  currentWardName: string;
  onClose: () => void;
  onTransferred: (updated: unknown) => void;
}

export default function TransferPatientModal({ admissionId, currentWardId, currentWardName, onClose, onTransferred }: Props) {
  const [wards, setWards] = useState<WardDto[]>([]);
  const [targetWardId, setTargetWardId] = useState('');
  const [bedNumber, setBedNumber] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    InpatientService.wards(true)
      .then(setWards)
      .catch(() => toast.error('Failed to load wards'))
      .finally(() => setLoading(false));
  }, []);

  const save = async () => {
    if (!targetWardId) {
      toast.error('Select a target ward.');
      return;
    }
    if (!bedNumber.trim()) {
      toast.error('Enter the bed number.');
      return;
    }
    setSaving(true);
    try {
      const updated = await InpatientService.transfer(admissionId, {
        targetWardId,
        bedNumber: bedNumber.trim(),
      });
      toast.success('Patient transferred');
      onTransferred(updated);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to transfer patient');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="card w-full max-w-md" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
          <h2 className="text-sm font-semibold text-slate-900">Transfer patient</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-sm">✕</button>
        </div>

        <div className="p-5 space-y-4">
          <p className="text-xs text-slate-500">
            Currently in <span className="font-medium text-slate-700">{currentWardName}</span>. The new ward's staff will be
            notified automatically.
          </p>

          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Target ward</label>
            <select
              className="input"
              value={targetWardId}
              disabled={loading}
              onChange={(e) => setTargetWardId(e.target.value)}
            >
              <option value="">Select ward…</option>
              {wards
                .filter((w) => w.id !== currentWardId)
                .map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name} ({w.totalBeds} beds)
                  </option>
                ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Bed number</label>
            <input
              className="input"
              placeholder="e.g. Bed 4"
              value={bedNumber}
              onChange={(e) => setBedNumber(e.target.value)}
            />
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <button className="btn-ghost" onClick={onClose}>Cancel</button>
            <button className="btn-primary" disabled={saving || loading} onClick={() => void save()}>
              {saving && <Loader2 size={15} className="animate-spin" />}
              Transfer
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
