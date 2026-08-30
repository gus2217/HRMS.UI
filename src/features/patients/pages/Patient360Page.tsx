// ============================================================
// Patient360Page.tsx
// Location: src/features/patients/pages/Patient360Page.tsx
//
// The patient's medical record.
//
// For clinicians (Clinical.View — Doctor, Nurse, Administrator):
//   a full per-visit timeline — each consultation shows triage,
//   structured documentation (CC → HPI → PMSHX → ROS → Exam),
//   diagnoses, DATED notes, lab results and prescriptions with
//   dispense status — so care can be followed visit by visit.
//
// For everyone else (lab, pharmacy, receptionist, accountant,
// records, IT): minimal — demographics, allergies, consents,
// next of kin only. No clinical content. The backend also masks
// confidential fields for roles without Patient.ConfidentialView.
// ============================================================

import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  ArrowLeft, Loader2, Phone, MapPin, ShieldAlert, FileText, Stethoscope,
  Users, ChevronDown, FlaskConical, Pill, Send,
} from 'lucide-react';
import { PatientService } from '../services/patientService';
import { ConsultationService } from '@/features/consultations/services/consultationService';
import { LaboratoryService } from '@/features/laboratory/services/laboratoryService';
import { PharmacyService } from '@/features/pharmacy/services/pharmacyService';
import type { ClinicalDocumentationDto, ConsultationRecord, PatientMedicalRecord } from '@/features/consultations/types/consultation';
import type { PatientDetail } from '@/features/patients/types/patient';
import type { LabOrderDetail } from '@/features/laboratory/types/laboratory';
import type { PrescriptionDetail } from '@/features/pharmacy/types/pharmacy';
import { formatDate, formatDateTime, ageFromDateOfBirth } from '@/lib/format';
import { useAuth } from '@/features/auth/components/AuthContext';
import { hasPermission, PERMISSIONS } from '@/lib/permissions';

const INSURANCE_LABELS: Record<string, string> = {
  Sha: 'SHA insurance',
  Other: 'Other insurance',
  Private: 'Private (self-pay)',
};

const CLINIC_LABELS: Record<string, string> = {
  GeneralOutpatient: 'General outpatient',
  Counselling: 'Counselling',
  Laboratory: 'Laboratory',
  Immunization: 'Immunization',
  Wellness: 'Wellness',
  ReproductiveHealth: 'Reproductive health (RH)',
  ChildWelfare: 'Child welfare',
  MaternalChildHealth: 'Maternal & child health (MCH)',
  Antenatal: 'Antenatal (ANC)',
  Postnatal: 'Postnatal (PNC)',
  FamilyPlanning: 'Family planning',
  ComprehensiveCareCentre: 'Comprehensive care (CCC)',
  Tuberculosis: 'TB clinic',
  Nutrition: 'Nutrition',
  Dental: 'Dental',
  Eye: 'Eye clinic',
  Ent: 'ENT',
  Physiotherapy: 'Physiotherapy / rehab',
  AdolescentYouthFriendly: 'Adolescent & youth friendly',
};

const PMHX_FIELDS: { key: keyof ClinicalDocumentationDto; label: string }[] = [
  { key: 'pastMedicalHistory', label: 'Past medical history' },
  { key: 'pastSurgicalHistory', label: 'Past surgical history' },
  { key: 'familyHistory', label: 'Family history' },
  { key: 'socialHistory', label: 'Social history' },
  { key: 'gynaecologicalHistory', label: 'Gynaecological history' },
  { key: 'obstetricHistory', label: 'Obstetric history' },
  { key: 'drugHistory', label: 'Drug history' },
];

