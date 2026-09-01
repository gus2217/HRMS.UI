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
//
// The per-visit timeline itself lives in the shared
// MedicalRecordTimeline component so the consultation Record tab
// renders the exact same full record.
// ============================================================

import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  ArrowLeft, Loader2, Phone, MapPin, ShieldAlert, FileText, Stethoscope,
  Users,
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
import ClinicalSummaryPanel from '../components/ClinicalSummaryPanel';
import PatientFlagsBanner from '../components/PatientFlagsBanner';
import AttachmentsPanel from '../components/AttachmentsPanel';
import DiagnosticOrdersPanel from '../components/DiagnosticOrdersPanel';
import { formatDate, ageFromDateOfBirth } from '@/lib/format';
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
        <>
          <PatientFlagsBanner patientId={patient.id} />
          <ClinicalSummaryPanel patientId={patient.id} />
          <DiagnosticOrdersPanel patientId={patient.id} />
          <AttachmentsPanel patientId={patient.id} />
          <MedicalRecordTimeline record={record} visits={visits} />
        </>
      ) : (
        <MinimalRecord patient={patient} />
      )}
    </div>
  );
}

// ─── Non-clinical view: minimal ────────────────────────────────────────────────

function MinimalRecord({ patient: initial }: { patient: PatientDetail }) {
  const { permissions } = useAuth();
  const canEdit = hasPermission(permissions, PERMISSIONS.PATIENT_UPDATE);
  const [patient, setPatient] = useState(initial);
  const [showAllergyForm, setShowAllergyForm] = useState(false);
  const [allergyForm, setAllergyForm] = useState({ substance: '', severity: 'Mild', notes: '' });
  const [allergySaving, setAllergySaving] = useState(false);
  const [showConsentForm, setShowConsentForm] = useState(false);
  const [consentForm, setConsentForm] = useState({ type: 'Treatment', granted: true });
  const [consentSaving, setConsentSaving] = useState(false);

  const saveAllergy = async () => {
    if (!patient.id || !allergyForm.substance.trim()) return;
    setAllergySaving(true);
    try {
      const updated = await PatientService.addAllergy(patient.id, {
        substance: allergyForm.substance.trim(),
        severity: allergyForm.severity,
        notes: allergyForm.notes.trim() || null,
      });
      setPatient(updated);
      setAllergyForm({ substance: '', severity: 'Mild', notes: '' });
      setShowAllergyForm(false);
      toast.success('Allergy recorded');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to record allergy');
    } finally {
      setAllergySaving(false);
    }
  };

  const removeAllergy = async (allergyId: string) => {
    if (!patient.id) return;
    try {
      const updated = await PatientService.removeAllergy(patient.id, allergyId);
      setPatient(updated);
      toast.success('Allergy removed');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to remove allergy');
    }
  };

  const saveConsent = async () => {
    if (!patient.id) return;
    setConsentSaving(true);
    try {
      const updated = await PatientService.recordConsent(patient.id, consentForm);
      setPatient(updated);
      setShowConsentForm(false);
      toast.success('Consent recorded');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to record consent');
    } finally {
      setConsentSaving(false);
    }
  };

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
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
              <ShieldAlert size={15} className="text-indigo-600" /> Allergies
            </h2>
            {canEdit && (
              <button
                type="button"
                className="btn-ghost text-xs !py-1 !px-2.5"
                onClick={() => setShowAllergyForm((s) => !s)}
              >
                {showAllergyForm ? 'Cancel' : '+ Add allergy'}
              </button>
            )}
          </div>

          {showAllergyForm && canEdit && (
            <div className="mb-3 p-3 rounded-lg bg-slate-50 border border-slate-200 space-y-2">
              <div className="grid sm:grid-cols-3 gap-2">
                <input
                  className="input text-sm"
                  placeholder="Substance (e.g. Penicillin)"
                  value={allergyForm.substance}
                  onChange={(e) => setAllergyForm((f) => ({ ...f, substance: e.target.value }))}
                />
                <select
                  className="input text-sm"
                  value={allergyForm.severity}
                  onChange={(e) => setAllergyForm((f) => ({ ...f, severity: e.target.value }))}
                >
                  <option value="Mild">Mild</option>
                  <option value="Moderate">Moderate</option>
                  <option value="Severe">Severe</option>
                </select>
                <input
                  className="input text-sm"
                  placeholder="Notes (optional)"
                  value={allergyForm.notes ?? ''}
                  onChange={(e) => setAllergyForm((f) => ({ ...f, notes: e.target.value }))}
                />
              </div>
              <div className="flex justify-end">
                <button
                  className="btn-primary !py-1 text-xs"
                  disabled={allergySaving || !allergyForm.substance.trim()}
                  onClick={() => void saveAllergy()}
                >
                  {allergySaving && <Loader2 size={12} className="animate-spin" />}
                  Save allergy
                </button>
              </div>
            </div>
          )}

          {patient.allergies.length === 0 ? (
            <p className="text-sm text-slate-400">No known allergies.</p>
          ) : (
            <ul className="space-y-2">
              {patient.allergies.map((a, i) => (
                <li key={i} className="text-sm flex items-center justify-between gap-2">
                  <span className="min-w-0">
                    <span className="font-medium text-slate-900">{a.substance}</span>
                    <span className={`ml-2 text-xs px-2 py-0.5 rounded-full ${
                      a.severity === 'Severe' ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-500'
                    }`}>{a.severity}</span>
                  </span>
                  {canEdit && a.id && (
                    <button
                      type="button"
                      className="text-xs text-slate-400 hover:text-red-600 transition-colors"
                      onClick={() => void removeAllergy(a.id)}
                    >
                      Remove
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="card p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
              <FileText size={15} className="text-indigo-600" /> Consents
            </h2>
            {canEdit && (
              <button
                type="button"
                className="btn-ghost text-xs !py-1 !px-2.5"
                onClick={() => setShowConsentForm((s) => !s)}
              >
                {showConsentForm ? 'Cancel' : '+ Record consent'}
              </button>
            )}
          </div>

          {showConsentForm && canEdit && (
            <div className="mb-3 p-3 rounded-lg bg-slate-50 border border-slate-200 space-y-2">
              <div className="grid sm:grid-cols-3 gap-2">
                <select
                  className="input text-sm"
                  value={consentForm.type}
                  onChange={(e) => setConsentForm((f) => ({ ...f, type: e.target.value }))}
                >
                  <option value="Treatment">Treatment</option>
                  <option value="Procedure">Procedure</option>
                  <option value="DataSharing">Data sharing</option>
                  <option value="Research">Research</option>
                </select>
                <select
                  className="input text-sm"
                  value={consentForm.granted ? 'granted' : 'withheld'}
                  onChange={(e) => setConsentForm((f) => ({ ...f, granted: e.target.value === 'granted' }))}
                >
                  <option value="granted">Granted</option>
                  <option value="withheld">Withheld</option>
                </select>
                <button
                  className="btn-primary !py-1 text-xs"
                  disabled={consentSaving}
                  onClick={() => void saveConsent()}
                >
                  {consentSaving && <Loader2 size={12} className="animate-spin" />}
                  Save consent
                </button>
              </div>
            </div>
          )}

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
