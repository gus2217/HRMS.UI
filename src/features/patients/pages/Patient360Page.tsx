// ============================================================
// Patient360Page.tsx
// Location: src/features/patients/pages/Patient360Page.tsx
//
// The patient's medical record — an elite, clinician-first workspace.
//
// For clinicians (Clinical.View — Doctor, Nurse, Administrator):
//   a rich identity header with KenyaEMR-standard demographics, a quick
//   action toolbar (Consult / Triage / Imaging / Book / Flag), the flags
//   banner, clinical summary, diagnostic orders, attachments and the full
//   per-visit medical timeline — so care can be followed visit by visit
//   without leaving the patient.
//
// For everyone else (lab, pharmacy, receptionist, accountant, records, IT):
//   minimal — demographics, allergies, consents, next of kin only. The
//   backend also masks confidential fields for roles without
//   Patient.ConfidentialView.
// ============================================================

import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  ArrowLeft, Loader2, Phone, MapPin, Stethoscope,
  Users, Activity, CalendarPlus, ScanLine, Flag, GraduationCap, Briefcase,
  ShieldAlert, Paperclip, History,
} from 'lucide-react';
import { PatientService } from '../services/patientService';
import { ConsultationService } from '@/features/consultations/services/consultationService';
import { LaboratoryService } from '@/features/laboratory/services/laboratoryService';
import { PharmacyService } from '@/features/pharmacy/services/pharmacyService';
import type { PatientMedicalRecord } from '@/features/consultations/types/consultation';
import type { LabOrderDetail } from '@/features/laboratory/types/laboratory';
import type { PrescriptionDetail } from '@/features/pharmacy/types/pharmacy';
import type { PatientDetail } from '@/features/patients/types/patient';
import { MedicalRecordTimeline, type EnrichedVisit } from '../components/MedicalRecordTimeline';
import AllergiesConsentsPanel from '../components/AllergiesConsentsPanel';
import ClinicalSummaryPanel from '../components/ClinicalSummaryPanel';
import PatientFlagsBanner from '../components/PatientFlagsBanner';
import AttachmentsPanel from '../components/AttachmentsPanel';
import DiagnosticOrdersPanel from '../components/DiagnosticOrdersPanel';
import RecordVitalsModal from '../components/RecordVitalsModal';
import RaiseFlagModal from '../components/RaiseFlagModal';
import CreateDiagnosticOrderModal from '../components/CreateDiagnosticOrderModal';
import AppointmentModal from '@/features/appointments/components/AppointmentModal';
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

const EDUCATION_LABELS: Record<string, string> = {
  None: 'No formal education',
  Primary: 'Primary',
  Secondary: 'Secondary',
  Tertiary: 'Tertiary',
  University: 'University',
  Other: 'Other',
};