const ROS_FIELDS: { key: keyof ClinicalDocumentationDto; label: string }[] = [
  { key: 'rosGeneral', label: 'General' },
  { key: 'rosCardiovascular', label: 'Cardiovascular' },
  { key: 'rosRespiratory', label: 'Respiratory' },
  { key: 'rosGastrointestinal', label: 'Gastrointestinal' },
  { key: 'rosGenitourinary', label: 'Genitourinary' },
  { key: 'rosMusculoskeletal', label: 'Musculoskeletal' },
  { key: 'rosNeurological', label: 'Neurological' },
  { key: 'rosDermatological', label: 'Dermatological' },
  { key: 'rosEntEyes', label: 'ENT & eyes' },
  { key: 'rosEndocrine', label: 'Endocrine' },
];

const EXAM_FIELDS: { key: keyof ClinicalDocumentationDto; label: string }[] = [
  { key: 'examGeneralAppearance', label: 'General appearance' },
  { key: 'examHeadAndNeck', label: 'Head & neck' },
  { key: 'examCardiovascular', label: 'Cardiovascular system' },
  { key: 'examRespiratory', label: 'Respiratory system' },
  { key: 'examAbdominal', label: 'Abdomen' },
  { key: 'examGenitourinary', label: 'Genitourinary' },
  { key: 'examMusculoskeletal', label: 'Musculoskeletal' },
  { key: 'examNeurological', label: 'Neurological' },
  { key: 'examSkin', label: 'Skin' },
  { key: 'examLymphatic', label: 'Lymphatic system' },
];

type EnrichedVisit = ConsultationRecord & {
  labOrders: LabOrderDetail[];
  prescriptions: PrescriptionDetail[];
};

