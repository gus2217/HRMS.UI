// ============================================================
// PatientFlagsBanner.tsx
// Location: src/features/patients/components/PatientFlagsBanner.tsx
//
// Prominent alert banner for active patient flags (allergy alerts,
// safety warnings). Mirrors the OpenMRS "Patient Flags" widget.
// ============================================================

import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { AlertTriangle, Info, ShieldAlert, Stethoscope, Plus, X } from 'lucide-react';
import { FlagsAttachmentsOrdersService } from '@/features/consultations/services/flagsAttachmentsOrdersService';
import type { PatientFlagDto } from '@/features/consultations/types/flagsAttachmentsOrders';
import RaiseFlagModal from './RaiseFlagModal';

const FLAG_STYLE: Record<PatientFlagDto['type'], { icon: React.ReactNode; cls: string }> = {
  Allergy: { icon: <ShieldAlert size={15} />, cls: 'bg-red-50 border-red-200 text-red-800' },
  Warning: { icon: <AlertTriangle size={15} />, cls: 'bg-amber-50 border-amber-200 text-amber-800' },
  Medical: { icon: <Stethoscope size={15} />, cls: 'bg-sky-50 border-sky-200 text-sky-800' },
  Info: { icon: <Info size={15} />, cls: 'bg-slate-50 border-slate-200 text-slate-600' },
};

export default function PatientFlagsBanner({ patientId }: { patientId: string }) {
  const [flags, setFlags] = useState<PatientFlagDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);

  const load = useCallback(async () => {
    try {
      setFlags(await FlagsAttachmentsOrdersService.activeFlags(patientId));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to load flags');
    } finally {
      setLoading(false);
    }
  }, [patientId]);

  useEffect(() => {
    void load();
  }, [load]);

  const deactivate = async (id: string) => {
    try {
      await FlagsAttachmentsOrdersService.deactivateFlag(id);
      toast.success('Flag cleared');
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to clear flag');
    }
  };

  if (loading) return null;

  return (
    <>
      {flags.length > 0 && (
        <div className="space-y-2">
          {flags.map((f) => {
            const s = FLAG_STYLE[f.type];
            return (
              <div key={f.id} className={`flex items-center gap-3 rounded-lg border px-4 py-2.5 text-sm ${s.cls}`}>
                <span className="shrink-0">{s.icon}</span>
                <span className="flex-1">
                  <span className="font-semibold mr-1.5">{f.type}</span>
                  {f.message}
                </span>
                <button
                  type="button"
                  onClick={() => void deactivate(f.id)}
                  title="Clear flag"
                  className="shrink-0 opacity-60 hover:opacity-100 transition-opacity"
                >
                  <X size={15} />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {!flags.some((f) => f.type === 'Allergy') && (
        <button
          type="button"
          onClick={() => setShowAdd(true)}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-indigo-600 hover:text-indigo-800 transition-colors"
        >
          <Plus size={13} /> Add flag
        </button>
      )}

      {showAdd && (
        <RaiseFlagModal
          patientId={patientId}
          onClose={() => setShowAdd(false)}
          onSaved={() => { setShowAdd(false); void load(); }}
        />
      )}
    </>
  );
}
