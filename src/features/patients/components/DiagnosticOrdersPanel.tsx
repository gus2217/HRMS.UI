// ============================================================
// DiagnosticOrdersPanel.tsx
// Location: src/features/patients/components/DiagnosticOrdersPanel.tsx
//
// Imaging + procedure orders for a patient, driven through the full
// hospital workflow:
//
//   Ordered → Scheduled → Performed → Reported   (or Cancelled with reason)
//
// Each transition is recorded with the acting user + timestamp and shown
// as a timeline on the card. Actions are shown only for the states that
// allow them, and the ordering clinician is notified the moment a report
// is recorded ("Imaging/procedure result ready").
// ============================================================

import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import {
  ScanLine, Plus, CalendarClock, Stethoscope, FileText, Ban, Loader2, CheckCircle2, Clock, XCircle,
} from 'lucide-react';
import { FlagsAttachmentsOrdersService } from '@/features/consultations/services/flagsAttachmentsOrdersService';
import type { DiagnosticOrderDto } from '@/features/consultations/types/flagsAttachmentsOrders';
import { formatDateTime } from '@/lib/format';
import { useAuth } from '@/features/auth/components/AuthContext';
import { hasPermission, PERMISSIONS } from '@/lib/permissions';
import CreateDiagnosticOrderModal from './CreateDiagnosticOrderModal';

const STATUS_CLS: Record<DiagnosticOrderDto['status'], string> = {
  Ordered: 'bg-slate-100 text-slate-600',
  Scheduled: 'bg-sky-100 text-sky-700',
  Performed: 'bg-amber-100 text-amber-700',
  Reported: 'bg-emerald-100 text-emerald-700',
  Cancelled: 'bg-slate-100 text-slate-400 line-through',
};

const PRIORITY_CLS: Record<DiagnosticOrderDto['priority'], string> = {
  Routine: 'bg-slate-100 text-slate-500',
  Urgent: 'bg-amber-100 text-amber-700',
  Emergency: 'bg-red-100 text-red-600',
};

