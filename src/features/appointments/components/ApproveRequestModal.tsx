// ============================================================
// ApproveRequestModal.tsx
// Location: src/features/appointments/components/ApproveRequestModal.tsx
//
// Clinician approves a reception appointment request: picks the date/time,
// duration and type, then the real appointment is created.
// ============================================================

import { useState, type FormEvent } from 'react';
import toast from 'react-hot-toast';
import { Loader2 } from 'lucide-react';
import { AppointmentService } from '../services/appointmentService';
import type { AppointmentRequest, Appointment } from '../types/appointment';
import { clinicLabel } from '@/features/clinical/clinics';

interface Props {
  request: AppointmentRequest;
  onClose: () => void;
  onApproved: (appt: Appointment) => void;
}

const TYPES = [
  { value: 'Consultation', label: 'Consultation' },
  { value: 'FollowUp', label: 'Follow-up' },
  { value: 'CheckUp', label: 'Check-up' },
  { value: 'Review', label: 'Review' },
  { value: 'Procedure', label: 'Procedure' },
  { value: 'Other', label: 'Other' },
];

export default function ApproveRequestModal({ request, onClose, onApproved }: Props) {
  const [date, setDate] = useState(request.preferredDate ?? '');
  const [time, setTime] = useState('09:00');
  const [durationMinutes, setDurationMinutes] = useState(20);
  const [type, setType] = useState('Consultation');
  const [saving, setSaving] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!date || !time) {
      toast.error('Date and time are required.');
      return;
    }
    setSaving(true);
    try {
      const appt = await AppointmentService.approveRequest(request.id, {
        scheduledAtUtc: new Date(`${date}T${time}:00`).toISOString(),
        durationMinutes,
        type,
      });
      onApproved(appt);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to approve request');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="card w-full max-w-md" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
          <h2 className="text-sm font-semibold text-slate-900">Approve appointment request</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-sm">✕</button>
        </div>

        <form onSubmit={submit} className="p-5 space-y-4">
          <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
            <p className="text-sm font-medium text-slate-900">{request.patientName || '—'}</p>
            <p className="text-xs text-slate-500 mt-0.5">{request.reason}</p>
            <p className="text-[11px] text-slate-400 mt-1">
              {clinicLabel(request.clinicType)} · requested by {request.requestedByName}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">Date *</label>
              <input type="date" className="input" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">Time *</label>
              <input type="time" className="input" value={time} onChange={(e) => setTime(e.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">Duration (mins)</label>
              <input type="number" min={5} max={480} step={5} className="input" value={durationMinutes}
                onChange={(e) => setDurationMinutes(Number(e.target.value))} />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">Type</label>
              <select className="input" value={type} onChange={(e) => setType(e.target.value)}>
                {TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <button type="button" className="btn-ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving && <Loader2 size={15} className="animate-spin" />}
              Approve & schedule
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