export default function Patient360Page() {
  const { id } = useParams<{ id: string }>();
  const { permissions } = useAuth();
  const isClinical = hasPermission(permissions, PERMISSIONS.CLINICAL_VIEW);

  const [patient, setPatient] = useState<PatientDetail | null>(null);
  const [record, setRecord] = useState<PatientMedicalRecord | null>(null);
  const [visits, setVisits] = useState<EnrichedVisit[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    let mounted = true;
    const load = async () => {
      try {
        const [p, rec] = await Promise.all([
          PatientService.detail(id),
          isClinical ? ConsultationService.medicalRecord(id).catch(() => null) : Promise.resolve(null),
        ]);
        if (!mounted) return;
        setPatient(p);
        setRecord(rec);

        // Per-visit lab results + prescriptions (Clinical.View-gated endpoints).
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
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Failed to load patient');
      } finally {
        if (mounted) setLoading(false);
      }
    };
    void load();
    return () => {
      mounted = false;
    };
  }, [id, isClinical]);

  if (loading) {
    return (
      <div className="min-h-full flex flex-col items-center justify-center gap-3">
        <Loader2 size={24} className="animate-spin text-indigo-600" />
        <p className="text-slate-400 text-sm">Loading patient record…</p>
      </div>
    );
  }

  if (!patient) {
    return (
      <div className="p-8 text-center">
        <p className="text-slate-500">Patient not found.</p>
        <Link to="/patients" className="text-indigo-600 text-sm inline-flex items-center gap-1 mt-3">
          <ArrowLeft size={14} /> Back to patients
        </Link>
      </div>
    );
  }

  return (
    <div className="p-5 lg:p-8 space-y-6">
      <Link to="/patients" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900">
        <ArrowLeft size={14} /> Patients
      </Link>

      {/* Header card */}
      <div className="card p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <span className="w-14 h-14 rounded-full bg-indigo-600/10 text-indigo-700 flex items-center justify-center text-lg font-bold">
              {patient.firstName[0]}{patient.lastName[0]}
            </span>
            <div>
              <h1 className="text-xl font-bold text-slate-900">{patient.firstName} {patient.lastName}</h1>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-sm text-slate-500">
                <span className="font-mono text-xs text-indigo-600">{patient.patientNumber}</span>
                <span>{ageFromDateOfBirth(patient.dateOfBirth) ?? '—'} yrs · {patient.gender}</span>
                <span>{patient.maritalStatus}</span>
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                  patient.status === 'Active' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'
                }`}>
                  {patient.status}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-4 mt-5 pt-5 border-t border-slate-200 text-sm">
          <div>
            <p className="text-xs text-slate-400 mb-1 flex items-center gap-1.5"><Phone size={12} /> Phone</p>
            <p className="text-slate-700">{patient.phone ?? '—'}</p>
          </div>
          <div>
            <p className="text-xs text-slate-400 mb-1 flex items-center gap-1.5"><MapPin size={12} /> Address</p>
            <p className="text-slate-700">{patient.county}{patient.subCounty ? `, ${patient.subCounty}` : ''}{patient.ward ? `, ${patient.ward}` : ''}</p>
          </div>
          <div>
            <p className="text-xs text-slate-400 mb-1">Insurance</p>
            <p className="text-slate-700">
              {patient.insuranceNumber
                ? `${INSURANCE_LABELS[patient.insuranceType] ?? patient.insuranceType} · ${patient.insuranceNumber}`
                : INSURANCE_LABELS[patient.insuranceType] ?? patient.insuranceType}
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-400 mb-1">Clinic</p>
            <p className="text-slate-700">{CLINIC_LABELS[patient.clinicType] ?? patient.clinicType}</p>
          </div>
          <div>
            <p className="text-xs text-slate-400 mb-1">Date of birth</p>
            <p className="text-slate-700">{formatDate(patient.dateOfBirth)}</p>
          </div>
        </div>
      </div>

      {isClinical ? (
        <MedicalRecordTimeline record={record} visits={visits} />
      ) : (
        <MinimalRecord patient={patient} />
      )}
    </div>
  );
}

// ─── Clinician view: per-visit medical record ──────────────────────────────────

function MedicalRecordTimeline({
  record, visits,
}: {
  record: PatientMedicalRecord | null;
  visits: EnrichedVisit[];
}) {
  const [openVisits, setOpenVisits] = useState<Set<string>>(new Set());

  const toggle = (visitId: string) =>
    setOpenVisits((prev) => {
      const next = new Set(prev);
      if (next.has(visitId)) next.delete(visitId);
      else next.add(visitId);
      return next;
    });

  if (record === null) {
    return (
      <div className="card p-10 text-center">
        <Stethoscope size={30} className="text-slate-300 mx-auto mb-3" />
        <p className="text-sm text-slate-500">No consultations on record for this patient yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
          <Stethoscope size={15} className="text-indigo-600" /> Medical record
        </h2>
        <span className="text-xs text-slate-400">{visits.length} visit{visits.length === 1 ? '' : 's'}</span>
      </div>

      {/* Visit timeline */}
      <div className="relative space-y-4 pl-5 border-l-2 border-slate-100">
        {visits.map((visit) => {
          const open = openVisits.has(visit.id);
          return (
            <div key={visit.id} className="relative">
              {/* Timeline dot */}
              <span className="absolute -left-[27px] top-4 w-3 h-3 rounded-full border-2 border-indigo-600 bg-white" />
              <VisitCard visit={visit} open={open} onToggle={() => toggle(visit.id)} />
            </div>
          );
        })}
      </div>
    </div>
  );
}

function VisitCard({ visit, open, onToggle }: { visit: EnrichedVisit; open: boolean; onToggle: () => void }) {
  const doc = visit.documentation;
  const hasContent = doc !== null;

  return (
    <div className="card overflow-hidden">
      {/* Visit header */}
      <button type="button" onClick={onToggle} className="w-full flex items-center justify-between gap-3 px-5 py-4 hover:bg-slate-50 transition-colors">
        <div className="flex items-center gap-3">
          <span className="text-sm font-bold text-slate-900">{formatDate(visit.startedAtUtc)}</span>
          <span className="text-xs text-slate-400">{formatDateTime(visit.startedAtUtc)}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
            visit.status === 'Completed' ? 'bg-emerald-100 text-emerald-700'
              : visit.status === 'InConsultation' ? 'bg-sky-100 text-sky-700'
                : 'bg-slate-100 text-slate-600'
          }`}>
            {visit.status}
          </span>
          <ChevronDown size={15} className={`text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
        </div>
      </button>

      {open && (
        <div className="px-5 pb-5 space-y-4 border-t border-slate-100">
          {/* Triage */}
          {visit.triage && (
            <div className="grid grid-cols-5 gap-2 text-center text-sm pt-4">
              <Vital label="Temp" value={visit.triage.temperatureCelsius ? `${visit.triage.temperatureCelsius}°C` : '—'} />
              <Vital label="BP" value={visit.triage.bloodPressure ?? '—'} />
              <Vital label="Pulse" value={visit.triage.pulseRate?.toString() ?? '—'} />
              <Vital label="Resp" value={visit.triage.respiratoryRate?.toString() ?? '—'} />
              <Vital label="Weight" value={visit.triage.weightKg ? `${visit.triage.weightKg}kg` : '—'} />
            </div>
          )}

          {/* Chief complaint + HPI */}
          {(doc?.chiefComplaint || doc?.historyOfPresentingIllness) && (
            <RecordSection title="History">
              {doc?.chiefComplaint && <RecordLine label="Chief complaint" value={doc.chiefComplaint} />}
              {doc?.historyOfPresentingIllness && <RecordLine label="History of presenting illness" value={doc.historyOfPresentingIllness} />}
            </RecordSection>
          )}

          {/* PMSHX */}
          {hasContent && PMHX_FIELDS.some((f) => doc?.[f.key]) && (
            <RecordSection title="PMSHX">
              {PMHX_FIELDS.filter((f) => doc?.[f.key]).map((f) => (
                <RecordLine key={f.key} label={f.label} value={doc![f.key] as string} />
              ))}
            </RecordSection>
          )}

          {/* ROS */}
          {hasContent && ROS_FIELDS.some((f) => doc?.[f.key]) && (
            <RecordSection title="Review of systems">
              <div className="grid sm:grid-cols-2 gap-x-6 gap-y-2">
                {ROS_FIELDS.filter((f) => doc?.[f.key]).map((f) => (
                  <div key={f.key} className="flex items-baseline justify-between gap-3 text-sm">
                    <span className="text-slate-500 shrink-0">{f.label}</span>
                    <span className="text-slate-800 text-right">{doc![f.key] as string}</span>
                  </div>
                ))}
              </div>
            </RecordSection>
          )}

          {/* Examination */}
          {hasContent && EXAM_FIELDS.some((f) => doc?.[f.key]) && (
            <RecordSection title="Examination">
              <div className="grid sm:grid-cols-2 gap-x-6 gap-y-2">
                {EXAM_FIELDS.filter((f) => doc?.[f.key]).map((f) => (
                  <div key={f.key} className="flex items-baseline justify-between gap-3 text-sm">
                    <span className="text-slate-500 shrink-0">{f.label}</span>
                    <span className="text-slate-800 text-right">{doc![f.key] as string}</span>
                  </div>
                ))}
              </div>
            </RecordSection>
          )}

          {/* Diagnoses */}
          {visit.diagnoses.length > 0 && (
            <RecordSection title="Diagnosis">
              <div className="space-y-1.5">
                {visit.diagnoses.map((d, i) => (
                  <div key={i} className="flex items-start gap-2 text-sm">
                    <span className="font-mono text-xs px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-700 shrink-0">{d.icdCode}</span>
                    <span className="text-slate-700">{d.description}</span>
                    {d.isPrimary && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-indigo-50 text-indigo-600 shrink-0">Primary</span>}
                  </div>
                ))}
              </div>
            </RecordSection>
          )}

          {/* Notes — dated, per visit */}
          {visit.notes.length > 0 && (
            <RecordSection title={`Clinical notes (${visit.notes.length})`}>
              <ul className="space-y-2.5">
                {visit.notes.map((n, i) => (
                  <li key={i} className="text-sm text-slate-700">
                    {n.content}
                    <span className="block text-[11px] text-slate-400 mt-0.5">{formatDateTime(n.recordedAtUtc)}</span>
                  </li>
                ))}
              </ul>
            </RecordSection>
          )}

          {/* Lab orders + results */}
          {visit.labOrders.length > 0 && (
            <RecordSection title={`Laboratory (${visit.labOrders.length})`} icon={<FlaskConical size={12} />}>
              <div className="space-y-3">
                {visit.labOrders.map((order) => (
                  <div key={order.id} className="rounded-lg bg-slate-50 border border-slate-200 p-3">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs text-slate-400">{formatDateTime(order.orderedAtUtc)}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        order.status === 'Completed' ? 'bg-emerald-100 text-emerald-700'
                          : order.status === 'Pending' ? 'bg-slate-100 text-slate-600'
                            : 'bg-amber-100 text-amber-700'
                      }`}>{order.status}</span>
                    </div>
                    {order.tests.map((t) => (
                      <div key={t.id} className="flex items-start justify-between gap-3 py-1 text-sm border-t border-slate-200 first:border-t-0">
                        <div>
                          <p className="font-medium text-slate-700">{t.testName}</p>
                          <p className="text-[11px] text-slate-400">{t.testCode} · {t.status}</p>
                        </div>
                        {t.status === 'Resulted' ? (
                          <div className="text-right shrink-0">
                            <p className={`font-mono text-xs ${t.isAbnormal ? 'text-red-600 font-semibold' : 'text-slate-800'}`}>
                              {t.resultValue}{t.resultUnit ? ` ${t.resultUnit}` : ''}
                            </p>
                            {t.referenceRange && <p className="text-[11px] text-slate-400">ref {t.referenceRange}</p>}
                            {t.isAbnormal && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-red-100 text-red-700 font-semibold">ABNORMAL</span>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400 shrink-0">—</span>
                        )}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </RecordSection>
          )}

          {/* Prescriptions + dispense status */}
          {visit.prescriptions.length > 0 && (
            <RecordSection title={`Prescriptions (${visit.prescriptions.length})`} icon={<Pill size={12} />}>
              <div className="space-y-3">
                {visit.prescriptions.map((rx) => (
                  <div key={rx.id} className="rounded-lg bg-slate-50 border border-slate-200 p-3">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs text-slate-400">{formatDateTime(rx.prescribedAtUtc)}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        rx.status === 'FullyDispensed' ? 'bg-emerald-100 text-emerald-700'
                          : rx.status === 'PartiallyDispensed' ? 'bg-amber-100 text-amber-700'
                            : 'bg-slate-100 text-slate-600'
                      }`}>{rx.status}</span>
                    </div>
                    {rx.items.map((item) => (
                      <div key={item.id} className="flex items-start justify-between gap-3 py-1 text-sm border-t border-slate-200 first:border-t-0">
                        <div className="min-w-0">
                          <p className="font-medium text-slate-700">{item.dosageInstructions}</p>
                          <p className="text-[11px] text-slate-400">drug · {item.quantityPrescribed} prescribed</p>
                        </div>
                        <span className="text-xs shrink-0">
                          <span className="font-medium text-slate-600">{item.quantityDispensed}/{item.quantityPrescribed}</span>
                          <span className="text-slate-400"> dispensed</span>
                        </span>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </RecordSection>
          )}

          {/* Referrals */}
          {visit.referrals.length > 0 && (
            <RecordSection title={`Referrals (${visit.referrals.length})`} icon={<Send size={12} />}>
              <div className="space-y-1.5">
                {visit.referrals.map((r) => (
                  <div key={r.id} className="flex items-start justify-between gap-3 text-sm">
                    <div>
                      <p className="font-medium text-slate-700">{r.referredToFacility}{r.referredToUnit ? ` · ${r.referredToUnit}` : ''}</p>
                      <p className="text-xs text-slate-500">{r.reason}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        r.priority === 'Emergency' ? 'bg-red-100 text-red-700'
                          : r.priority === 'Urgent' ? 'bg-amber-100 text-amber-700'
                            : 'bg-slate-100 text-slate-600'
                      }`}>{r.priority}</span>
                      <span className="text-xs text-slate-400">{r.status}</span>
                    </div>
                  </div>
                ))}
              </div>
            </RecordSection>
          )}

          {!hasContent && visit.notes.length === 0 && visit.diagnoses.length === 0 && visit.labOrders.length === 0 && visit.prescriptions.length === 0 && (
            <p className="text-sm text-slate-400 pt-4">No clinical content recorded for this visit.</p>
          )}
        </div>
      )}
    </div>
  );
}

