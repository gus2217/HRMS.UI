import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Search, UserPlus, Loader2, Users } from 'lucide-react';
import { PatientService } from '../services/patientService';
import type { PatientSummary } from '../types/patient';
import { formatDate, ageFromDateOfBirth } from '@/lib/format';
import RegisterPatientModal from '../components/RegisterPatientModal';
import { useAuth } from '@/features/auth/components/AuthContext';
import { hasPermission, PERMISSIONS } from '@/lib/permissions';

export default function PatientsPage() {
  const navigate = useNavigate();
  const { permissions } = useAuth();
  const [items, setItems] = useState<PatientSummary[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [showRegister, setShowRegister] = useState(false);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = async (term: string, pageNumber: number) => {
    setLoading(true);
    try {
      const res = await PatientService.search(term || undefined, pageNumber, 25);
      setItems(res.items);
      setTotal(res.totalCount);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to load patients');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load(search, page);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  const handleSearch = (value: string) => {
    setSearch(value);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      setPage(1);
      void load(value, 1);
    }, 350);
  };

  return (
    <div className="p-5 lg:p-8 space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Patients</h1>
          <p className="text-sm text-slate-500 mt-0.5">{total.toLocaleString()} records</p>
        </div>
        {hasPermission(permissions, PERMISSIONS.PATIENT_REGISTER) && (
          <button className="btn-primary" onClick={() => setShowRegister(true)}>
            <UserPlus size={16} />
            Register patient
          </button>
        )}
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          className="input pl-10"
          placeholder="Search by name, number, phone or ID…"
          value={search}
          onChange={(e) => handleSearch(e.target.value)}
        />
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center gap-3 py-16">
            <Loader2 size={20} className="animate-spin text-indigo-600" />
            <p className="text-sm text-slate-400">Loading patients…</p>
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <Users size={28} className="text-slate-300" />
            <p className="text-sm text-slate-400">No patients found.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="table-base">
              <thead>
                <tr>
                  <th>Patient no.</th>
                  <th>Name</th>
                  <th>Age</th>
                  <th>Date of birth</th>
                  <th>Phone</th>
                  <th>Last visit</th>
                </tr>
              </thead>
              <tbody>
                {items.map((p) => (
                  <tr key={p.id} className="cursor-pointer" onClick={() => navigate(`/patients/${p.id}`)}>
                    <td className="font-mono text-xs text-indigo-600">{p.patientNumber}</td>
                    <td className="font-medium text-slate-900">{p.fullName}</td>
                    <td>{ageFromDateOfBirth(p.dateOfBirth) ?? '—'}</td>
                    <td>{formatDate(p.dateOfBirth)}</td>
                    <td>{p.phone ?? '—'}</td>
                    <td>{formatDate(p.lastVisitDate)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {total > 25 && (
        <div className="flex items-center justify-between text-sm">
          <p className="text-slate-500">
            Page {page} of {Math.max(1, Math.ceil(total / 25))}
          </p>
          <div className="flex gap-2">
            <button className="btn-ghost" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
              Previous
            </button>
            <button className="btn-ghost" disabled={page >= Math.ceil(total / 25)} onClick={() => setPage((p) => p + 1)}>
              Next
            </button>
          </div>
        </div>
      )}

      {showRegister && (
        <RegisterPatientModal
          onClose={() => setShowRegister(false)}
          onCreated={(p) => {
            setShowRegister(false);
            navigate(`/patients/${p.id}`);
          }}
        />
      )}
    </div>
  );
}
