// ============================================================
// AllergiesConsentsPanel.tsx
// Location: src/features/patients/components/AllergiesConsentsPanel.tsx
//
// Allergies + consents management for a patient's details page.
// These are clinical record entries: only roles holding
// Clinical.Consult (Doctor / Nurse / Administrator) may add or
// remove them. Everyone else (Receptionist, RecordsOfficer, …)
// sees read-only lists — matching the backend endpoint grants
// (PatientEndpoints.cs requires Clinical.Consult for mutations).
// ============================================================

import { useState } from 'react';
import toast from 'react-hot-toast';
import { ShieldAlert, FileText, Loader2 } from 'lucide-react';
import { PatientService } from '../services/patientService';
import { CONSENT_TYPE_LABELS, consentTypeLabel, type PatientDetail } from '../types/patient';
import { formatDateTime } from '@/lib/format';
import { useAuth } from '@/features/auth/components/AuthContext';
import { hasPermission, PERMISSIONS } from '@/lib/permissions';

interface AllergiesConsentsPanelProps {
  patient: PatientDetail;
  onPatientUpdated: (next: PatientDetail) => void;
}

export default function AllergiesConsentsPanel({ patient, onPatientUpdated }: AllergiesConsentsPanelProps) {
  const { permissions } = useAuth();
  const canManage = hasPermission(permissions, PERMISSIONS.CLINICAL_CONSULT);

  const [showAllergyForm, setShowAllergyForm] = useState(false);
  const [allergyForm, setAllergyForm] = useState({ substance: '', severity: 'Mild', notes: '' });
  const [allergySaving, setAllergySaving] = useState(false);
  const [showConsentForm, setShowConsentForm] = useState(false);
  const [consentForm, setConsentForm] = useState({ type: 'TreatmentConsent', granted: true });
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
      onPatientUpdated(updated);
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
      onPatientUpdated(updated);
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
      onPatientUpdated(updated);
      setShowConsentForm(false);
      toast.success('Consent recorded');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to record consent');
    } finally {
      setConsentSaving(false);
    }
  };

  return (
    <>
      {/* ── Allergies ─────────────────────────────────────────────────── */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
            <ShieldAlert size={15} className="text-indigo-600" /> Allergies
          </h2>
          {canManage && (
            <button
              type="button"
              className="btn-ghost text-xs !py-1 !px-2.5"
              onClick={() => setShowAllergyForm((s) => !s)}
            >
              {showAllergyForm ? 'Cancel' : '+ Add allergy'}
            </button>
          )}
        </div>

        {showAllergyForm && canManage && (
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
                {canManage && a.id && (
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

      {/* ── Consents ─────────────────────────────────────────────────── */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
            <FileText size={15} className="text-indigo-600" /> Consents
          </h2>
          {canManage && (
            <button
              type="button"
              className="btn-ghost text-xs !py-1 !px-2.5"
              onClick={() => setShowConsentForm((s) => !s)}
            >
              {showConsentForm ? 'Cancel' : '+ Record consent'}
            </button>
          )}
        </div>

        {showConsentForm && canManage && (
          <div className="mb-3 p-3 rounded-lg bg-slate-50 border border-slate-200 space-y-2">
            <div className="grid sm:grid-cols-3 gap-2">
              <select
                className="input text-sm"
                value={consentForm.type}
                onChange={(e) => setConsentForm((f) => ({ ...f, type: e.target.value }))}
              >
                {Object.entries(CONSENT_TYPE_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
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
              <li key={i} className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-slate-700">{consentTypeLabel(c.type)}</p>
                  {c.recordedByName && (
                    <p className="text-[11px] text-slate-400">by {c.recordedByName} · {formatDateTime(c.recordedAtUtc)}</p>
                  )}
                </div>
                <span className={`text-xs font-medium ${c.granted ? 'text-emerald-600' : 'text-red-500'}`}>
                  {c.granted ? 'Granted' : 'Withheld'}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}
