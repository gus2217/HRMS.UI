// ============================================================
// CreateDiagnosticOrderModal.tsx
// Location: src/features/patients/components/CreateDiagnosticOrderModal.tsx
// ============================================================

import { useState } from 'react';
import toast from 'react-hot-toast';
import { Loader2 } from 'lucide-react';
import { FlagsAttachmentsOrdersService } from '@/features/consultations/services/flagsAttachmentsOrdersService';
import type { DiagnosticOrderType, DiagnosticOrderPriority } from '@/features/consultations/types/flagsAttachmentsOrders';

interface Props {
  patientId: string;
  onClose: () => void;
  onSaved: () => void;
}

const IMAGING_PRESETS = ['X-ray', 'Ultrasound', 'CT scan', 'MRI', 'Mammogram', 'ECG', 'Echocardiogram'];
const PROCEDURE_PRESETS = ['Minor surgery', 'Wound dressing', 'Incision & drainage', 'Casting', 'Endoscopy', 'Physiotherapy'];

export default function CreateDiagnosticOrderModal({ patientId, onClose, onSaved }: Props) {
  const [type, setType] = useState<DiagnosticOrderType>('Imaging');
  const [name, setName] = useState('');
  const [bodySite, setBodySite] = useState('');
  const [indication, setIndication] = useState('');
  const [priority, setPriority] = useState<DiagnosticOrderPriority>('Routine');
  const [saving, setSaving] = useState(false);

  const presets = type === 'Imaging' ? IMAGING_PRESETS : PROCEDURE_PRESETS;

  const save = async () => {
    if (!name.trim()) return toast.error('Order name is required');
    if (!indication.trim()) return toast.error('Clinical indication is required');
    setSaving(true);
    try {
      await FlagsAttachmentsOrdersService.createOrder({
        patientId,
        consultationId: null,
        type,
        name: name.trim(),
        bodySite: bodySite.trim() || null,
        clinicalIndication: indication.trim(),
        priority,
      });
      toast.success('Order placed');
      onSaved();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to place order');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="card w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
          <h2 className="text-sm font-semibold text-slate-900">Order imaging / procedure</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-sm">✕</button>
        </div>
        <div className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">Type</label>
              <select className="input" value={type} onChange={(e) => { setType(e.target.value as DiagnosticOrderType); setName(''); }}>
                <option value="Imaging">Imaging</option>
                <option value="Procedure">Procedure</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">Priority</label>
              <select className="input" value={priority} onChange={(e) => setPriority(e.target.value as DiagnosticOrderPriority)}>
                <option value="Routine">Routine</option>
                <option value="Urgent">Urgent</option>
                <option value="Emergency">Emergency</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1.5">{type === 'Imaging' ? 'Imaging study' : 'Procedure'}</label>
            <input className="input" list="order-presets" placeholder={`e.g. ${presets[0]}`} value={name}
              onChange={(e) => setName(e.target.value)} autoFocus />
            <datalist id="order-presets">
              {presets.map((p) => <option key={p} value={p} />)}
            </datalist>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1.5">Body site (optional)</label>
            <input className="input" placeholder="e.g. Left ankle" value={bodySite} onChange={(e) => setBodySite(e.target.value)} />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1.5">Clinical indication</label>
            <textarea className="input" rows={2} placeholder="Why is this being ordered?"
              value={indication} onChange={(e) => setIndication(e.target.value)} />
          </div>
        </div>
        <div className="flex justify-end gap-2 px-5 pb-5">
          <button className="btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn-primary" disabled={saving} onClick={() => void save()}>
            {saving && <Loader2 size={15} className="animate-spin" />}
            Place order
          </button>
        </div>
      </div>
    </div>
  );
}