export default function Patient360Page() {
  const { id } = useParams<{ id: string }>();
  const { permissions, user } = useAuth();
  const navigate = useNavigate();
  const isClinical = hasPermission(permissions, PERMISSIONS.CLINICAL_VIEW);
  const canConsult = hasPermission(permissions, PERMISSIONS.CLINICAL_CONSULT);
  const canBook = hasPermission(permissions, PERMISSIONS.APPOINTMENT_CREATE);

  const [patient, setPatient] = useState<PatientDetail | null>(null);
  const [record, setRecord] = useState<PatientMedicalRecord | null>(null);
  const [visits, setVisits] = useState<EnrichedVisit[]>([]);
  const [loading, setLoading] = useState(true);
  const [quick, setQuick] = useState<'vitals' | 'flag' | 'imaging' | 'book' | null>(null);
  const [starting, setStarting] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [tab, setTab] = useState<'overview' | 'clinical' | 'diagnostics' | 'attachments' | 'history'>('overview');

  const fullName = patient
    ? [patient.firstName, patient.middleName, patient.lastName].filter(Boolean).join(' ')
    : '';

  useEffect(() => {
    if (!id) return;
    let mounted = true;
    setLoading(true);
    (async () => {
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
    })();
    return () => { mounted = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, isClinical, reloadKey]);

  // Reset section tabs when opening another patient's record.
  useEffect(() => {
    setTab('overview');
  }, [id]);

  /** Quick action: start a consultation and jump straight into the consult workspace. */
  const quickConsult = async () => {
    if (!patient || !user?.id) return;
    if (!canConsult) {
      toast.error('You do not have permission to start consultations.');
      return;
    }
    setStarting(true);
    try {
      const c = await ConsultationService.start(patient.id, user.id);
      toast.success(`Consultation started for ${fullName}`);
      navigate('/consultations', {
        state: { openConsultation: c, patientName: fullName, patientNumber: patient.patientNumber },
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to start consultation');
    } finally {
      setStarting(false);
    }
  };

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

      {/* ── Identity header ─────────────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-2xl bg-white border border-slate-200 shadow-sm">
        <div className="h-1.5 bg-gradient-to-r from-indigo-600 via-violet-500 to-indigo-400" />
        <div className="p-5 lg:p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-center gap-4 min-w-0">
              <div className="relative shrink-0">
                <span className="w-16 h-16 rounded-full bg-gradient-to-br from-indigo-600 to-violet-600 text-white flex items-center justify-center text-xl font-bold shadow-md">
                  {patient.firstName[0]}{patient.lastName[0]}
                </span>
                <span
                  className={`absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full border-2 border-white ${
                    patient.status === 'Active' ? 'bg-emerald-500' : 'bg-slate-300'
                  }`}
                  title={patient.status}
                />
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <h1 className="text-2xl font-bold text-slate-900 tracking-tight">{fullName}</h1>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                    patient.status === 'Active' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'
                  }`}>
                    {patient.status}
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1.5 text-sm text-slate-500">
                  <span className="font-mono text-xs px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 font-semibold">
                    {patient.patientNumber}
                  </span>
                  <span>{ageFromDateOfBirth(patient.dateOfBirth) ?? '—'} yrs · {patient.gender}</span>
                  <span>{patient.maritalStatus}</span>
                  {patient.nationalId && <span className="font-mono text-xs">ID: {patient.nationalId}</span>}
                </div>
                <p className="text-xs text-slate-400 mt-2 flex flex-wrap items-center gap-x-3">
                  {patient.createdByName && (
                    <span>Registered by <span className="font-medium text-slate-500">{patient.createdByName}</span></span>
                  )}
                  <span>· {formatDateTime(patient.createdAtUtc)}</span>
                  {patient.modifiedByName && (
                    <span>· Updated by <span className="font-medium text-slate-500">{patient.modifiedByName}</span> {formatDateTime(patient.modifiedAtUtc)}</span>
                  )}
                </p>
              </div>
            </div>

            {/* Quick actions — busy-clinician toolbar */}
            {isClinical && (
              <div className="flex flex-wrap gap-2 shrink-0">
                <button
                  className="btn-primary text-xs"
                  onClick={() => void quickConsult()}
                  disabled={starting || !canConsult}
                  title="Start a consultation and open the clinical workspace"
                >
                  {starting ? <Loader2 size={13} className="animate-spin" /> : <Stethoscope size={13} />}
                  Consult
                </button>
                {canConsult && (
                  <button
                    className="btn-ghost text-xs"
                    onClick={() => setQuick('vitals')}
                    title="Record triage vitals (temp, BP, pulse…)"
                  >
                    <Activity size={13} /> Triage
                  </button>
                )}
                {canConsult && (
                  <button
                    className="btn-ghost text-xs"
                    onClick={() => setQuick('imaging')}
                    title="Order imaging / procedure"
                  >
                    <ScanLine size={13} /> Imaging
                  </button>
                )}
                {canBook && (
                  <button className="btn-ghost text-xs" onClick={() => setQuick('book')} title="Book an appointment for this patient">
                    <CalendarPlus size={13} /> Book
                  </button>
                )}
                {canConsult && (
                  <button className="btn-ghost text-xs" onClick={() => setQuick('flag')} title="Raise a patient flag (allergy, warning…)">
                    <Flag size={13} /> Flag
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Contact + KenyaEMR demographic grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4 mt-6 pt-5 border-t border-slate-100 text-sm">
            <Info label="Phone" value={patient.phone} icon={<Phone size={12} />} />
            <Info label="Alt. phone" value={patient.alternativePhone} />
            <Info
              label="Address"
              value={[patient.county, patient.subCounty, patient.ward, patient.village, patient.landmark]
                .filter(Boolean).join(', ')}
              icon={<MapPin size={12} />}
            />
            <Info label="Education" value={patient.educationLevel ? (EDUCATION_LABELS[patient.educationLevel] ?? patient.educationLevel) : undefined} icon={<GraduationCap size={12} />} />
            <Info label="Occupation" value={patient.occupation ?? undefined} icon={<Briefcase size={12} />} />
            <Info
              label="Insurance"
              value={patient.insuranceNumber
                ? `${INSURANCE_LABELS[patient.insuranceType] ?? patient.insuranceType} · ${patient.insuranceNumber}`
                : INSURANCE_LABELS[patient.insuranceType] ?? patient.insuranceType}
            />
            <Info label="Clinic" value={CLINIC_LABELS[patient.clinicType] ?? patient.clinicType} />
            <Info label="Date of birth" value={formatDate(patient.dateOfBirth)} />
          </div>
        </div>
      </div>

      {isClinical ? (
        <div className="space-y-5">
          {/* Section tabs — keeps the record tidy, one focus at a time */}
          <div className="flex flex-wrap gap-1.5 border-b border-slate-200 pb-3">
            {[
              { id: 'overview', label: 'Overview', icon: <ShieldAlert size={14} /> },
              { id: 'clinical', label: 'Clinical summary', icon: <Activity size={14} /> },
              { id: 'diagnostics', label: 'Diagnostics', icon: <ScanLine size={14} /> },
              { id: 'attachments', label: 'Attachments', icon: <Paperclip size={14} /> },
              { id: 'history', label: 'Visits & history', icon: <History size={14} /> },
            ].map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id as typeof tab)}
                className={`inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full transition-colors ${
                  tab === t.id ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                }`}
              >
                {t.icon}
                {t.label}
              </button>
            ))}
          </div>

          {/* Flags banner stays visible across sections — safety-critical */}
          <div className="space-y-2">
            <PatientFlagsBanner patientId={patient.id} />
          </div>

          {tab === 'overview' && (
            <div className="grid lg:grid-cols-2 gap-6">
              <AllergiesConsentsPanel patient={patient} onPatientUpdated={setPatient} />
            </div>
          )}
          {tab === 'clinical' && <ClinicalSummaryPanel patientId={patient.id} />}
          {tab === 'diagnostics' && <DiagnosticOrdersPanel patientId={patient.id} />}
          {tab === 'attachments' && <AttachmentsPanel patientId={patient.id} />}
          {tab === 'history' && <MedicalRecordTimeline record={record} visits={visits} />}
        </div>
      ) : (
        <MinimalRecord patient={patient} />
      )}

      {/* Patient-scoped quick-action modals */}
      {quick === 'vitals' && (
        <RecordVitalsModal patientId={patient.id} onClose={() => setQuick(null)} onSaved={() => { setQuick(null); setReloadKey((k) => k + 1); }} />
      )}
      {quick === 'flag' && (
        <RaiseFlagModal patientId={patient.id} onClose={() => setQuick(null)} onSaved={() => { setQuick(null); setReloadKey((k) => k + 1); }} />
      )}
      {quick === 'imaging' && (
        <CreateDiagnosticOrderModal patientId={patient.id} onClose={() => setQuick(null)} onSaved={() => { setQuick(null); setReloadKey((k) => k + 1); }} />
      )}
      {quick === 'book' && (
        <AppointmentModal
          patient={{
            id: patient.id,
            patientNumber: patient.patientNumber,
            fullName,
            dateOfBirth: patient.dateOfBirth,
            phone: patient.phone,
            lastVisitDate: null,
          }}
          onClose={() => setQuick(null)}
          onCreated={() => setQuick(null)}
        />
      )}
    </div>
  );
}

function Info({ label, value, icon }: { label: string; value?: string | null; icon?: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <p className="text-[11px] text-slate-400 mb-1 flex items-center gap-1.5 uppercase tracking-wide">
        {icon}{label}
      </p>
      <p className="text-slate-700 font-medium truncate" title={value ?? ''}>{value ?? '—'}</p>
    </div>
  );
}

// ─── Non-clinical view: minimal ────────────────────────────────────────────────

function MinimalRecord({ patient: initial }: { patient: PatientDetail }) {
  const [patient, setPatient] = useState(initial);

  const fullName = [patient.firstName, patient.middleName, patient.lastName].filter(Boolean).join(' ');

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
            <p className="text-xs text-slate-400">Full name</p>
            <p className="text-slate-700 font-medium mt-0.5">{fullName}</p>
          </div>
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
        {/* Allergies + consents — read-only for non-clinical roles (no Clinical.Consult). */}
        <AllergiesConsentsPanel patient={patient} onPatientUpdated={setPatient} />

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
