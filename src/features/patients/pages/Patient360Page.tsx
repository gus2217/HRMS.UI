import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { ArrowLeft, Loader2, Phone, MapPin, ShieldAlert, FileText, Stethoscope } from 'lucide-react';
import { PatientService } from '../services/patientService';
import { ConsultationService } from '@/features/consultations/services/consultationService';
import type { PatientDetail, PatientClinicalHistory } from '@/features/consultations/types/consultation';
import { formatDate, formatDateTime, ageFromDateOfBirth } from '@/lib/format';

export default function Patient360Page() {
  const { id } = useParams<{ id: string }>();
  const [patient, setPatient] = useState<PatientDetail | null>(null);
  const [history, setHistory] = useState<PatientClinicalHistory | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    let mounted = true;
    const load = async () => {
      try {
        const [p, h] = await Promise.all([
          PatientService.detail(id),
          ConsultationService.history(id).catch(() => null),
        ]);
        if (!mounted) return;
        setPatient(p);
        setHistory(h);
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
  }, [id]);

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

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-5 pt-5 border-t border-slate-200 text-sm">
          <div>
            <p className="text-xs text-slate-400 mb-1 flex items-center gap-1.5"><Phone size={12} /> Phone</p>
            <p className="text-slate-700">{patient.phone ?? '—'}</p>
          </div>
          <div>
            <p className="text-xs text-slate-400 mb-1 flex items-center gap-1.5"><MapPin size={12} /> Address</p>
            <p className="text-slate-700">{patient.county}{patient.subCounty ? `, ${patient.subCounty}` : ''}{patient.ward ? `, ${patient.ward}` : ''}</p>
          </div>
          <div>
            <p className="text-xs text-slate-400 mb-1">National ID</p>
            <p className="text-slate-700">{patient.shaNumber ? `SHA ${patient.shaNumber}` : '—'}</p>
          </div>
          <div>
            <p className="text-xs text-slate-400 mb-1">Date of birth</p>
            <p className="text-slate-700">{formatDate(patient.dateOfBirth)}</p>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Clinical history */}
        <div className="card p-5 lg:col-span-2 space-y-4">
          <h2 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
            <Stethoscope size={15} className="text-indigo-600" /> Clinical history
          </h2>

          {(history?.diagnoses.length ?? 0) > 0 && (
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Diagnoses</p>
              <div className="space-y-2">
                {history!.diagnoses.map((d, i) => (
                  <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-slate-50 border border-slate-200">
                    <span className="font-mono text-xs px-2 py-0.5 rounded bg-indigo-100 text-indigo-700 shrink-0">{d.icdCode}</span>
                    <div>
                      <p className="text-sm text-slate-700">{d.description}</p>
                      <p className="text-xs text-slate-400">{d.isPrimary ? 'Primary' : 'Secondary'}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {(history?.consultations.length ?? 0) > 0 ? (
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Consultations</p>
              <div className="space-y-2">
                {history!.consultations.map((c) => (
                  <div key={c.id} className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-slate-900">Consultation</p>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-slate-200 text-slate-600">{c.status}</span>
                    </div>
                    <p className="text-xs text-slate-400 mt-1">Started {formatDateTime(c.startedAtUtc)}</p>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-sm text-slate-400 py-4 text-center">No consultations on record.</p>
          )}
        </div>

        {/* Allergies / consents / NOK */}
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
              <h2 className="text-sm font-semibold text-slate-900 mb-3">Next of kin</h2>
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
    </div>
  );
}
