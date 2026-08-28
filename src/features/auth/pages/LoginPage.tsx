// ============================================================
// LoginPage.tsx
// Location: src/features/auth/pages/LoginPage.tsx
//
// Redirects already-authenticated users; shows a splash spinner
// while AuthContext rehydrates the session.
// ============================================================

import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Hospital } from 'lucide-react';
import LoginForm from '../components/LoginForm';
import { useAuth } from '../components/AuthContext';

export default function LoginPage() {
  const { isAuthenticated, isLoading } = useAuth();
  const navigate = useNavigate();

  // Redirect already-authenticated users
  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      navigate('/', { replace: true });
    }
  }, [isLoading, isAuthenticated, navigate]);

  // Show spinner while AuthContext rehydrates the session
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-slate-200 border-t-indigo-500 rounded-full animate-spin" />
          <p className="text-slate-400 text-sm">Loading…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-md">
        {/* Brand */}
        <div className="flex flex-col items-center mb-8">
          <span className="w-14 h-14 rounded-2xl bg-indigo-600/10 border border-indigo-600/20 flex items-center justify-center text-indigo-600 mb-4">
            <Hospital size={26} />
          </span>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Jacana HRMS</h1>
          <p className="text-sm text-slate-500 mt-1">St. Francis Hospital — Staff Portal</p>
        </div>

        <div className="card p-6">
          <LoginForm />
        </div>

        <p className="text-center text-xs text-slate-400 mt-6">
          Seeded accounts use <span className="text-slate-500">ChangeMe123!</span> — change in production.
        </p>
      </div>
    </div>
  );
}
