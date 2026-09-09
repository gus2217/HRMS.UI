// ============================================================
// RegisterPatientModal.tsx
// Location: src/features/patients/components/RegisterPatientModal.tsx
//
// Front-desk registration with duplicate prevention:
//   • Live pre-check — as soon as a phone or National ID is entered,
//     the system queries existing patients (exact phone / ID match)
//     and warns the receptionist BEFORE the form is submitted.
//   • On submit, the backend re-checks and returns 409 with candidates
//     when a duplicate is found; the modal blocks and lets the desk
//     open the existing record or override deliberately.
// ============================================================

import { useEffect, useRef, useState, type FormEvent } from 'react';
import toast from 'react-hot-toast';
import { Loader2, AlertTriangle, ExternalLink, ShieldCheck, Search } from 'lucide-react';
import { PatientService } from '../services/patientService';
import type { RegisterPatientResponse, DuplicateCandidate, RegistryClientDto } from '../types/patient';
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
    middleName: '',
    lastName: '',
    dateOfBirth: '',
    gender: 'Female',
    phone: '',
    alternativePhone: '',
    nationalId: '',
    insuranceType: 'Sha',
    insuranceNumber: '',
    clinicType: 'GeneralOutpatient',
    county: 'Nairobi',
    subCounty: '',
    ward: '',
    line1: '',
    village: '',
    landmark: '',
    educationLevel: '',
    occupation: '',
  });
  const [saving, setSaving] = useState(false);
  const [duplicates, setDuplicates] = useState<DuplicateCandidate[]>([]);
  const [precheck, setPrecheck] = useState<DuplicateCandidate[]>([]);
  const [prechecking, setPrechecking] = useState(false);
  const [override, setOverride] = useState(false);
  const [registryLooking, setRegistryLooking] = useState(false);
  const [registryClient, setRegistryClient] = useState<RegistryClientDto | null>(null);
  const [registryMessage, setRegistryMessage] = useState<string | null>(null);
  const precheckTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm((f) => ({ ...f, [key]: e.target.value }));
    if (key === 'phone' || key === 'nationalId') schedulePrecheck();
  };

  /** Debounced live duplicate check on phone / National ID entry. */
  const schedulePrecheck = () => {
    if (precheckTimer.current) clearTimeout(precheckTimer.current);
    precheckTimer.current = setTimeout(() => void runPrecheck(), 600);
  };

  const runPrecheck = async () => {
    const phone = form.phone.trim();
    const nationalId = form.nationalId.trim();
    if (!phone && !nationalId) {
      setPrecheck([]);
      return;
    }
    setPrechecking(true);
    try {
      const matches = await PatientService.checkDuplicates(phone || undefined, nationalId || undefined);
      setPrecheck(matches);
      if (matches.length > 0) setOverride(false); // new duplicate → require fresh decision
    } catch {
      setPrecheck([]);
    } finally {
      setPrechecking(false);
    }
  };

  /** Look the National ID up in the national client registry (NUPI). */
  const lookupRegistry = async () => {
    const nationalId = form.nationalId.trim();
    if (!/^\d{6,9}$/.test(nationalId)) {
      toast.error('Enter a valid 6–9 digit National ID first.');
      return;
    }
    setRegistryLooking(true);
    setRegistryClient(null);
    setRegistryMessage(null);
    try {
      const res = await PatientService.registryLookup(nationalId);
      if (res.found && res.client) {
        setRegistryClient(res.client);
        const c = res.client;
        setForm((f) => ({
          ...f,
          firstName: c.firstName ?? f.firstName,
          middleName: c.middleName ?? f.middleName,
          lastName: c.lastName ?? f.lastName,
          gender: c.gender === 'Male' || c.gender === 'Female' ? c.gender : f.gender,
          dateOfBirth: c.dateOfBirth ?? f.dateOfBirth,
          phone: c.phone ?? f.phone,
          county: c.county ?? f.county,
          subCounty: c.subCounty ?? f.subCounty,
          ward: c.ward ?? f.ward,
          village: c.village ?? f.village,
        }));
        toast.success('Found on the national registry — details prefilled');
      } else {
        setRegistryMessage(res.message ?? 'Not found on the national registry — register as a new local record.');
        toast(res.message ?? 'Not found on the national registry.', { icon: '🔍' });
      }
    } catch (err) {
      setRegistryMessage(err instanceof Error ? err.message : 'Registry lookup failed — register locally.');
    } finally {
      setRegistryLooking(false);
    }
  };

  const clearRegistry = () => {
    setRegistryClient(null);
    setRegistryMessage(null);
  };

  useEffect(() => {
    return () => {
      if (precheckTimer.current) clearTimeout(precheckTimer.current);
    };
  }, []);

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
        middleName: form.middleName.trim() || null,
        dateOfBirth: form.dateOfBirth, // yyyy-MM-dd — matches the backend DateOnly binding
        gender: form.gender,
        phone: form.phone.trim(),
        alternativePhone: form.alternativePhone.trim() || null,
        nationalId: form.nationalId.trim() || null,
        insuranceType: form.insuranceType,
        insuranceNumber: form.insuranceNumber.trim() || null,
        clinicType: form.clinicType,
        county: form.county.trim(),
        subCounty: form.subCounty.trim() || null,
        ward: form.ward.trim() || null,
        line1: form.line1.trim() || null,
        village: form.village.trim() || null,
        landmark: form.landmark.trim() || null,
        educationLevel: form.educationLevel || null,
        occupation: form.occupation.trim() || null,
        nationalRegistryNumber: registryClient?.clientNumber ?? null,
      });
      setDuplicates(res.duplicateCandidates ?? []);
      if (res.duplicateCandidates && res.duplicateCandidates.length > 0) {
        toast.error('Possible duplicate found — the record was NOT created. Review before continuing.');
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

  const openExisting = (id: string) => {
    window.location.href = `/patients/${id}`;
  };

  const showBlock = duplicates.length > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="card w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 sticky top-0 bg-white rounded-t-xl">
          <h2 className="text-sm font-semibold text-slate-900">Register patient</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-sm">✕</button>
        </div>

        {/* Live pre-check warning (before submit) */}
        {!showBlock && precheck.length > 0 && (
          <div className="mx-5 mt-4 p-3.5 rounded-lg border border-amber-200 bg-amber-50">
            <p className="text-xs font-semibold text-amber-800 flex items-center gap-1.5 mb-1.5">
              <AlertTriangle size={13} /> Phone / ID matches an existing patient
            </p>
            <ul className="space-y-1 text-xs text-slate-600">
              {precheck.map((d) => (
                <li key={d.id} className="flex items-center justify-between gap-2">
                  <span>
                    {d.fullName} · {d.patientNumber}
                    {d.phone ? ` · ${d.phone}` : ''}
                  </span>
                  <button className="text-indigo-600 hover:text-indigo-700 font-medium shrink-0 inline-flex items-center gap-1" onClick={() => openExisting(d.id)}>
                    View record <ExternalLink size={11} />
                  </button>
                </li>
              ))}
            </ul>
            <p className="text-[11px] text-amber-700 mt-1.5">
              Check the existing record first — registering a duplicate is blocked on submit unless you confirm override.
            </p>
          </div>
        )}

        {/* National-registry lookup result */}
        {registryClient && (
          <div className="mx-5 mt-4 p-3.5 rounded-lg border border-emerald-200 bg-emerald-50">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-xs font-semibold text-emerald-800 flex items-center gap-1.5 mb-1">
                  <ShieldCheck size={13} /> Found on the national registry
                </p>
                <p className="text-xs text-slate-600">
                  {[registryClient.firstName, registryClient.middleName, registryClient.lastName].filter(Boolean).join(' ')}
                  {registryClient.dateOfBirth ? ` · ${formatDate(registryClient.dateOfBirth)}` : ''}
                  {registryClient.gender ? ` · ${registryClient.gender}` : ''}
                </p>
                <p className="text-[11px] text-slate-400 mt-1 font-mono">NUPI: {registryClient.clientNumber}</p>
              </div>
              <button onClick={clearRegistry} className="text-[11px] text-slate-400 hover:text-slate-600 shrink-0">
                Clear
              </button>
            </div>
            <p className="text-[11px] text-emerald-700 mt-2">
              Details were prefilled from the national registry. Review, complete the remaining fields, then register.
            </p>
          </div>
        )}
        {registryMessage && !registryClient && (
          <div className="mx-5 mt-4 p-3.5 rounded-lg border border-sky-200 bg-sky-50">
            <p className="text-xs text-sky-800">{registryMessage}</p>
            <p className="text-[11px] text-sky-600 mt-1">You can still register the patient as a new local record.</p>
          </div>
        )}

        {/* Backend-confirmed duplicate block (after submit) */}
        {showBlock && (
          <div className="mx-5 mt-4 p-4 rounded-lg border border-red-200 bg-red-50">
            <p className="text-sm font-semibold text-red-700 mb-2 flex items-center gap-1.5">
              <AlertTriangle size={15} /> Duplicate record detected — registration blocked
            </p>
            <ul className="space-y-1.5 text-xs text-slate-700">
              {duplicates.map((d) => (
                <li key={d.id} className="flex items-center justify-between gap-2">
                  <span>
                    {d.fullName} · {d.patientNumber} · {formatDate(d.dateOfBirth)}
                    {d.phone ? ` · ${d.phone}` : ''}
                  </span>
                  <button className="text-indigo-600 hover:text-indigo-700 font-medium shrink-0 inline-flex items-center gap-1" onClick={() => openExisting(d.id)}>
                    Open existing <ExternalLink size={11} />
                  </button>
                </li>
              ))}
            </ul>
            <label className="flex items-start gap-2 mt-3 text-[11px] text-slate-600 cursor-pointer">
              <input type="checkbox" checked={override} onChange={(e) => setOverride(e.target.checked)} className="mt-0.5 accent-red-600" />
              I have verified the record above — this is a genuinely different patient. Register anyway.
            </label>
            <button
              className="btn-primary w-full mt-2.5 text-xs py-2"
              disabled={!override}
              onClick={() => {
                setDuplicates([]);
                setOverride(false);
                void handleSubmit({ preventDefault: () => {} } as FormEvent);
              }}
            >
              {saving && <Loader2 size={13} className="animate-spin" />}
              Register anyway
            </button>
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="First name *"><input className="input" value={form.firstName} onChange={set('firstName')} /></Field>
            <Field label="Middle name"><input className="input" value={form.middleName} onChange={set('middleName')} /></Field>
            <Field label="Last name *"><input className="input" value={form.lastName} onChange={set('lastName')} /></Field>
            <Field label="Date of birth *">
              <input type="date" className="input" value={form.dateOfBirth} onChange={set('dateOfBirth')} />
            </Field>
            <Field label="Gender">
              <select className="input" value={form.gender} onChange={set('gender')}>
                {GENDERS.map((g) => <option key={g}>{g}</option>)}
              </select>
            </Field>
            <Field label="Phone *">
              <div className="relative">
                <input className="input" placeholder="+2547…" value={form.phone} onChange={set('phone')} />
                {prechecking && <Loader2 size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 animate-spin" />}
              </div>
            </Field>
            <Field label="Alternative phone"><input className="input" placeholder="+2547… (optional)" value={form.alternativePhone} onChange={set('alternativePhone')} /></Field>
            <Field label="National ID">
              <div className="relative">
                <input className="input pr-20" value={form.nationalId} onChange={set('nationalId')} placeholder="6–9 digits" />
                <button
                  type="button"
                  onClick={() => void lookupRegistry()}
                  disabled={registryLooking || saving}
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-semibold text-indigo-600 hover:bg-indigo-50 disabled:opacity-50 transition-colors"
                  title="Look up in the national registry"
                >
                  {registryLooking ? <Loader2 size={12} className="animate-spin" /> : <Search size={12} />}
                  Look up
                </button>
              </div>
            </Field>
            <Field label="Education level">
              <select className="input" value={form.educationLevel} onChange={set('educationLevel')}>
                <option value="">Not specified</option>
                <option value="None">None</option>
                <option value="Primary">Primary</option>
                <option value="Secondary">Secondary</option>
                <option value="Tertiary">Tertiary</option>
                <option value="University">University</option>
                <option value="Other">Other</option>
              </select>
            </Field>
            <Field label="Occupation"><input className="input" value={form.occupation} onChange={set('occupation')} /></Field>
            <Field label="Clinic *">
              <select className="input" value={form.clinicType} onChange={set('clinicType')}>
                {CLINIC_TYPES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </Field>
            <Field label="County"><input className="input" value={form.county} onChange={set('county')} /></Field>
            <Field label="Sub-county"><input className="input" value={form.subCounty} onChange={set('subCounty')} /></Field>
            <Field label="Ward / location"><input className="input" value={form.ward} onChange={set('ward')} /></Field>
            <Field label="Street / line 1"><input className="input" value={form.line1} onChange={set('line1')} /></Field>
            <Field label="Village / estate"><input className="input" value={form.village} onChange={set('village')} /></Field>
            <Field label="Landmark"><input className="input" placeholder="e.g. near the market" value={form.landmark} onChange={set('landmark')} /></Field>
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
