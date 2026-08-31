// ============================================================
// ConsultationDetailView.tsx
// Location: src/features/consultations/components/ConsultationDetailView.tsx
//
// Full consultation workspace:
//   • Record   — patient demographics, allergies, consents, next of kin,
//                clinical history (past consultations + diagnoses)
//   • Consult  — structured medical documentation (CC → HPI → PMSHX → ROS →
//                Examination → Diagnosis LAST) with autosave, triage, notes,
//                complete
//   • Prescribe— doctor prescribes meds (auto-billed from the drug catalog)
//   • Tests    — doctor orders lab tests (auto-billed at the default test fee)
//   • Bill     — the invoice auto-issued for this consultation
//   • Admit    — inpatient admission (ward/bed) + ward notes + discharge
//   • Referral — refer the patient to another unit/facility
//
// Every action is gated by the backend-mirroring permission:
//   triage/begin/notes/documentation/referral → Clinical.Consult
//   diagnosis/complete → Clinical.RecordDiagnosis
//   prescribe          → Clinical.RecordDiagnosis
//   order tests        → Laboratory.Order
// ============================================================

import { useEffect, useRef, useState, type FormEvent } from 'react';
import toast from 'react-hot-toast';
import {
  Loader2, Activity, ClipboardList, CheckCircle2, UserRound, Pill, TestTube2,
  Receipt, Stethoscope, ShieldAlert, FileText, Users, BedDouble, Send, Save, RefreshCw, ChevronDown,
  CalendarDays,
} from 'lucide-react';
import Icd10Search from './Icd10Search';
import PatientAppointmentsPanel from '@/features/appointments/components/PatientAppointmentsPanel';
import { ConsultationService, type DocumentationInput, type ReferralInput } from '../services/consultationService';
import { PharmacyService } from '@/features/pharmacy/services/pharmacyService';
import { LaboratoryService } from '@/features/laboratory/services/laboratoryService';
import { PatientService } from '@/features/patients/services/patientService';
import { InventoryService } from '@/features/inventory/services/inventoryService';
import { BillingService } from '@/features/billing/services/billingService';
import { InpatientService } from '@/features/inpatient/services/inpatientService';
import type { ConsultationDetail, ClinicalDocumentationDto, PatientMedicalRecord } from '../types/consultation';
import type { PatientDetail } from '@/features/patients/types/patient';
import type { DrugCatalogDto } from '@/features/inventory/types/inventory';
import type { InvoiceListItem } from '@/features/billing/types/billing';
import type { AdmissionDetail } from '@/features/inpatient/types/inpatient';
import type { LabOrderDetail } from '@/features/laboratory/types/laboratory';
import type { PrescriptionDetail } from '@/features/pharmacy/types/pharmacy';
import { MedicalRecordTimeline, type EnrichedVisit } from '@/features/patients/components/MedicalRecordTimeline';
import { formatDate, formatDateTime, formatMoney, ageFromDateOfBirth } from '@/lib/format';
import { useAuth } from '@/features/auth/components/AuthContext';
import { hasPermission, PERMISSIONS } from '@/lib/permissions';

type Tab = 'record' | 'consult' | 'prescribe' | 'tests' | 'bill' | 'admit' | 'referral' | 'appointments';

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
    { id: 'admit', label: 'Admit', icon: <BedDouble size={14} />, visible: canConsult },
    { id: 'referral', label: 'Referral', icon: <Send size={14} />, visible: canConsult },
    { id: 'appointments', label: 'Appointments', icon: <CalendarDays size={14} />, visible: true },
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

      {tab === 'admit' && (
        <AdmitPanel consultation={consultation} patientId={patientId} patientName={patientName} canConsult={canConsult} />
      )}

      {tab === 'referral' && (
        <ReferralPanel consultation={consultation} patientName={patientName} canConsult={canConsult} onChanged={onChanged} />
      )}

      {tab === 'appointments' && (
        <PatientAppointmentsPanel patientId={patientId} />
      )}
    </div>
  );
}

// ─── Medical record ─────────────────────────────────────────────────────────────

