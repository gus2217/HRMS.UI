// ============================================================
// RaiseFlagModal.tsx
// Location: src/features/patients/components/RaiseFlagModal.tsx
// ============================================================

import { useState } from 'react';
import toast from 'react-hot-toast';
import { Loader2 } from 'lucide-react';
import { FlagsAttachmentsOrdersService } from '@/features/consultations/services/flagsAttachmentsOrdersService';
import type { PatientFlagDto } from '@/features/consultations/types/flagsAttachmentsOrders';

interface Props {
  patientId: string;
  onClose: () => void;
  onSaved: () => void;
}

const TYPES: { value: PatientFlagDto['type']; label: string }[] = [
  { value: 'Allergy', label: 'Allergy alert' },
  { value: 'Warning', label: 'Safety warning (fall risk, NPO, isolation…)' },
  { value: 'Medical', label: 'Medical note (diabetic, asthmatic…)' },
  { value: 'Info', label: 'Info (language, special needs…)' },
];

export default function RaiseFlagModal({ patientId, onClose, onSaved }: Props) {
  const [type, setType] = useState<PatientFlagDto['type']>('Allergy');
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!message.trim()) return toast.error('Message is required');
    setSaving(true);
    try {
      await FlagsAttachmentsOrdersService.raiseFlag(patientId, { type, message: message.trim() });
      toast.success('Flag raised');
      onSaved();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to raise flag');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="card w-full max-w-md" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
          <h2 className="text-sm font-semibold text-slate-900">Add patient flag</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-sm">✕</button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1.5">Type</label>
            <select className="input" value={type} onChange={(e) => setType(e.target.value as PatientFlagDto['type'])}>
              {TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1.5">Message</label>
            <input
              className="input"
              placeholder={type === 'Allergy' ? 'e.g. Penicillin allergy' : 'e.g. High fall risk'}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              autoFocus
            />
          </div>
        </div>
        <div className="flex justify-end gap-2 px-5 pb-5">
          <button className="btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn-primary" disabled={saving} onClick={() => void save()}>
            {saving && <Loader2 size={15} className="animate-spin" />}
            Add flag
          </button>
        </div>
      </div>
    </div>
  );
}