export default function DiagnosticOrdersPanel({ patientId }: { patientId: string }) {
  const { permissions } = useAuth();
  const canAct = hasPermission(permissions, PERMISSIONS.CLINICAL_CONSULT);
  const [orders, setOrders] = useState<DiagnosticOrderDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [reportDraft, setReportDraft] = useState<Record<string, string>>({});
  const [reportingId, setReportingId] = useState<string | null>(null);
  const [cancelId, setCancelId] = useState<string | null>(null);
  const [cancelReason, setCancelReason] = useState('');

  const load = useCallback(async () => {
    try {
      setOrders(await FlagsAttachmentsOrdersService.byPatient(patientId));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to load diagnostic orders');
    } finally {
      setLoading(false);
    }
  }, [patientId]);

  useEffect(() => {
    void load();
  }, [load]);

  const act = async (orderId: string, fn: () => Promise<unknown>, ok: string) => {
    setBusyId(orderId);
    try {
      await fn();
      toast.success(ok);
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Action failed');
    } finally {
      setBusyId(null);
    }
  };

  const submitReport = async (o: DiagnosticOrderDto) => {
    const report = (reportDraft[o.id] ?? '').trim();
    if (!report) return toast.error('Report is required');
    setReportingId(o.id);
    try {
      await FlagsAttachmentsOrdersService.report(o.id, report);
      toast.success('Report saved — ordering clinician notified');
      setReportDraft((d) => ({ ...d, [o.id]: '' }));
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save report');
    } finally {
      setReportingId(null);
    }
  };

  const submitCancel = async (o: DiagnosticOrderDto) => {
    if (!cancelReason.trim()) return toast.error('A cancellation reason is required');
    setBusyId(o.id);
    try {
      await FlagsAttachmentsOrdersService.cancel(o.id, cancelReason.trim());
      toast.success('Order cancelled');
      setCancelId(null);
      setCancelReason('');
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to cancel order');
    } finally {
      setBusyId(null);
    }
  };

  // Which actions a status allows (hospital workflow).
  const canSchedule = (o: DiagnosticOrderDto) => canAct && o.status === 'Ordered';
  const canPerform = (o: DiagnosticOrderDto) => canAct && (o.status === 'Ordered' || o.status === 'Scheduled');
  const canReport = (o: DiagnosticOrderDto) => canAct && o.status === 'Performed';
  const canCancel = (o: DiagnosticOrderDto) => canAct && (o.status === 'Ordered' || o.status === 'Scheduled' || o.status === 'Performed');

  return (
    <section className="card p-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
          <span className="text-indigo-600"><ScanLine size={15} /></span>
          Imaging & procedures
        </h3>
        {canAct && (
          <button type="button" onClick={() => setShowCreate(true)}
            className="btn-primary !py-1.5 text-xs inline-flex items-center gap-1.5">
            <Plus size={13} /> Order
          </button>
        )}
      </div>

      {loading ? (
        <p className="text-sm text-slate-400">Loading…</p>
      ) : orders.length === 0 ? (
        <p className="text-sm text-slate-400">No imaging or procedure orders.</p>
      ) : (
        <div className="space-y-3">
          {orders.map((o) => (
            <div key={o.id} className={`rounded-xl border ${o.status === 'Cancelled' ? 'border-slate-200 bg-slate-50/50' : o.status === 'Reported' ? 'border-emerald-200' : 'border-slate-200'}`}>
              {/* Card header */}
              <div className="px-4 py-2.5 flex items-center justify-between gap-3 flex-wrap">
                <div className="min-w-0 flex items-center gap-2">
                  <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold ${o.type === 'Imaging' ? 'bg-indigo-100 text-indigo-700' : 'bg-violet-100 text-violet-700'}`}>
                    {o.type}
                  </span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${PRIORITY_CLS[o.priority]}`}>
                    {o.priority}
                  </span>
                  <span className="text-sm font-semibold text-slate-800 truncate">
                    {o.name}{o.bodySite ? ` · ${o.bodySite}` : ''}
                  </span>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${STATUS_CLS[o.status]}`}>
                  {o.status}
                </span>
              </div>

              <div className="px-4 pb-3 space-y-2">
                {/* Clinical indication */}
                <p className="text-xs text-slate-500">
                  <span className="font-medium text-slate-600">Indication:</span> {o.clinicalIndication}
                </p>

                {/* Timeline of who did what */}
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-slate-400 pt-1 border-t border-slate-100">
                  <span className="inline-flex items-center gap-1"><Clock size={11} /> Ordered {formatDateTime(o.orderedAtUtc)}</span>
                  {o.scheduledAtUtc && <span className="inline-flex items-center gap-1"><CalendarClock size={11} /> Scheduled {formatDateTime(o.scheduledAtUtc)}</span>}
                  {o.performedAtUtc && <span className="inline-flex items-center gap-1"><CheckCircle2 size={11} /> Performed {formatDateTime(o.performedAtUtc)}</span>}
                  {o.reportedAtUtc && <span className="inline-flex items-center gap-1 text-emerald-600"><FileText size={11} /> Reported {formatDateTime(o.reportedAtUtc)}</span>}
                  {o.cancelledAtUtc && <span className="inline-flex items-center gap-1 text-red-500"><XCircle size={11} /> Cancelled {formatDateTime(o.cancelledAtUtc)}</span>}
                </div>

                {/* Report body */}
                {o.report && (
                  <div className="text-xs bg-emerald-50/60 border border-emerald-200 rounded-lg p-2.5 text-slate-700">
                    <span className="font-semibold text-emerald-700">Report:</span> {o.report}
                  </div>
                )}
                {o.cancellationReason && (
                  <div className="text-xs bg-red-50 border border-red-100 rounded-lg p-2.5 text-slate-500">
                    <span className="font-semibold text-red-500">Reason:</span> {o.cancellationReason}
                  </div>
                )}

                {/* Actions per state */}
                {o.status !== 'Cancelled' && o.status !== 'Reported' && (
                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    {canSchedule(o) && (
                      <button
                        type="button"
                        disabled={busyId === o.id}
                        onClick={() => void act(o.id, () => FlagsAttachmentsOrdersService.schedule(o.id), 'Order scheduled')}
                        className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg border border-slate-200 text-slate-600 hover:text-sky-700 hover:border-sky-300 hover:bg-sky-50 transition-colors"
                      >
                        {busyId === o.id ? <Loader2 size={12} className="animate-spin" /> : <CalendarClock size={12} />}
                        Schedule
                      </button>
                    )}
                    {canPerform(o) && (
                      <button
                        type="button"
                        disabled={busyId === o.id}
                        onClick={() => void act(o.id, () => FlagsAttachmentsOrdersService.perform(o.id), 'Marked as performed')}
                        className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg border border-slate-200 text-slate-600 hover:text-amber-700 hover:border-amber-300 hover:bg-amber-50 transition-colors"
                      >
                        {busyId === o.id ? <Loader2 size={12} className="animate-spin" /> : <Stethoscope size={12} />}
                        Mark performed
                      </button>
                    )}
                    {canReport(o) && (
                      <span className="inline-flex items-center gap-1.5 flex-wrap">
                        <textarea
                          className="input !w-56 !py-1 text-xs"
                          rows={2}
                          placeholder="Enter imaging/procedure report…"
                          value={reportDraft[o.id] ?? ''}
                          onChange={(e) => setReportDraft((d) => ({ ...d, [o.id]: e.target.value }))}
                        />
                        <button
                          type="button"
                          disabled={reportingId === o.id}
                          onClick={() => void submitReport(o)}
                          className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition-colors"
                        >
                          {reportingId === o.id ? <Loader2 size={12} className="animate-spin" /> : <FileText size={12} />}
                          Save report
                        </button>
                      </span>
                    )}
                    {canCancel(o) && (
                      <button
                        type="button"
                        disabled={busyId === o.id}
                        onClick={() => { setCancelId(o.id); setCancelReason(''); }}
                        className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg border border-slate-200 text-slate-400 hover:text-red-600 hover:border-red-200 hover:bg-red-50 transition-colors"
                      >
                        <Ban size={12} /> Cancel
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {showCreate && (
        <CreateDiagnosticOrderModal
          patientId={patientId}
          onClose={() => setShowCreate(false)}
          onSaved={() => { setShowCreate(false); void load(); }}
        />
      )}

      {/* Cancel-reason modal */}
      {cancelId && (() => {
        const o = orders.find((x) => x.id === cancelId);
        if (!o) return null;
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4" onClick={() => setCancelId(null)}>
            <div className="card w-full max-w-md" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
                <h2 className="text-sm font-semibold text-slate-900">Cancel {o.type.toLowerCase()} order</h2>
                <button onClick={() => setCancelId(null)} className="text-slate-400 hover:text-slate-600 text-sm">✕</button>
              </div>
              <div className="p-5">
                <p className="text-sm text-slate-600 mb-3">
                  Cancel <span className="font-semibold text-slate-800">{o.name}</span>? A reason is required for the record.
                </p>
                <textarea
                  className="input w-full"
                  rows={3}
                  autoFocus
                  placeholder="Reason for cancellation (required)…"
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                />
              </div>
              <div className="flex justify-end gap-2 px-5 pb-5">
                <button className="btn-ghost" onClick={() => setCancelId(null)}>Keep order</button>
                <button
                  className="btn-primary bg-red-600 hover:bg-red-700"
                  disabled={busyId === o.id}
                  onClick={() => void submitCancel(o)}
                >
                  {busyId === o.id && <Loader2 size={14} className="animate-spin" />}
                  Cancel order
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </section>
  );
}
