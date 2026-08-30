// ============================================================
// RegisterPatientModal.tsx
// Location: src/features/patients/components/RegisterPatientModal.tsx
// ============================================================
// Phase 1: front-desk registration is intentionally light.
// - No marital status / next of kin (confidential — clinicians fill later).
// - Insurance section: SHA / Other insurer / Private (self-pay).
// - Clinic type: where the patient wants to be seen.

import { useState, type FormEvent } from 'react';
import toast from 'react-hot-toast';
import { Loader2 } from 'lucide-react';
import { PatientService } from '../services/patientService';
import type { RegisterPatientResponse, DuplicateCandidate } from '../types/patient';
import { formatDate } from '@/lib/format';

interface Props {
  onClose: () => void;
  onCreated: (p: { id: string }) => void;
}

const GENDERS = ['Female', 'Male', 'Other'];

const INSURANCE_TYPES = [
  { value: 'Sha', label: 'SHA insurance' },
  { value: 'Other', label: 'Other insurance' },
  { value: 'Private', label: 'Private (self-pay)' },
];

// Clinic types align with the backend ClinicType enum. Kenyan facility
// terminology (KEPH-aligned) so medics and nurses recognise them at a glance.
const CLINIC_TYPES = [
  { value: 'GeneralOutpatient', label: 'General outpatient' },
  { value: 'Counselling', label: 'Counselling' },
  { value: 'Laboratory', label: 'Laboratory' },
  { value: 'Immunization', label: 'Immunization' },
  { value: 'Wellness', label: 'Wellness' },
  { value: 'ReproductiveHealth', label: 'Reproductive health (RH)' },
  { value: 'ChildWelfare', label: 'Child welfare' },
  { value: 'MaternalChildHealth', label: 'Maternal & child health (MCH)' },
  { value: 'Antenatal', label: 'Antenatal (ANC)' },
  { value: 'Postnatal', label: 'Postnatal (PNC)' },
  { value: 'FamilyPlanning', label: 'Family planning' },
  { value: 'ComprehensiveCareCentre', label: 'Comprehensive care (CCC)' },
  { value: 'Tuberculosis', label: 'TB clinic' },
  { value: 'Nutrition', label: 'Nutrition' },
  { value: 'Dental', label: 'Dental' },
  { value: 'Eye', label: 'Eye clinic' },
  { value: 'Ent', label: 'ENT' },
  { value: 'Physiotherapy', label: 'Physiotherapy / rehab' },
  { value: 'AdolescentYouthFriendly', label: 'Adolescent & youth friendly' },
];

const insuranceNumberLabel = (type: string) =>
  type === 'Sha' ? 'SHA number' : type === 'Other' ? 'Insurance number' : '';

export default function RegisterPatientModal({ onClose, onCreated }: Props) {
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    dateOfBirth: '',
    gender: 'Female',
    phone: '',
    nationalId: '',
    insuranceType: 'Sha',
    insuranceNumber: '',
    clinicType: 'GeneralOutpatient',
    county: 'Nairobi',
    subCounty: '',
    ward: '',
    line1: '',
  });
  const [saving, setSaving] = useState(false);
  const [duplicates, setDuplicates] = useState<DuplicateCandidate[]>([]);

  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!form.firstName.trim() || !form.lastName.trim() || !form.dateOfBirth || !form.phone.trim()) {
      toast.error('First name, last name, date of birth and phone are required.');
      return;
    }
    if (form.insuranceType !== 'Private' && !form.insuranceNumber.trim()) {
      toast.error('Insurance number is required for insured patients.');
      return;
    }
    setSaving(true);
    try {
      const res: RegisterPatientResponse = await PatientService.register({
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        dateOfBirth: form.dateOfBirth, // yyyy-MM-dd — matches the backend DateOnly binding
        gender: form.gender,
        phone: form.phone.trim(),
        nationalId: form.nationalId.trim() || null,
        insuranceType: form.insuranceType,
        insuranceNumber: form.insuranceNumber.trim() || null,
        clinicType: form.clinicType,
        county: form.county.trim(),
        subCounty: form.subCounty.trim() || null,
        ward: form.ward.trim() || null,
        line1: form.line1.trim() || null,
      });
      setDuplicates(res.duplicateCandidates ?? []);
      if (res.duplicateCandidates && res.duplicateCandidates.length > 0) {
        toast.error('Possible duplicates found — review before continuing.');
        return;
      }
      toast.success(`Registered ${res.patientNumber}`);
      onCreated(res);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Registration failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="card w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 sticky top-0 bg-white rounded-t-xl">
          <h2 className="text-sm font-semibold text-slate-900">Register patient</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-sm">✕</button>
        </div>

        {duplicates.length > 0 && (
          <div className="mx-5 mt-4 p-4 rounded-lg border border-amber-200 bg-amber-50">
            <p className="text-sm font-semibold text-amber-700 mb-2">Possible duplicate records:</p>
            <ul className="space-y-1 text-xs text-slate-600">
              {duplicates.map((d) => (
                <li key={d.id}>
                  {d.fullName} · {d.patientNumber} · {formatDate(d.dateOfBirth)}
                </li>
              ))}
            </ul>
            <p className="text-xs text-slate-500 mt-2">The record was created, but verify against the candidates above.</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="First name *"><input className="input" value={form.firstName} onChange={set('firstName')} /></Field>
            <Field label="Last name *"><input className="input" value={form.lastName} onChange={set('lastName')} /></Field>
            <Field label="Date of birth *">
              <input type="date" className="input" value={form.dateOfBirth} onChange={set('dateOfBirth')} />
            </Field>
            <Field label="Gender">
              <select className="input" value={form.gender} onChange={set('gender')}>
                {GENDERS.map((g) => <option key={g}>{g}</option>)}
              </select>
            </Field>
            <Field label="Phone *"><input className="input" placeholder="+2547…" value={form.phone} onChange={set('phone')} /></Field>
            <Field label="National ID"><input className="input" value={form.nationalId} onChange={set('nationalId')} /></Field>
            <Field label="Clinic *">
              <select className="input" value={form.clinicType} onChange={set('clinicType')}>
                {CLINIC_TYPES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </Field>
            <Field label="County"><input className="input" value={form.county} onChange={set('county')} /></Field>
            <Field label="Sub-county"><input className="input" value={form.subCounty} onChange={set('subCounty')} /></Field>
            <Field label="Ward / location"><input className="input" value={form.ward} onChange={set('ward')} /></Field>
            <Field label="Street / line 1"><input className="input" value={form.line1} onChange={set('line1')} /></Field>
          </div>

          <div className="pt-3 border-t border-slate-200">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Insurance</p>
            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="Payment type *">
                <select className="input" value={form.insuranceType} onChange={set('insuranceType')}>
                  {INSURANCE_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </Field>
              {form.insuranceType !== 'Private' && (
                <Field label={`${insuranceNumberLabel(form.insuranceType)} *`}>
                  <input className="input" value={form.insuranceNumber} onChange={set('insuranceNumber')} />
                </Field>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" className="btn-ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving && <Loader2 size={15} className="animate-spin" />}
              Register
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-xs font-medium text-slate-500 mb-1.5">{label}</span>
      {children}
    </label>
  );
}
