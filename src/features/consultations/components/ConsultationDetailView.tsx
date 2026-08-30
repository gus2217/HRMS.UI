// ============================================================
// ConsultationDetailView.tsx
// Location: src/features/consultations/components/ConsultationDetailView.tsx
//
// Full consultation workspace:
//   • Record   — patient demographics, allergies, consents, next of kin,
//                clinical history (past consultations + diagnoses)
//   • Consult  — triage, begin phase, diagnoses, notes, complete
//   • Prescribe— doctor prescribes meds (auto-billed from the drug catalog)
//   • Tests    — doctor orders lab tests (auto-billed at the default test fee)
//   • Bill     — the invoice auto-issued for this consultation
//
// Every action is gated by the backend-mirroring permission:
//   triage/begin/notes → Clinical.Consult
//   diagnosis/complete → Clinical.RecordDiagnosis
//   prescribe          → Clinical.RecordDiagnosis
//   order tests        → Laboratory.Order
// ============================================================

import { useEffect, useState, type FormEvent } from 'react';
import toast from 'react-hot-toast';
import {
  Loader2, Activity, ClipboardList, CheckCircle2, UserRound, Pill, TestTube2,
  Receipt, Stethoscope, ShieldAlert, FileText, Users,
} from 'lucide-react';
import { ConsultationService } from '../services/consultationService';
import { PharmacyService } from '@/features/pharmacy/services/pharmacyService';
import { LaboratoryService } from '@/features/laboratory/services/laboratoryService';
import { PatientService } from '@/features/patients/services/patientService';
import { InventoryService } from '@/features/inventory/services/inventoryService';
import { BillingService } from '@/features/billing/services/billingService';
import type { ConsultationDetail } from '../types/consultation';
import type { PatientDetail } from '@/features/patients/types/patient';
import type { DrugCatalogDto } from '@/features/inventory/types/inventory';
import type { InvoiceListItem } from '@/features/billing/types/billing';
import { formatDate, formatDateTime, formatMoney, ageFromDateOfBirth } from '@/lib/format';
import { useAuth } from '@/features/auth/components/AuthContext';
import { hasPermission, PERMISSIONS } from '@/lib/permissions';

type Tab = 'record' | 'consult' | 'prescribe' | 'tests' | 'bill';

interface Props {
  consultation: ConsultationDetail | null;
  patientId?: string;
  patientName?: string;
  patientNumber?: string;
  onChanged: (c: ConsultationDetail) => void;
}

