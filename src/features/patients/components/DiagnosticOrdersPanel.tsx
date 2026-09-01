// ============================================================
// DiagnosticOrdersPanel.tsx
// Location: src/features/patients/components/DiagnosticOrdersPanel.tsx
//
// Imaging + procedure orders for a patient, tracked through the
// Ordered → Performed → Reported lifecycle with the clinician's report.
// Mirrors OpenMRS's imaging-orders / procedure-orders widgets.
// ============================================================

import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { ScanLine, Plus } from 'lucide-react';
import { FlagsAttachmentsOrdersService } from '@/features/consultations/services/flagsAttachmentsOrdersService';
import type { DiagnosticOrderDto } from '@/features/consultations/types/flagsAttachmentsOrders';
import CreateDiagnosticOrderModal from './CreateDiagnosticOrderModal';

const STATUS_CLS: Record<DiagnosticOrderDto['status'], string> = {
  Ordered: 'bg-slate-100 text-slate-600',
  Scheduled: 'bg-sky-100 text-sky-700',
  Performed: 'bg-amber-100 text-amber-700',
  Reported: 'bg-emerald-100 text-emerald-700',
  Cancelled: 'bg-slate-100 text-slate-400 line-through',
};

export default function DiagnosticOrdersPanel({ patientId }: { patientId: string }) {
  const [orders, setOrders] = useState<DiagnosticOrderDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);

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

  const act = async (fn: () => Promise<unknown>, ok: string) => {
    try {
      await fn();
      toast.success(ok);
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Action failed');
    }
  };

  return (
    <section className="card p-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
          <span className="text-indigo-600"><ScanLine size={15} /></span>
          Imaging & procedures
        </h3>
        <button type="button" onClick={() => setShowCreate(true)}
          className="btn-primary !py-1.5 text-xs inline-flex items-center gap-1.5">
          <Plus size={13} /> Order
        </button>
      </div>

      {loading ? (
        <p className="text-sm text-slate-400">Loading…</p>
      ) : orders.length === 0 ? (
        <p className="text-sm text-slate-400">No imaging or procedure orders.</p>
      ) : (
        <ul className="divide-y divide-slate-100">
          {orders.map((o) => (
            <li key={o.id} className="py-2.5">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-800">
                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold mr-1.5 ${o.type === 'Imaging' ? 'bg-indigo-100 text-indigo-700' : 'bg-violet-100 text-violet-700'}`}>
                      {o.type}
                    </span>
                    {o.name}
                    {o.bodySite ? ` · ${o.bodySite}` : ''}
                  </p>
                  <p className="text-xs text-slate-400">{o.clinicalIndication}</p>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${STATUS_CLS[o.status]}`}>
                  {o.status}
                </span>
              </div>

              {o.report && (
                <p className="text-xs text-slate-600 bg-slate-50 border border-slate-200 rounded p-2 mt-2">
                  <span className="font-semibold">Report: </span>{o.report}
                </p>
              )}

              {o.status === 'Performed' && (
                <button type="button" onClick={() => act(() => FlagsAttachmentsOrdersService.report(o.id, prompt('Enter report') ?? ''), 'Reported')}
                  className="mt-2 text-xs font-medium text-indigo-600 hover:text-indigo-800">
                  Add report
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      {showCreate && (
        <CreateDiagnosticOrderModal
          patientId={patientId}
          onClose={() => setShowCreate(false)}
          onSaved={() => { setShowCreate(false); void load(); }}
        />
      )}
    </section>
  );
}
