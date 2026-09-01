// ============================================================
// ClinicalSummaryPanel.tsx
// Location: src/features/patients/components/ClinicalSummaryPanel.tsx
//
// The patient's longitudinal clinical summary — vitals (latest + trend),
// immunizations and the persistent problem list (conditions). Mirrors the
// OpenMRS patient-chart widgets, but renders in Jacana's existing card theme.
// ============================================================

import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Activity, Syringe, ClipboardList, Plus, Loader2 } from 'lucide-react';
import { PatientClinicalService } from '@/features/consultations/services/patientClinicalService';
import type { VitalSignDto, ImmunizationDto, ConditionDto } from '@/features/consultations/types/patientClinical';
import { formatDate, formatDateTime } from '@/lib/format';
import RecordVitalsModal from './RecordVitalsModal';
import RecordImmunizationModal from './RecordImmunizationModal';
import AddConditionModal from './AddConditionModal';

export default function ClinicalSummaryPanel({ patientId }: { patientId: string }) {
  const [vitals, setVitals] = useState<VitalSignDto[]>([]);
  const [immunizations, setImmunizations] = useState<ImmunizationDto[]>([]);
  const [conditions, setConditions] = useState<ConditionDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<'vitals' | 'immunization' | 'condition' | null>(null);

  const load = useCallback(async () => {
    try {
      const [v, i, c] = await Promise.all([
        PatientClinicalService.vitals(patientId),
        PatientClinicalService.immunizations(patientId),
        PatientClinicalService.conditions(patientId),
      ]);
      setVitals(v);
      setImmunizations(i);
      setConditions(c);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to load clinical summary');
    } finally {
      setLoading(false);
    }
  }, [patientId]);

  useEffect(() => {
    void load();
  }, [load]);

  const latestVitals = vitals[0];

  if (loading) {
    return (
      <div className="card p-6 flex items-center justify-center gap-2 text-slate-400 text-sm">
        <Loader2 size={16} className="animate-spin text-indigo-600" /> Loading clinical summary…
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
          <ClipboardList size={15} className="text-indigo-600" /> Clinical summary
        </h2>
      </div>

      <div className="grid lg:grid-cols-3 gap-5">
        {/* Vitals */}
        <section className="card p-5">
          <SectionHeader icon={<Activity size={15} />} title="Vitals" action={
            <IconButton label="Record vitals" onClick={() => setModal('vitals')} />
          } />
          {vitals.length === 0 ? (
            <Empty text="No vitals recorded yet." />
          ) : (
            <div className="space-y-3">
              <VitalsLatest v={latestVitals!} />
              {vitals.length > 1 && (
                <div className="border-t border-slate-100 pt-3">
                  <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
                    Trend (last {Math.min(vitals.length, 5)})
                  </p>
                  <div className="space-y-1.5">
                    {vitals.slice(0, 5).map((v) => (
                      <div key={v.id} className="flex items-center justify-between text-xs text-slate-600">
                        <span className="text-slate-400">{formatDateTime(v.recordedAtUtc)}</span>
                        <span className="font-medium">
                          {v.systolicBp != null && v.diastolicBp != null ? `${v.systolicBp}/${v.diastolicBp} · ` : ''}
                          {v.temperatureCelsius != null ? `${v.temperatureCelsius}°C · ` : ''}
                          {v.pulseRate != null ? `P${v.pulseRate}` : ''}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </section>

        {/* Immunizations */}
        <section className="card p-5">
          <SectionHeader icon={<Syringe size={15} />} title="Immunizations" action={
            <IconButton label="Record immunization" onClick={() => setModal('immunization')} />
          } />
          {immunizations.length === 0 ? (
            <Empty text="No immunizations recorded." />
          ) : (
            <ul className="space-y-2">
              {immunizations.map((i) => (
                <li key={i.id} className="text-sm">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-slate-800">{i.vaccineName}</span>
                    <span className="text-xs px-1.5 py-0.5 rounded-full bg-indigo-50 text-indigo-600 font-medium">
                      Dose {i.doseNumber}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {formatDate(i.administeredDate)}
                    {i.nextDueDate ? ` · next due ${formatDate(i.nextDueDate)}` : ''}
                    {i.site ? ` · ${i.site}` : ''}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Conditions / problem list */}
        <section className="card p-5">
          <SectionHeader icon={<ClipboardList size={15} />} title="Problem list" action={
            <IconButton label="Add condition" onClick={() => setModal('condition')} />
          } />
          {conditions.length === 0 ? (
            <Empty text="No conditions on the problem list." />
          ) : (
            <ul className="space-y-2">
              {conditions.map((c) => (
                <li key={c.id} className="text-sm flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <span className="text-slate-800">{c.description}</span>
                    {c.code && <span className="ml-1.5 font-mono text-[11px] text-indigo-600">{c.code}</span>}
                    <p className="text-xs text-slate-400">since {formatDate(c.onsetDate)}</p>
                  </div>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium shrink-0 ${
                    c.status === 'Active' ? 'bg-emerald-100 text-emerald-700'
                      : c.status === 'Resolved' ? 'bg-slate-100 text-slate-500'
                        : 'bg-amber-100 text-amber-700'
                  }`}>{c.status}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {modal === 'vitals' && (
        <RecordVitalsModal patientId={patientId} onClose={() => setModal(null)} onSaved={() => { setModal(null); void load(); }} />
      )}
      {modal === 'immunization' && (
        <RecordImmunizationModal patientId={patientId} onClose={() => setModal(null)} onSaved={() => { setModal(null); void load(); }} />
      )}
      {modal === 'condition' && (
        <AddConditionModal patientId={patientId} onClose={() => setModal(null)} onSaved={() => { setModal(null); void load(); }} />
      )}
    </div>
  );
}

function SectionHeader({ icon, title, action }: { icon: React.ReactNode; title: string; action?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between mb-3">
      <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
        <span className="text-indigo-600">{icon}</span>
        {title}
      </h3>
      {action}
    </div>
  );
}

function IconButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      className="w-7 h-7 rounded-lg flex items-center justify-center text-indigo-600 bg-indigo-600/5 border border-indigo-600/20 hover:bg-indigo-600/10 transition-colors"
    >
      <Plus size={15} />
    </button>
  );
}

function Empty({ text }: { text: string }) {
  return <p className="text-sm text-slate-400">{text}</p>;
}

function VitalsLatest({ v }: { v: VitalSignDto }) {
  return (
    <div className="grid grid-cols-2 gap-2 text-center">
      {v.temperatureCelsius != null && <VitalCell label="Temp" value={`${v.temperatureCelsius}°C`} />}
      {v.systolicBp != null && <VitalCell label="BP" value={`${v.systolicBp}/${v.diastolicBp ?? '—'}`} />}
      {v.pulseRate != null && <VitalCell label="Pulse" value={`${v.pulseRate}`} />}
      {v.oxygenSaturation != null && <VitalCell label="SpO₂" value={`${v.oxygenSaturation}%`} />}
      {v.weightKg != null && <VitalCell label="Weight" value={`${v.weightKg}kg`} />}
      {v.bmi != null && <VitalCell label="BMI" value={`${v.bmi}`} />}
      <p className="col-span-2 text-[11px] text-slate-400 mt-1">{formatDateTime(v.recordedAtUtc)}</p>
    </div>
  );
}

function VitalCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-slate-50 border border-slate-200 py-1.5">
      <p className="text-[11px] text-slate-400">{label}</p>
      <p className="font-semibold text-slate-800">{value}</p>
    </div>
  );
}