export default function ConsultationDetailView({ consultation, patientId, patientName, patientNumber, onChanged }: Props) {
  const { permissions } = useAuth();
  const [tab, setTab] = useState<Tab>(consultation ? 'consult' : 'record');

  const canConsult = hasPermission(permissions, PERMISSIONS.CLINICAL_CONSULT);
  const canDiagnose = hasPermission(permissions, PERMISSIONS.CLINICAL_RECORD_DIAGNOSIS);
  const canOrderTests = hasPermission(permissions, PERMISSIONS.LABORATORY_ORDER);

  const tabs: { id: Tab; label: string; icon: React.ReactNode; visible: boolean }[] = [
    { id: 'record', label: 'Record', icon: <UserRound size={14} />, visible: true },
    { id: 'consult', label: 'Consult', icon: <Stethoscope size={14} />, visible: true },
    { id: 'prescribe', label: 'Prescribe', icon: <Pill size={14} />, visible: canDiagnose },
    { id: 'tests', label: 'Tests', icon: <TestTube2 size={14} />, visible: canOrderTests },
    { id: 'bill', label: 'Bill', icon: <Receipt size={14} />, visible: true },
  ];

  return (
    <div className="space-y-4">
      {/* Tab bar */}
      <div className="flex flex-wrap gap-1.5 border-b border-slate-200 pb-3">
        {tabs.filter((t) => t.visible).map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full transition-colors ${
              tab === t.id ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
            }`}
          >
            {t.icon}
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'record' && (
        <MedicalRecordPanel patientId={patientId} patientName={patientName} patientNumber={patientNumber} />
      )}

      {tab === 'consult' && (
        <ConsultationWorkPanel
          consultation={consultation}
          patientId={patientId}
          patientName={patientName}
          patientNumber={patientNumber}
          canConsult={canConsult}
          canDiagnose={canDiagnose}
          onChanged={onChanged}
        />
      )}

      {tab === 'prescribe' && canDiagnose && (
        <PrescribePanel consultation={consultation} patientId={patientId} patientName={patientName} />
      )}

      {tab === 'tests' && canOrderTests && (
        <OrderTestsPanel consultation={consultation} patientId={patientId} patientName={patientName} />
      )}

      {tab === 'bill' && (
        <BillPanel consultationId={consultation?.id} patientName={patientName} />
      )}
    </div>
  );
}

// ─── Medical record ─────────────────────────────────────────────────────────────

function MedicalRecordPanel({ patientId }: { patientId?: string; patientName?: string; patientNumber?: string }) {
  const [patient, setPatient] = useState<PatientDetail | null>(null);
  const [loading, setLoading] = useState(patientId !== undefined);

  useEffect(() => {
    if (!patientId) return;
    let mounted = true;
    setLoading(true);
    PatientService.detail(patientId)
      .then((p) => { if (mounted) setPatient(p); })
      .catch(() => toast.error('Failed to load patient record'))
      .finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, [patientId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-3 py-14">
        <Loader2 size={20} className="animate-spin text-indigo-600" />
        <p className="text-sm text-slate-400">Loading medical record…</p>
      </div>
    );
  }

  if (!patient) {
    return (
      <div className="text-center py-12">
        <UserRound size={28} className="text-slate-300 mx-auto mb-3" />
        <p className="text-sm text-slate-400">Select a patient to view their medical record.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Demographics */}
      <div className="p-4 rounded-lg bg-slate-50 border border-slate-200">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-slate-900">
              {patient.firstName} {patient.lastName}
            </p>
            <p className="text-xs text-slate-400 mt-0.5">
              {patient.patientNumber} · {ageFromDateOfBirth(patient.dateOfBirth) ?? '—'} yrs · {patient.gender} · {patient.maritalStatus}
            </p>
            <p className="text-xs text-slate-500 mt-1">
              {patient.county}{patient.subCounty ? `, ${patient.subCounty}` : ''}{patient.ward ? `, ${patient.ward}` : ''}
            </p>
          </div>
          <span className={`text-xs px-2 py-0.5 rounded-full ${
            patient.status === 'Active' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'
          }`}>
            {patient.status}
          </span>
        </div>
        <div className="grid grid-cols-2 gap-3 mt-3 pt-3 border-t border-slate-200 text-xs">
          <div>
            <p className="text-slate-400">Phone</p>
            <p className="text-slate-700 font-medium mt-0.5">{patient.phone ?? '—'}</p>
          </div>
          <div>
            <p className="text-slate-400">DOB</p>
            <p className="text-slate-700 font-medium mt-0.5">{formatDate(patient.dateOfBirth)}</p>
          </div>
        </div>
      </div>

      {/* Allergies */}
      <div className="p-4 rounded-lg bg-slate-50 border border-slate-200">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
          <ShieldAlert size={12} /> Allergies
        </p>
        {patient.allergies.length === 0 ? (
          <p className="text-sm text-slate-400">No known allergies.</p>
        ) : (
          <ul className="space-y-1.5">
            {patient.allergies.map((a, i) => (
              <li key={i} className="text-sm flex items-center gap-2">
                <span className="font-medium text-slate-800">{a.substance}</span>
                <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                  a.severity === 'Severe' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
                }`}>{a.severity}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Consents */}
      <div className="p-4 rounded-lg bg-slate-50 border border-slate-200">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
          <FileText size={12} /> Consents
        </p>
        {patient.consents.length === 0 ? (
          <p className="text-sm text-slate-400">No consents recorded.</p>
        ) : (
          <ul className="space-y-1.5 text-sm">
            {patient.consents.map((c, i) => (
              <li key={i} className="flex items-center justify-between">
                <span className="text-slate-700">{c.type}</span>
                <span className={`text-xs font-medium ${c.granted ? 'text-emerald-600' : 'text-red-500'}`}>
                  {c.granted ? 'Granted' : 'Withheld'}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Next of kin */}
      {patient.nextOfKin.length > 0 && (
        <div className="p-4 rounded-lg bg-slate-50 border border-slate-200">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <Users size={12} /> Next of kin
          </p>
          <ul className="space-y-1.5 text-sm">
            {patient.nextOfKin.map((n, i) => (
              <li key={i} className="text-slate-700">
                {n.fullName} <span className="text-slate-400">· {n.relationship}</span>
                {n.phone && <span className="block text-xs text-slate-400">{n.phone}</span>}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Clinical history */}
      <ClinicalHistory patientId={patientId} />
    </div>
  );
}

function ClinicalHistory({ patientId }: { patientId?: string }) {
  const [history, setHistory] = useState<{ consultations: { id: string; status: string; startedAtUtc: string }[]; diagnoses: { icdCode: string; description: string; isPrimary: boolean }[] } | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!patientId) return;
    let mounted = true;
    setLoading(true);
    ConsultationService.history(patientId)
      .then((h) => { if (mounted) setHistory(h); })
      .catch(() => { /* no history */ })
      .finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, [patientId]);

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-4 text-xs text-slate-400">
        <Loader2 size={13} className="animate-spin" /> Loading clinical history…
      </div>
    );
  }

  const diagnoses = history?.diagnoses ?? [];
  const consultations = history?.consultations ?? [];

  return (
    <div className="p-4 rounded-lg bg-slate-50 border border-slate-200">
      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
        <Stethoscope size={12} /> Clinical history
      </p>

      {diagnoses.length > 0 && (
        <div className="mb-3">
          <p className="text-[11px] text-slate-400 font-medium mb-1.5">Past diagnoses</p>
          <div className="space-y-1.5">
            {diagnoses.map((d, i) => (
              <div key={i} className="flex items-start gap-2 text-sm">
                <span className="font-mono text-xs px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-700 shrink-0">{d.icdCode}</span>
                <span className="text-slate-600">{d.description}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {consultations.length > 0 ? (
        <div className="space-y-1.5">
          <p className="text-[11px] text-slate-400 font-medium mb-1.5">Past consultations</p>
          {consultations.map((c) => (
            <div key={c.id} className="flex items-center justify-between text-sm">
              <span className="text-slate-600">Consultation</span>
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400">{formatDateTime(c.startedAtUtc)}</span>
                <span className="text-xs px-1.5 py-0.5 rounded-full bg-slate-200 text-slate-600">{c.status}</span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-slate-400">No consultations on record.</p>
      )}
    </div>
  );
}

// ─── Consultation workflow ──────────────────────────────────────────────────────

function ConsultationWorkPanel({
  consultation, patientId, patientName, patientNumber, canConsult, canDiagnose, onChanged,
}: {
  consultation: ConsultationDetail | null;
  patientId?: string;
  patientName?: string;
  patientNumber?: string;
  canConsult: boolean;
  canDiagnose: boolean;
  onChanged: (c: ConsultationDetail) => void;
}) {
  const { user } = useAuth();
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [showDiagnosis, setShowDiagnosis] = useState(false);

  const run = async (fn: () => Promise<ConsultationDetail>) => {
    setBusy(true);
    try {
      const updated = await fn();
      onChanged(updated);
      toast.success('Saved');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Request failed');
    } finally {
      setBusy(false);
    }
  };

  if (!consultation) {
    return (
      <div className="text-center py-10">
        <p className="text-sm text-slate-500 mb-4">
          {patientName ? `No active consultation for ${patientName}${patientNumber ? ` (${patientNumber})` : ''} yet.` : 'No consultation selected.'}
        </p>
        {canConsult && patientId && (
          <button
            className="btn-primary"
            disabled={busy}
            onClick={() => void run(() => ConsultationService.start(patientId, user?.id ?? ''))}
          >
            {busy && <Loader2 size={15} className="animate-spin" />}
            Start consultation
          </button>
        )}
        {canConsult && !patientId && (
          <p className="text-xs text-slate-400">Select a patient to start a consultation.</p>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-slate-900">Consultation</p>
          <p className="text-xs text-slate-400 mt-0.5">{formatDateTime(consultation.startedAtUtc)}</p>
        </div>
        <span className="text-xs px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
          {consultation.status}
        </span>
      </div>

      {/* Triage */}
      <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
          <Activity size={12} /> Triage vitals
        </p>
        {consultation.triage ? (
          <div className="grid grid-cols-5 gap-2 text-center text-sm">
            <Vital label="Temp" value={consultation.triage.temperatureCelsius ? `${consultation.triage.temperatureCelsius}°C` : '—'} />
            <Vital label="BP" value={consultation.triage.bloodPressure ?? '—'} />
            <Vital label="Pulse" value={consultation.triage.pulseRate?.toString() ?? '—'} />
            <Vital label="Resp" value={consultation.triage.respiratoryRate?.toString() ?? '—'} />
            <Vital label="Weight" value={consultation.triage.weightKg ? `${consultation.triage.weightKg}kg` : '—'} />
          </div>
        ) : canConsult ? (
          <TriageForm onSave={(input) => void run(() => ConsultationService.recordTriage(consultation.id, input))} />
        ) : (
          <p className="text-sm text-slate-400">Not recorded.</p>
        )}
      </div>

      {/* Begin clinical phase */}
      {(consultation.status === 'Triaged' || consultation.status === 'AwaitingClinician') && canConsult && (
        <button
          className="btn-ghost w-full text-sky-600 border-sky-300 hover:bg-sky-50"
          disabled={busy}
          onClick={() => void run(() => ConsultationService.begin(consultation.id))}
        >
          {busy && <Loader2 size={15} className="animate-spin" />}
          Begin clinical phase
        </button>
      )}

      {/* Diagnoses */}
      <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200">
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
            <ClipboardList size={12} /> Diagnoses
          </p>
          {canDiagnose && (
            <button className="text-xs font-medium text-indigo-600" onClick={() => setShowDiagnosis((v) => !v)}>
              + Add
            </button>
          )}
        </div>
        {consultation.diagnoses.length === 0 && !showDiagnosis ? (
          <p className="text-sm text-slate-400">None recorded.</p>
        ) : (
          <div className="space-y-2">
            {consultation.diagnoses.map((d, i) => (
              <div key={i} className="flex items-start gap-2 text-sm">
                <span className="font-mono text-xs px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-700">{d.icdCode}</span>
                <span className="text-slate-600">{d.description}</span>
              </div>
            ))}
            {showDiagnosis && canDiagnose && (
              <DiagnosisForm
                onCancel={() => setShowDiagnosis(false)}
                onSave={(input) =>
                  void run(() => {
                    setShowDiagnosis(false);
                    return ConsultationService.recordDiagnosis(consultation.id, input);
                  })
                }
              />
            )}
          </div>
        )}
      </div>

      {/* Notes */}
      <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Clinical notes</p>
        {consultation.notes.length > 0 && (
          <ul className="space-y-2 mb-3">
            {consultation.notes.map((n, i) => (
              <li key={i} className="text-sm text-slate-600">
                {n.content}
                <span className="block text-[11px] text-slate-400 mt-0.5">{formatDateTime(n.recordedAtUtc)}</span>
              </li>
            ))}
          </ul>
        )}
        {canConsult && (
          <div className="flex gap-2">
            <input className="input" placeholder="Add a clinical note…" value={note} onChange={(e) => setNote(e.target.value)} />
            <button
              className="btn-primary shrink-0"
              disabled={busy || !note.trim()}
              onClick={() => {
                const content = note.trim();
                setNote('');
                void run(() => ConsultationService.addNote(consultation.id, content));
              }}
            >
              Add
            </button>
          </div>
        )}
      </div>

      {/* Complete */}
      {consultation.status !== 'Completed' && canDiagnose && (
        <button
          className="btn-ghost w-full text-emerald-600 border-emerald-300 hover:bg-emerald-50"
          disabled={busy}
          onClick={() => void run(() => ConsultationService.complete(consultation.id))}
        >
          <CheckCircle2 size={15} />
          Complete consultation
        </button>
      )}
    </div>
  );
}

// ─── Prescribe (auto-billed) ────────────────────────────────────────────────────

function PrescribePanel({ consultation, patientId, patientName }: { consultation: ConsultationDetail | null; patientId?: string; patientName?: string }) {
  const [drugs, setDrugs] = useState<DrugCatalogDto[]>([]);
  const [lines, setLines] = useState([{ drugId: '', dosageInstructions: '', quantityPrescribed: 1 }]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    InventoryService.catalog()
      .then((res) => setDrugs(res.items))
      .catch(() => toast.error('Failed to load drug catalog'));
  }, []);

  const setLine = (index: number, patch: Partial<(typeof lines)[number]>) =>
    setLines((ls) => ls.map((l, i) => (i === index ? { ...l, ...patch } : l)));

  const submit = async () => {
    if (!consultation || !patientId) {
      toast.error('Start a consultation first.');
      return;
    }
    const valid = lines.filter((l) => l.drugId && l.quantityPrescribed > 0);
    if (valid.length === 0) {
      toast.error('Add at least one drug line.');
      return;
    }
    setSaving(true);
    try {
      await PharmacyService.createPrescription({
        patientId,
        consultationId: consultation.id,
        items: valid.map((l) => ({
          drugId: l.drugId,
          dosageInstructions: l.dosageInstructions || 'As directed',
          quantityPrescribed: l.quantityPrescribed,
        })),
      });
      toast.success('Prescription created — added to the bill');
      setLines([{ drugId: '', dosageInstructions: '', quantityPrescribed: 1 }]);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create prescription');
    } finally {
      setSaving(false);
    }
  };

  if (!consultation) {
    return (
      <div className="text-center py-12">
        <Pill size={28} className="text-slate-300 mx-auto mb-3" />
        <p className="text-sm text-slate-400">Start a consultation before prescribing.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-slate-900">Prescribe medication</p>
          <p className="text-xs text-slate-400 mt-0.5">{patientName ?? ''} — billed automatically from the drug catalog</p>
        </div>
        <span className="text-xs px-2 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200">Auto-billed</span>
      </div>

      <div className="space-y-3">
        {lines.map((line, index) => (
          <div key={index} className="grid grid-cols-[1fr_1fr_70px] gap-2">
            <select className="input" value={line.drugId} onChange={(e) => setLine(index, { drugId: e.target.value })}>
              <option value="">Select drug…</option>
              {drugs.map((d) => (
                <option key={d.id} value={d.id}>{d.name} ({d.code}) — {formatMoney(d.unitPrice)}</option>
              ))}
            </select>
            <input
              className="input"
              placeholder="Dosage instructions"
              value={line.dosageInstructions}
              onChange={(e) => setLine(index, { dosageInstructions: e.target.value })}
            />
            <input
              type="number"
              min={1}
              className="input"
              value={line.quantityPrescribed}
              onChange={(e) => setLine(index, { quantityPrescribed: Number(e.target.value) })}
            />
          </div>
        ))}
        <button
          type="button"
          className="text-xs font-medium text-indigo-600 hover:text-indigo-700"
          onClick={() => setLines((ls) => [...ls, { drugId: '', dosageInstructions: '', quantityPrescribed: 1 }])}
        >
          + Add line
        </button>
      </div>

      <div className="flex justify-end">
        <button className="btn-primary" disabled={saving || consultation.status === 'Completed'} onClick={() => void submit()}>
          {saving && <Loader2 size={15} className="animate-spin" />}
          Create prescription
        </button>
      </div>
    </div>
  );
}

// ─── Order tests (auto-billed) ──────────────────────────────────────────────────

function OrderTestsPanel({ consultation, patientId, patientName }: { consultation: ConsultationDetail | null; patientId?: string; patientName?: string }) {
  const [tests, setTests] = useState([{ testCode: '', testName: '' }]);
  const [saving, setSaving] = useState(false);

  const setTest = (index: number, patch: Partial<(typeof tests)[number]>) =>
    setTests((ts) => ts.map((t, i) => (i === index ? { ...t, ...patch } : t)));

  const submit = async () => {
    if (!consultation || !patientId) {
      toast.error('Start a consultation first.');
      return;
    }
    const valid = tests.filter((t) => t.testCode.trim() && t.testName.trim());
    if (valid.length === 0) {
      toast.error('Add at least one test.');
      return;
    }
    setSaving(true);
    try {
      await LaboratoryService.createOrder({
        patientId,
        consultationId: consultation.id,
        tests: valid.map((t) => ({ testCode: t.testCode.trim(), testName: t.testName.trim() })),
      });
      toast.success('Lab order created — added to the bill');
      setTests([{ testCode: '', testName: '' }]);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create lab order');
    } finally {
      setSaving(false);
    }
  };

  if (!consultation) {
    return (
      <div className="text-center py-12">
        <TestTube2 size={28} className="text-slate-300 mx-auto mb-3" />
        <p className="text-sm text-slate-400">Start a consultation before ordering tests.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-slate-900">Order lab tests</p>
          <p className="text-xs text-slate-400 mt-0.5">{patientName ?? ''} — billed automatically at the default test fee</p>
        </div>
        <span className="text-xs px-2 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200">Auto-billed</span>
      </div>

      <div className="space-y-3">
        {tests.map((t, i) => (
          <div key={i} className="grid grid-cols-[90px_1fr] gap-2">
            <input className="input" placeholder="Code" value={t.testCode} onChange={(e) => setTest(i, { testCode: e.target.value })} />
            <input className="input" placeholder="Test name (e.g. Full Blood Count)" value={t.testName} onChange={(e) => setTest(i, { testName: e.target.value })} />
          </div>
        ))}
        <button
          type="button"
          className="text-xs font-medium text-indigo-600 hover:text-indigo-700"
          onClick={() => setTests((ts) => [...ts, { testCode: '', testName: '' }])}
        >
          + Add test
        </button>
      </div>

      <div className="flex justify-end">
        <button className="btn-primary" disabled={saving || consultation.status === 'Completed'} onClick={() => void submit()}>
          {saving && <Loader2 size={15} className="animate-spin" />}
          Create lab order
        </button>
      </div>
    </div>
  );
}

// ─── Bill (auto-issued) ─────────────────────────────────────────────────────────

function BillPanel({ consultationId, patientName }: { consultationId?: string; patientName?: string }) {
  const [invoices, setInvoices] = useState<InvoiceListItem[]>([]);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    if (!consultationId) {
      setInvoices([]);
      return;
    }
    setLoading(true);
    try {
      const res = await BillingService.list(1, 10, undefined, consultationId);
      setInvoices(res.items);
    } catch {
      setInvoices([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [consultationId]);

  if (!consultationId) {
    return (
      <div className="text-center py-12">
        <Receipt size={28} className="text-slate-300 mx-auto mb-3" />
        <p className="text-sm text-slate-400">Start a consultation to generate a bill.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-slate-900">Bill</p>
          <p className="text-xs text-slate-400 mt-0.5">
            {patientName ?? ''} — issued automatically from meds, tests & consultation. The cashier confirms payment.
          </p>
        </div>
        <button className="btn-ghost text-xs" onClick={() => void load()}>
          <Loader2 size={12} className={loading ? 'animate-spin mr-1' : 'mr-1'} />
          Refresh
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center gap-3 py-12">
          <Loader2 size={18} className="animate-spin text-indigo-600" />
          <p className="text-sm text-slate-400">Loading bill…</p>
        </div>
      ) : invoices.length === 0 ? (
        <div className="text-center py-12">
          <Receipt size={28} className="text-slate-300 mx-auto mb-3" />
          <p className="text-sm text-slate-400">No bill yet — prescribe meds, order tests, or complete the consultation to generate one.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {invoices.map((inv) => (
            <div key={inv.id} className="p-4 rounded-lg bg-slate-50 border border-slate-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-slate-900">{inv.patientName}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{formatDateTime(inv.createdAtUtc)}</p>
                </div>
                <span className={`text-xs px-2.5 py-1 rounded-full border ${
                  inv.status === 'Paid'
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : inv.status === 'PartiallyPaid'
                      ? 'bg-amber-50 text-amber-700 border-amber-200'
                      : inv.status === 'Issued'
                        ? 'bg-sky-50 text-sky-700 border-sky-200'
                        : 'bg-slate-100 text-slate-600 border-slate-200'
                }`}>
                  {inv.status}
                </span>
              </div>
              <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-200">
                <p className="text-xs text-slate-500">Total</p>
                <p className="text-lg font-bold text-indigo-600">{formatMoney(inv.totalAmount)}</p>
              </div>
            </div>
          ))}
          <p className="text-[11px] text-slate-400 text-center">
            Payments are confirmed by the cashier/receptionist in the Billing section.
          </p>
        </div>
      )}
    </div>
  );
}

// ─── Small pieces ───────────────────────────────────────────────────────────────

function Vital({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[11px] text-slate-400">{label}</p>
      <p className="font-medium text-slate-700">{value}</p>
    </div>
  );
}

function TriageForm({
  onSave,
}: {
  onSave: (input: {
    temperatureCelsius?: number | null;
    bloodPressure?: string | null;
    pulseRate?: number | null;
    respiratoryRate?: number | null;
    weightKg?: number | null;
  }) => void;
}) {
  const [temperatureCelsius, setTemperatureCelsius] = useState('');
  const [bloodPressure, setBloodPressure] = useState('');
  const [pulseRate, setPulseRate] = useState('');
  const [respiratoryRate, setRespiratoryRate] = useState('');
  const [weightKg, setWeightKg] = useState('');

  const submit = (e: FormEvent) => {
    e.preventDefault();
    onSave({
      temperatureCelsius: temperatureCelsius ? Number(temperatureCelsius) : null,
      bloodPressure: bloodPressure.trim() || null,
      pulseRate: pulseRate ? Number(pulseRate) : null,
      respiratoryRate: respiratoryRate ? Number(respiratoryRate) : null,
      weightKg: weightKg ? Number(weightKg) : null,
    });
  };

  return (
    <form onSubmit={submit} className="space-y-2">
      <div className="grid grid-cols-5 gap-2">
        <input className="input text-xs py-1.5" placeholder="Temp °C" value={temperatureCelsius} onChange={(e) => setTemperatureCelsius(e.target.value)} />
        <input className="input text-xs py-1.5" placeholder="BP" value={bloodPressure} onChange={(e) => setBloodPressure(e.target.value)} />
        <input className="input text-xs py-1.5" placeholder="Pulse" value={pulseRate} onChange={(e) => setPulseRate(e.target.value)} />
        <input className="input text-xs py-1.5" placeholder="Resp" value={respiratoryRate} onChange={(e) => setRespiratoryRate(e.target.value)} />
        <input className="input text-xs py-1.5" placeholder="Weight kg" value={weightKg} onChange={(e) => setWeightKg(e.target.value)} />
      </div>
      <button type="submit" className="btn-primary text-xs py-1.5">Save triage</button>
    </form>
  );
}

function DiagnosisForm({
  onCancel,
  onSave,
}: {
  onCancel: () => void;
  onSave: (input: { icdCode: string; description: string; isPrimary: boolean }) => void;
}) {
  const [icdCode, setIcdCode] = useState('');
  const [description, setDescription] = useState('');
  const [isPrimary, setIsPrimary] = useState(true);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!icdCode.trim() || !description.trim()) {
      toast.error('ICD code and description are required.');
      return;
    }
    onSave({ icdCode: icdCode.trim(), description: description.trim(), isPrimary });
  };

  return (
    <form onSubmit={submit} className="space-y-2 pt-2">
      <div className="flex gap-2">
        <input className="input w-28" placeholder="ICD-10" value={icdCode} onChange={(e) => setIcdCode(e.target.value)} />
        <input className="input" placeholder="Description" value={description} onChange={(e) => setDescription(e.target.value)} />
      </div>
      <div className="flex items-center justify-between">
        <label className="flex items-center gap-2 text-xs text-slate-500">
          <input type="checkbox" checked={isPrimary} onChange={(e) => setIsPrimary(e.target.checked)} />
          Primary diagnosis
        </label>
        <div className="flex gap-2">
          <button type="button" className="btn-ghost text-xs py-1.5" onClick={onCancel}>Cancel</button>
          <button type="submit" className="btn-primary text-xs py-1.5">Save</button>
        </div>
      </div>
    </form>
  );
}