function MedicalRecordPanel({ patientId }: { patientId?: string; patientName?: string; patientNumber?: string }) {
  const [patient, setPatient] = useState<PatientDetail | null>(null);
  const [record, setRecord] = useState<PatientMedicalRecord | null>(null);
  const [visits, setVisits] = useState<EnrichedVisit[]>([]);
  const [loading, setLoading] = useState(patientId !== undefined);

  useEffect(() => {
    if (!patientId) return;
    let mounted = true;
    setLoading(true);
    const load = async () => {
      try {
        const [p, rec] = await Promise.all([
          PatientService.detail(patientId),
          ConsultationService.medicalRecord(patientId).catch(() => null),
        ]);
        if (!mounted) return;
        setPatient(p);
        setRecord(rec);

        // Enrich each visit with lab results + prescriptions (same as the patients section).
        const cons = rec?.consultations ?? [];
        const enriched = await Promise.all(
          cons.map(async (c) => {
            const [labOrders, prescriptions] = await Promise.all([
              LaboratoryService.byConsultation(c.id).catch(() => [] as LabOrderDetail[]),
              PharmacyService.byConsultation(c.id).catch(() => [] as PrescriptionDetail[]),
            ]);
            return { ...c, labOrders, prescriptions };
          }),
        );
        if (mounted) setVisits(enriched);
      } catch {
        toast.error('Failed to load patient record');
      } finally {
        if (mounted) setLoading(false);
      }
    };
    void load();
    return () => {
      mounted = false;
    };
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

      {/* Full per-visit medical record — same timeline as the patients section */}
      <MedicalRecordTimeline record={record} visits={visits} />
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

      {/* Structured medical documentation — autosaved */}
      {canConsult && (
        <DocumentationPanel consultation={consultation} onChanged={onChanged} />
      )}

      {/* Free-text clinical notes — before diagnosis, per record order */}
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

      {/* Diagnosis — recorded LAST, after the documentation and notes */}
      <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200">
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
            <ClipboardList size={12} /> Diagnosis
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

// ─── Structured medical documentation with autosave ────────────────────────────

/** Form state: every section is a plain string (nulls only cross the wire). */
type DocFormState = { [K in keyof DocumentationInput]-?: string };

const EMPTY_DOC: DocFormState = {
  chiefComplaint: '', historyOfPresentingIllness: '',
  pastMedicalHistory: '', pastSurgicalHistory: '', familyHistory: '', socialHistory: '',
  gynaecologicalHistory: '', obstetricHistory: '', drugHistory: '',
  rosGeneral: '', rosCardiovascular: '', rosRespiratory: '', rosGastrointestinal: '',
  rosGenitourinary: '', rosMusculoskeletal: '', rosNeurological: '', rosDermatological: '',
  rosEntEyes: '', rosEndocrine: '',
  examGeneralAppearance: '', examHeadAndNeck: '', examCardiovascular: '', examRespiratory: '',
  examAbdominal: '', examGenitourinary: '', examMusculoskeletal: '', examNeurological: '',
  examSkin: '', examLymphatic: '',
};

function toForm(doc: ClinicalDocumentationDto | null | undefined): DocFormState {
  if (!doc) return { ...EMPTY_DOC };
  const pick = (v: string | null | undefined) => v ?? '';
  return {
    chiefComplaint: pick(doc.chiefComplaint), historyOfPresentingIllness: pick(doc.historyOfPresentingIllness),
    pastMedicalHistory: pick(doc.pastMedicalHistory), pastSurgicalHistory: pick(doc.pastSurgicalHistory),
    familyHistory: pick(doc.familyHistory), socialHistory: pick(doc.socialHistory),
    gynaecologicalHistory: pick(doc.gynaecologicalHistory), obstetricHistory: pick(doc.obstetricHistory),
    drugHistory: pick(doc.drugHistory),
    rosGeneral: pick(doc.rosGeneral), rosCardiovascular: pick(doc.rosCardiovascular),
    rosRespiratory: pick(doc.rosRespiratory), rosGastrointestinal: pick(doc.rosGastrointestinal),
    rosGenitourinary: pick(doc.rosGenitourinary), rosMusculoskeletal: pick(doc.rosMusculoskeletal),
    rosNeurological: pick(doc.rosNeurological), rosDermatological: pick(doc.rosDermatological),
    rosEntEyes: pick(doc.rosEntEyes), rosEndocrine: pick(doc.rosEndocrine),
    examGeneralAppearance: pick(doc.examGeneralAppearance), examHeadAndNeck: pick(doc.examHeadAndNeck),
    examCardiovascular: pick(doc.examCardiovascular), examRespiratory: pick(doc.examRespiratory),
    examAbdominal: pick(doc.examAbdominal), examGenitourinary: pick(doc.examGenitourinary),
    examMusculoskeletal: pick(doc.examMusculoskeletal), examNeurological: pick(doc.examNeurological),
    examSkin: pick(doc.examSkin), examLymphatic: pick(doc.examLymphatic),
  };
}

function DocumentationPanel({
  consultation, onChanged,
}: {
  consultation: ConsultationDetail;
  onChanged: (c: ConsultationDetail) => void;
}) {
  const [form, setForm] = useState<DocFormState>(() => toForm(consultation.documentation));
  const [open, setOpen] = useState<Record<string, boolean>>({ cc: true, hpi: true });
  const [autosave, setAutosave] = useState(() => {
    try { return localStorage.getItem('jacana.autosave') !== 'off'; } catch { return true; }
  });
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [lastSaved, setLastSaved] = useState<string | null>(consultation.documentation?.lastSavedAtUtc ?? null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const busy = useRef(false);

  // Re-sync when the consultation (or its documentation) changes externally.
  useEffect(() => {
    setForm(toForm(consultation.documentation));
  }, [consultation.documentation]);

  useEffect(() => {
    try { localStorage.setItem('jacana.autosave', autosave ? 'on' : 'off'); } catch { /* ignore */ }
  }, [autosave]);

  useEffect(() => {
    return () => { if (timer.current) clearTimeout(timer.current); };
  }, []);

  const save = async (input: DocFormState) => {
    if (busy.current) return;
    busy.current = true;
    setSaveState('saving');
    try {
      const updated = await ConsultationService.saveDocumentation(consultation.id, input);
      onChanged(updated);
      setLastSaved(updated.documentation?.lastSavedAtUtc ?? new Date().toISOString());
      setSaveState('saved');
    } catch {
      setSaveState('error');
    } finally {
      busy.current = false;
    }
  };

  const scheduleSave = (next: DocFormState) => {
    setSaveState('idle');
    if (timer.current) clearTimeout(timer.current);
    if (autosave) {
      timer.current = setTimeout(() => void save(next), 1200);
    }
  };

  const set = (key: keyof DocFormState) => (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const next = { ...form, [key]: e.target.value };
    setForm(next);
    scheduleSave(next);
  };

  /** One-tap "Normal" / "NAD" fill for a ROS/exam field — the busy-doctor shortcut. */
  const quickFill = (key: keyof DocFormState, value: string) => {
    const next = { ...form, [key]: form[key] ? '' : value };
    setForm(next);
    scheduleSave(next);
  };

  const toggle = (key: string) => setOpen((o) => ({ ...o, [key]: !o[key] }));

  const saveNow = () => {
    if (timer.current) clearTimeout(timer.current);
    void save(form);
  };

  const sectionFilled = (keys: (keyof DocFormState)[]) => keys.some((k) => form[k]?.trim());

  const nav: { key: string; num: string; label: string; fields: (keyof DocFormState)[] }[] = [
    { key: 'cc', num: '1', label: 'Chief complaint', fields: ['chiefComplaint'] },
    { key: 'hpi', num: '2', label: 'History of presenting illness', fields: ['historyOfPresentingIllness'] },
    { key: 'pmhx', num: '3', label: 'PMSHX', fields: ['pastMedicalHistory', 'pastSurgicalHistory', 'familyHistory', 'socialHistory', 'gynaecologicalHistory', 'obstetricHistory', 'drugHistory'] },
    { key: 'ros', num: '4', label: 'Review of systems', fields: ['rosGeneral', 'rosCardiovascular', 'rosRespiratory', 'rosGastrointestinal', 'rosGenitourinary', 'rosMusculoskeletal', 'rosNeurological', 'rosDermatological', 'rosEntEyes', 'rosEndocrine'] },
    { key: 'exam', num: '5', label: 'Examination', fields: ['examGeneralAppearance', 'examHeadAndNeck', 'examCardiovascular', 'examRespiratory', 'examAbdominal', 'examGenitourinary', 'examMusculoskeletal', 'examNeurological', 'examSkin', 'examLymphatic'] },
  ];

  return (
    <div className="rounded-xl bg-white border border-slate-200 overflow-hidden shadow-sm">
      {/* Sticky save bar */}
      <div className="sticky top-0 z-10 flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 bg-white/95 backdrop-blur border-b border-slate-200">
        <p className="text-xs font-semibold text-slate-600 flex items-center gap-1.5">
          <FileText size={13} className="text-indigo-600" />
          Medical documentation
        </p>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-1.5 text-xs text-slate-500 cursor-pointer select-none">
            <input type="checkbox" checked={autosave} onChange={(e) => setAutosave(e.target.checked)} className="accent-indigo-600" />
            Autosave
          </label>
          {saveState === 'saving' && (
            <span className="flex items-center gap-1 text-xs text-slate-400"><Loader2 size={12} className="animate-spin" /> Saving…</span>
          )}
          {saveState === 'saved' && lastSaved && (
            <span className="flex items-center gap-1 text-xs text-emerald-600"><CheckCircle2 size={12} /> Saved {formatTime(lastSaved)}</span>
          )}
          {saveState === 'error' && <span className="text-xs text-red-500">Save failed</span>}
          <button className="btn-primary text-xs py-1" onClick={() => void saveNow()} disabled={saveState === 'saving'}>
            <Save size={12} className="mr-1" />
            Save
          </button>
        </div>
      </div>

      {/* Section jump nav (desktop) */}
      <div className="hidden md:flex flex-wrap gap-1.5 px-4 pt-3">
        {nav.map((s) => (
          <button
            key={s.key}
            onClick={() => {
              setOpen((o) => ({ ...o, [s.key]: true }));
              document.getElementById(`doc-${s.key}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }}
            className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border transition-colors ${
              sectionFilled(s.fields)
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100'
            }`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${sectionFilled(s.fields) ? 'bg-emerald-500' : 'bg-slate-300'}`} />
            {s.num}. {s.label}
          </button>
        ))}
      </div>

      <div className="p-4 space-y-3">
        {/* 1. Chief complaint — always visible */}
        <DocSection id="doc-cc" open={open.cc} onToggle={() => toggle('cc')} num="1" label="Chief complaint (CC)" filled={sectionFilled(['chiefComplaint'])}>
          <textarea
            className="input min-h-[64px]"
            value={form.chiefComplaint}
            onChange={set('chiefComplaint')}
            placeholder="Patient's own words — e.g. 'Fever and cough for 3 days'"
          />
        </DocSection>

        {/* 2. HPI */}
        <DocSection id="doc-hpi" open={open.hpi} onToggle={() => toggle('hpi')} num="2" label="History of presenting illness (HPI)" filled={sectionFilled(['historyOfPresentingIllness'])}>
          <textarea
            className="input min-h-[100px]"
            value={form.historyOfPresentingIllness}
            onChange={set('historyOfPresentingIllness')}
            placeholder="Onset, duration, progression, severity, aggravating/relieving factors, associated symptoms…"
          />
        </DocSection>

        {/* 3. PMSHX */}
        <DocSection id="doc-pmhx" open={open.pmhx} onToggle={() => toggle('pmhx')} num="3" label="Past medical & surgical history (PMSHX)" filled={sectionFilled(nav[2].fields)}>
          <div className="grid sm:grid-cols-2 gap-3">
            <DocField label="Past medical history" value={form.pastMedicalHistory} onChange={set('pastMedicalHistory')} placeholder="Chronic illnesses, admissions, transfusions…" />
            <DocField label="Past surgical history" value={form.pastSurgicalHistory} onChange={set('pastSurgicalHistory')} placeholder="Operations, dates, complications…" />
            <DocField label="Family history" value={form.familyHistory} onChange={set('familyHistory')} placeholder="DM, HTN, TB, sickle cell, cancer…" />
            <DocField label="Social history" value={form.socialHistory} onChange={set('socialHistory')} placeholder="Smoking, alcohol, occupation, living conditions…" />
            <DocField label="Gynaecological history" value={form.gynaecologicalHistory} onChange={set('gynaecologicalHistory')} placeholder="LMP, cycles, parity, contraception…" />
            <DocField label="Obstetric history" value={form.obstetricHistory} onChange={set('obstetricHistory')} placeholder="Gravida/para, deliveries, complications…" />
            <DocField label="Drug history" value={form.drugHistory} onChange={set('drugHistory')} placeholder="Current meds, adherence, herbal remedies…" />
          </div>
        </DocSection>

        {/* 4. Review of systems — with Normal quick-fill */}
        <DocSection id="doc-ros" open={open.ros} onToggle={() => toggle('ros')} num="4" label="Review of systems (ROS)" filled={sectionFilled(nav[3].fields)}>
          <div className="grid sm:grid-cols-2 gap-3">
            <RosField label="General" value={form.rosGeneral} onChange={set('rosGeneral')} onQuick={() => quickFill('rosGeneral', 'Normal')} placeholder="Fever, weight loss, fatigue…" />
            <RosField label="Cardiovascular" value={form.rosCardiovascular} onChange={set('rosCardiovascular')} onQuick={() => quickFill('rosCardiovascular', 'Normal')} placeholder="Chest pain, palpitations, SOB…" />
            <RosField label="Respiratory" value={form.rosRespiratory} onChange={set('rosRespiratory')} onQuick={() => quickFill('rosRespiratory', 'Normal')} placeholder="Cough, sputum, haemoptysis…" />
            <RosField label="Gastrointestinal" value={form.rosGastrointestinal} onChange={set('rosGastrointestinal')} onQuick={() => quickFill('rosGastrointestinal', 'Normal')} placeholder="Nausea, vomiting, diarrhoea…" />
            <RosField label="Genitourinary" value={form.rosGenitourinary} onChange={set('rosGenitourinary')} onQuick={() => quickFill('rosGenitourinary', 'Normal')} placeholder="Dysuria, frequency, discharge…" />
            <RosField label="Musculoskeletal" value={form.rosMusculoskeletal} onChange={set('rosMusculoskeletal')} onQuick={() => quickFill('rosMusculoskeletal', 'Normal')} placeholder="Joint pain, swelling, stiffness…" />
            <RosField label="Neurological" value={form.rosNeurological} onChange={set('rosNeurological')} onQuick={() => quickFill('rosNeurological', 'Normal')} placeholder="Headache, seizures, weakness…" />
            <RosField label="Dermatological" value={form.rosDermatological} onChange={set('rosDermatological')} onQuick={() => quickFill('rosDermatological', 'Normal')} placeholder="Rash, itching, skin changes…" />
            <RosField label="ENT & eyes" value={form.rosEntEyes} onChange={set('rosEntEyes')} onQuick={() => quickFill('rosEntEyes', 'Normal')} placeholder="Hearing, vision, sore throat…" />
            <RosField label="Endocrine" value={form.rosEndocrine} onChange={set('rosEndocrine')} onQuick={() => quickFill('rosEndocrine', 'Normal')} placeholder="Thirst, polyuria, intolerance…" />
          </div>
        </DocSection>

        {/* 5. Examination — with NAD quick-fill */}
        <DocSection id="doc-exam" open={open.exam} onToggle={() => toggle('exam')} num="5" label="Examination" filled={sectionFilled(nav[4].fields)}>
          <div className="grid sm:grid-cols-2 gap-3">
            <RosField label="General appearance" value={form.examGeneralAppearance} onChange={set('examGeneralAppearance')} onQuick={() => quickFill('examGeneralAppearance', 'NAD')} placeholder="Pallor, jaundice, cyanosis, oedema…" quickLabel="NAD" />
            <RosField label="Head & neck" value={form.examHeadAndNeck} onChange={set('examHeadAndNeck')} onQuick={() => quickFill('examHeadAndNeck', 'NAD')} placeholder="JVP, lymph nodes, thyroid…" quickLabel="NAD" />
            <RosField label="Cardiovascular system" value={form.examCardiovascular} onChange={set('examCardiovascular')} onQuick={() => quickFill('examCardiovascular', 'NAD')} placeholder="Heart sounds, murmurs, apex…" quickLabel="NAD" />
            <RosField label="Respiratory system" value={form.examRespiratory} onChange={set('examRespiratory')} onQuick={() => quickFill('examRespiratory', 'NAD')} placeholder="Air entry, adventitious sounds…" quickLabel="NAD" />
            <RosField label="Abdomen" value={form.examAbdominal} onChange={set('examAbdominal')} onQuick={() => quickFill('examAbdominal', 'NAD')} placeholder="Tenderness, organomegaly, ascites…" quickLabel="NAD" />
            <RosField label="Genitourinary" value={form.examGenitourinary} onChange={set('examGenitourinary')} onQuick={() => quickFill('examGenitourinary', 'NAD')} placeholder="External genitalia, PR/PV…" quickLabel="NAD" />
            <RosField label="Musculoskeletal" value={form.examMusculoskeletal} onChange={set('examMusculoskeletal')} onQuick={() => quickFill('examMusculoskeletal', 'NAD')} placeholder="Deformities, range of movement…" quickLabel="NAD" />
            <RosField label="Neurological" value={form.examNeurological} onChange={set('examNeurological')} onQuick={() => quickFill('examNeurological', 'NAD')} placeholder="GCS, pupils, power, tone, reflexes…" quickLabel="NAD" />
            <RosField label="Skin" value={form.examSkin} onChange={set('examSkin')} onQuick={() => quickFill('examSkin', 'NAD')} placeholder="Lesions, rashes, ulcers…" quickLabel="NAD" />
            <RosField label="Lymphatic system" value={form.examLymphatic} onChange={set('examLymphatic')} onQuick={() => quickFill('examLymphatic', 'NAD')} placeholder="Lymphadenopathy — site, size…" quickLabel="NAD" />
          </div>
        </DocSection>
      </div>
    </div>
  );
}

/** Collapsible numbered section with a completion dot. */
function DocSection({
  id, open, onToggle, num, label, filled, children,
}: {
  id: string;
  open: boolean;
  onToggle: () => void;
  num: string;
  label: string;
  filled: boolean;
  children: React.ReactNode;
}) {
  return (
    <div id={id} className="rounded-lg border border-slate-200 overflow-hidden">
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center justify-between gap-2 px-3.5 py-2.5 bg-slate-50 hover:bg-slate-100 transition-colors"
      >
        <span className="flex items-center gap-2 text-sm font-medium text-slate-700">
          <span className="w-5 h-5 rounded-full bg-indigo-600 text-white text-[11px] flex items-center justify-center shrink-0">{num}</span>
          {label}
        </span>
        <span className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${filled ? 'bg-emerald-500' : 'bg-slate-300'}`} title={filled ? 'Completed' : 'Incomplete'} />
          <ChevronDown size={14} className={`text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
        </span>
      </button>
      {open && <div className="p-3.5 bg-white">{children}</div>}
    </div>
  );
}

/** Plain labelled textarea. */
function DocField({
  label, value, onChange, placeholder,
}: {
  label: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="block text-xs font-medium text-slate-500 mb-1">{label}</span>
      <textarea className="input min-h-[60px]" value={value} onChange={onChange} placeholder={placeholder} />
    </label>
  );
}

/** Textarea with a one-tap quick-fill chip (Normal / NAD) — busy-doctor shortcut. */
function RosField({
  label, value, onChange, onQuick, placeholder, quickLabel = 'Normal',
}: {
  label: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  onQuick: () => void;
  placeholder?: string;
  quickLabel?: string;
}) {
  return (
    <label className="block">
      <span className="flex items-center justify-between mb-1">
        <span className="text-xs font-medium text-slate-500">{label}</span>
        <button
          type="button"
          onClick={onQuick}
          className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full transition-colors ${
            value.trim() === quickLabel
              ? 'bg-emerald-100 text-emerald-700'
              : 'bg-slate-100 text-slate-400 hover:bg-indigo-100 hover:text-indigo-600'
          }`}
          title={value.trim() ? `Clear (back to empty)` : `Mark ${quickLabel}`}
        >
          {value.trim() ? '✕' : quickLabel}
        </button>
      </span>
      <textarea className="input min-h-[56px]" value={value} onChange={onChange} placeholder={placeholder} />
    </label>
  );
}

function formatTime(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
}

// ─── Admit (inpatient) ──────────────────────────────────────────────────────────

function AdmitPanel({
  patientId, patientName, canConsult,
}: {
  consultation: ConsultationDetail | null;
  patientId?: string;
  patientName?: string;
  canConsult: boolean;
}) {
  const { user } = useAuth();
  const [admissions, setAdmissions] = useState<AdmissionDetail[]>([]);
  const [loading, setLoading] = useState(false);
  const [wardName, setWardName] = useState('');
  const [bedNumber, setBedNumber] = useState('');
  const [saving, setSaving] = useState(false);

  const load = async () => {
    if (!patientId) return;
    setLoading(true);
    try {
      const res = await InpatientService.list(1, 10, false, patientId);
      const details = await Promise.all(res.items.map((a) => InpatientService.detail(a.id).catch(() => null)));
      setAdmissions(details.filter((d): d is AdmissionDetail => d !== null));
    } catch {
      setAdmissions([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [patientId]);

  const admit = async () => {
    if (!patientId || !wardName.trim() || !bedNumber.trim()) {
      toast.error('Ward name and bed number are required.');
      return;
    }
    setSaving(true);
    try {
      await InpatientService.admit({
        patientId,
        admittingClinicianUserId: user?.id ?? '',
        wardName: wardName.trim(),
        bedNumber: bedNumber.trim(),
      });
      toast.success('Patient admitted');
      setWardName('');
      setBedNumber('');
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to admit patient');
    } finally {
      setSaving(false);
    }
  };

  const discharge = async (id: string) => {
    try {
      await InpatientService.discharge(id);
      toast.success('Patient discharged');
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to discharge patient');
    }
  };

  if (!patientId) {
    return (
      <div className="text-center py-12">
        <BedDouble size={28} className="text-slate-300 mx-auto mb-3" />
        <p className="text-sm text-slate-400">Select a patient to manage admissions.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-slate-900">Inpatient admission</p>
          <p className="text-xs text-slate-400 mt-0.5">{patientName ?? ''}</p>
        </div>
        <button className="btn-ghost text-xs" onClick={() => void load()}>
          <RefreshCw size={12} className="mr-1" />
          Refresh
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center gap-3 py-10">
          <Loader2 size={18} className="animate-spin text-indigo-600" />
          <p className="text-sm text-slate-400">Loading admissions…</p>
        </div>
      ) : admissions.length === 0 ? (
        <div className="text-center py-10">
          <BedDouble size={28} className="text-slate-300 mx-auto mb-3" />
          <p className="text-sm text-slate-400">Patient is not currently admitted.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {admissions.map((a) => (
            <div key={a.id} className="p-4 rounded-lg bg-slate-50 border border-slate-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-slate-900">{a.wardName} · Bed {a.bedNumber}</p>
                  <p className="text-xs text-slate-400 mt-0.5">Admitted {formatDateTime(a.admittedAtUtc)}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs px-2.5 py-1 rounded-full border ${
                    a.status === 'Admitted' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-500 border-slate-200'
                  }`}>
                    {a.status}
                  </span>
                  {a.status === 'Admitted' && canConsult && (
                    <button className="btn-ghost text-xs text-red-600 border-red-200 hover:bg-red-50" onClick={() => void discharge(a.id)}>
                      Discharge
                    </button>
                  )}
                </div>
              </div>
              {a.notes.length > 0 && (
                <ul className="mt-3 pt-3 border-t border-slate-200 space-y-1.5 text-sm">
                  {a.notes.map((n, i) => (
                    <li key={i} className="text-slate-600">
                      {n.content}
                      <span className="block text-[11px] text-slate-400">{formatDateTime(n.recordedAtUtc)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      )}

      {canConsult && (
        <div className="p-4 rounded-lg bg-slate-50 border border-slate-200">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Admit patient</p>
          <div className="grid sm:grid-cols-2 gap-3">
            <input className="input" placeholder="Ward name (e.g. Male Medical)" value={wardName} onChange={(e) => setWardName(e.target.value)} />
            <input className="input" placeholder="Bed number" value={bedNumber} onChange={(e) => setBedNumber(e.target.value)} />
          </div>
          <div className="flex justify-end mt-3">
            <button className="btn-primary" disabled={saving} onClick={() => void admit()}>
              {saving && <Loader2 size={15} className="animate-spin" />}
              Admit
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Referral ───────────────────────────────────────────────────────────────────

const REFERRAL_PRIORITIES = ['Routine', 'Urgent', 'Emergency'];

function ReferralPanel({
  consultation, patientName, canConsult, onChanged,
}: {
  consultation: ConsultationDetail | null;
  patientName?: string;
  canConsult: boolean;
  onChanged: (c: ConsultationDetail) => void;
}) {
  const [form, setForm] = useState({
    referredToFacility: '',
    referredToUnit: '',
    reason: '',
    priority: 'Routine' as ReferralInput['priority'],
    notes: '',
  });
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!consultation) {
      toast.error('Start a consultation before referring.');
      return;
    }
    if (!form.referredToFacility.trim() || !form.reason.trim()) {
      toast.error('Destination and reason are required.');
      return;
    }
    setSaving(true);
    try {
      const updated = await ConsultationService.createReferral(consultation.id, {
        referredToFacility: form.referredToFacility.trim(),
        referredToUnit: form.referredToUnit.trim() || null,
        reason: form.reason.trim(),
        priority: form.priority,
        notes: form.notes.trim() || null,
      });
      onChanged(updated);
      toast.success('Referral created');
      setForm({ referredToFacility: '', referredToUnit: '', reason: '', priority: 'Routine', notes: '' });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create referral');
    } finally {
      setSaving(false);
    }
  };

  const referrals = consultation?.referrals ?? [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-slate-900">Referral</p>
          <p className="text-xs text-slate-400 mt-0.5">{patientName ?? ''} — escalate care to another unit or facility</p>
        </div>
        <span className="text-xs px-2 py-1 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
          {referrals.length} referral{referrals.length === 1 ? '' : 's'}
        </span>
      </div>

      {referrals.length > 0 && (
        <div className="space-y-3">
          {referrals.map((r) => (
            <div key={r.id} className="p-4 rounded-lg bg-slate-50 border border-slate-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-slate-900">{r.referredToFacility}</p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {r.referredToUnit ? `${r.referredToUnit} · ` : ''}{formatDateTime(r.referredAtUtc)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    r.priority === 'Emergency' ? 'bg-red-100 text-red-700'
                      : r.priority === 'Urgent' ? 'bg-amber-100 text-amber-700'
                        : 'bg-slate-100 text-slate-600'
                  }`}>
                    {r.priority}
                  </span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-sky-50 text-sky-700 border border-sky-200">
                    {r.status}
                  </span>
                </div>
              </div>
              <p className="text-sm text-slate-600 mt-2">{r.reason}</p>
              {r.notes && <p className="text-xs text-slate-400 mt-1">{r.notes}</p>}
            </div>
          ))}
        </div>
      )}

      {canConsult && (
        <div className="p-4 rounded-lg bg-slate-50 border border-slate-200">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">New referral</p>
          <div className="space-y-3">
            <div className="grid sm:grid-cols-2 gap-3">
              <input
                className="input"
                placeholder="Referred to facility (e.g. Kenyatta National Hospital)"
                value={form.referredToFacility}
                onChange={(e) => setForm({ ...form, referredToFacility: e.target.value })}
              />
              <input
                className="input"
                placeholder="Unit / clinic (e.g. Orthopaedics)"
                value={form.referredToUnit}
                onChange={(e) => setForm({ ...form, referredToUnit: e.target.value })}
              />
            </div>
            <textarea
              className="input min-h-[80px]"
              placeholder="Reason for referral"
              value={form.reason}
              onChange={(e) => setForm({ ...form, reason: e.target.value })}
            />
            <div className="grid sm:grid-cols-2 gap-3">
              <select
                className="input"
                value={form.priority}
                onChange={(e) => setForm({ ...form, priority: e.target.value as ReferralInput['priority'] })}
              >
                {REFERRAL_PRIORITIES.map((p) => <option key={p}>{p}</option>)}
              </select>
              <input
                className="input"
                placeholder="Notes (optional)"
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
              />
            </div>
          </div>
          <div className="flex justify-end mt-3">
            <button className="btn-primary" disabled={saving} onClick={() => void submit()}>
              {saving && <Loader2 size={15} className="animate-spin" />}
              Create referral
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Prescribe (auto-billed) ────────────────────────────────────────────────────

function PrescribePanel({ consultation, patientId, patientName }: { consultation: ConsultationDetail | null; patientId?: string; patientName?: string }) {
  const [drugs, setDrugs] = useState<DrugCatalogDto[]>([]);
  const [lines, setLines] = useState([{ drugId: '', dosageInstructions: '', quantityPrescribed: 1 }]);
  const [saving, setSaving] = useState(false);
  const [prescriptions, setPrescriptions] = useState<PrescriptionDetail[]>([]);
  const [loadingRx, setLoadingRx] = useState(false);

  const loadPrescriptions = async () => {
    if (!consultation) return;
    setLoadingRx(true);
    try {
      setPrescriptions(await PharmacyService.byConsultation(consultation.id));
    } catch {
      setPrescriptions([]);
    } finally {
      setLoadingRx(false);
    }
  };

  useEffect(() => {
    void loadPrescriptions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [consultation?.id]);

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
      await loadPrescriptions();
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

      {/* Prescription history — kept in track, incl. dispense status */}
      {loadingRx ? (
        <div className="flex items-center justify-center gap-2 py-8">
          <Loader2 size={16} className="animate-spin text-indigo-600" />
          <p className="text-sm text-slate-400">Loading prescriptions…</p>
        </div>
      ) : prescriptions.length > 0 ? (
        <div className="space-y-3">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Prescriptions ({prescriptions.length})
          </p>
          {prescriptions.map((rx) => (
            <div key={rx.id} className="p-3.5 rounded-lg bg-slate-50 border border-slate-200">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs text-slate-400">{formatDateTime(rx.prescribedAtUtc)}</p>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                  rx.status === 'FullyDispensed'
                    ? 'bg-emerald-100 text-emerald-700'
                    : rx.status === 'PartiallyDispensed'
                      ? 'bg-amber-100 text-amber-700'
                      : 'bg-slate-100 text-slate-600'
                }`}>
                  {rx.status}
                </span>
              </div>
              <ul className="space-y-1.5">
                {rx.items.map((item) => (
                  <li key={item.id} className="flex items-start justify-between gap-3 text-sm">
                    <div className="min-w-0">
                      <p className="text-slate-700">{drugLabel(item.drugId, drugs)}</p>
                      <p className="text-xs text-slate-400">{item.dosageInstructions}</p>
                    </div>
                    <span className="text-xs shrink-0">
                      <span className="font-medium text-slate-600">{item.quantityDispensed}/{item.quantityPrescribed}</span>
                      <span className="text-slate-400"> dispensed</span>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      ) : null}

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

/** Best-effort drug name lookup for prescription history display. */
function drugLabel(drugId: string, drugs: DrugCatalogDto[]): string {
  return drugs.find((d) => d.id === drugId)?.name ?? drugId.slice(0, 8);
}

// ─── Order tests (auto-billed) ──────────────────────────────────────────────────

function OrderTestsPanel({ consultation, patientId, patientName }: { consultation: ConsultationDetail | null; patientId?: string; patientName?: string }) {
  const [tests, setTests] = useState([{ testCode: '', testName: '' }]);
  const [saving, setSaving] = useState(false);
  const [orders, setOrders] = useState<LabOrderDetail[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);

  const loadOrders = async () => {
    if (!consultation) return;
    setLoadingOrders(true);
    try {
      setOrders(await LaboratoryService.byConsultation(consultation.id));
    } catch {
      setOrders([]);
    } finally {
      setLoadingOrders(false);
    }
  };

  useEffect(() => {
    void loadOrders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [consultation?.id]);

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
      await loadOrders();
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

      {/* Lab orders + results — kept in track for the doctor */}
      {loadingOrders ? (
        <div className="flex items-center justify-center gap-2 py-8">
          <Loader2 size={16} className="animate-spin text-indigo-600" />
          <p className="text-sm text-slate-400">Loading lab orders…</p>
        </div>
      ) : orders.length > 0 ? (
        <div className="space-y-3">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Lab orders ({orders.length})
          </p>
          {orders.map((order) => (
            <div key={order.id} className="p-3.5 rounded-lg bg-slate-50 border border-slate-200">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs text-slate-400">{formatDateTime(order.orderedAtUtc)}</p>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                  order.status === 'Completed'
                    ? 'bg-emerald-100 text-emerald-700'
                    : order.status === 'Pending'
                      ? 'bg-slate-100 text-slate-600'
                      : 'bg-amber-100 text-amber-700'
                }`}>
                  {order.status}
                </span>
              </div>
              <table className="w-full text-sm">
                <tbody>
                  {order.tests.map((t) => (
                    <tr key={t.id} className="border-t border-slate-200 first:border-t-0">
                      <td className="py-1.5 pr-2">
                        <p className="font-medium text-slate-700">{t.testName}</p>
                        <p className="text-[11px] text-slate-400">{t.testCode} · {t.status}</p>
                      </td>
                      <td className="py-1.5 text-right whitespace-nowrap">
                        {t.status === 'Resulted' ? (
                          <span className="flex items-center justify-end gap-2">
                            <span className={`font-mono text-xs ${t.isAbnormal ? 'text-red-600 font-semibold' : 'text-slate-700'}`}>
                              {t.resultValue}{t.resultUnit ? ` ${t.resultUnit}` : ''}
                            </span>
                            {t.referenceRange && (
                              <span className="text-[11px] text-slate-400">ref {t.referenceRange}</span>
                            )}
                            {t.isAbnormal && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-red-100 text-red-700 font-semibold">ABNORMAL</span>
                            )}
                          </span>
                        ) : (
                          <span className="text-xs text-slate-400">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      ) : null}

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
    <form onSubmit={submit} className="space-y-3 pt-2">
      {/* ICD-10 typeahead — search disease by name or code */}
      <Icd10Search
        autoFocus
        onSelect={(entry) => {
          setIcdCode(entry.code);
          setDescription(entry.name);
        }}
      />

      {/* Selected / manual code + description */}
      <div className="flex gap-2">
        <input
          className="input w-28 font-mono"
          placeholder="ICD-10"
          value={icdCode}
          onChange={(e) => setIcdCode(e.target.value)}
          autoComplete="off"
          spellCheck={false}
        />
        <input
          className="input"
          placeholder="Description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
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