function RecordSection({
  title, icon, children,
}: {
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="pt-4">
      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
        {icon}
        {title}
      </p>
      {children}
    </div>
  );
}

function RecordLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="text-sm py-0.5">
      <span className="text-slate-500 mr-2">{label}:</span>
      <span className="text-slate-800">{value}</span>
    </div>
  );
}

function Vital({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[11px] text-slate-400">{label}</p>
      <p className="font-medium text-slate-700">{value}</p>
    </div>
  );
}

// ─── Non-clinical view: minimal ────────────────────────────────────────────────

function MinimalRecord({ patient }: { patient: PatientDetail }) {
  return (
    <div className="grid lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 card p-5">
        <h2 className="text-sm font-semibold text-slate-900 flex items-center gap-2 mb-3">
          <Stethoscope size={15} className="text-indigo-600" /> Patient summary
        </h2>
        <p className="text-sm text-slate-500">
          Full medical records are available to clinicians (doctors, nurses and administrators).
        </p>
        <div className="grid grid-cols-2 gap-3 mt-4 text-sm">
          <div>
            <p className="text-xs text-slate-400">Phone</p>
            <p className="text-slate-700 font-medium mt-0.5">{patient.phone ?? '—'}</p>
          </div>
          <div>
            <p className="text-xs text-slate-400">DOB</p>
            <p className="text-slate-700 font-medium mt-0.5">{formatDate(patient.dateOfBirth)}</p>
          </div>
          <div>
            <p className="text-xs text-slate-400">Gender</p>
            <p className="text-slate-700 font-medium mt-0.5">{patient.gender}</p>
          </div>
          <div>
            <p className="text-xs text-slate-400">Status</p>
            <p className="text-slate-700 font-medium mt-0.5">{patient.status}</p>
          </div>
        </div>
      </div>

      <div className="space-y-6">
        <div className="card p-5">
          <h2 className="text-sm font-semibold text-slate-900 flex items-center gap-2 mb-3">
            <ShieldAlert size={15} className="text-indigo-600" /> Allergies
          </h2>
          {patient.allergies.length === 0 ? (
            <p className="text-sm text-slate-400">No known allergies.</p>
          ) : (
            <ul className="space-y-2">
              {patient.allergies.map((a, i) => (
                <li key={i} className="text-sm">
                  <span className="font-medium text-slate-900">{a.substance}</span>
                  <span className={`ml-2 text-xs px-2 py-0.5 rounded-full ${
                    a.severity === 'Severe' ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-500'
                  }`}>{a.severity}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="card p-5">
          <h2 className="text-sm font-semibold text-slate-900 flex items-center gap-2 mb-3">
            <FileText size={15} className="text-indigo-600" /> Consents
          </h2>
          {patient.consents.length === 0 ? (
            <p className="text-sm text-slate-400">No consents recorded.</p>
          ) : (
            <ul className="space-y-2 text-sm">
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

        {patient.nextOfKin.length > 0 && (
          <div className="card p-5">
            <h2 className="text-sm font-semibold text-slate-900 mb-3 flex items-center gap-2">
              <Users size={15} className="text-indigo-600" /> Next of kin
            </h2>
            <ul className="space-y-2 text-sm">
              {patient.nextOfKin.map((n, i) => (
                <li key={i} className="text-slate-600">
                  {n.fullName} <span className="text-slate-400">· {n.relationship}</span>
                  {n.phone && <span className="block text-xs text-slate-400">{n.phone}</span>}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
