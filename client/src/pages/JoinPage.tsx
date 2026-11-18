import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.js';
import { useToast } from '../context/ToastContext.js';
import { KeyRound, AlertCircle, ArrowRight } from 'lucide-react';

export const JoinPage: React.FC = () => {
  const { login } = useAuth();
  const { success } = useToast();
  const navigate = useNavigate();

  const [circleCode, setCircleCode] = useState('');
  const [passcode, setPasscode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError(null);
      await login(circleCode.trim().toUpperCase(), passcode.trim().toUpperCase());
      success('Signed in to CareCircle');
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Failed to join CareCircle. Please check your passcode.');
    } finally {
      setLoading(false);
    }
  };

  const quickJoinDemo = async (code: string, pass: string) => {
    setCircleCode(code);
    setPasscode(pass);
    try {
      setLoading(true);
      setError(null);
      await login(code, pass);
      success('Signed in to Demo CareCircle');
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Failed to join demo circle');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center py-12 px-4">
      <div className="card bg-white border border-sand-200 rounded-2xl p-8 sm:p-10 max-w-md w-full shadow-gentle space-y-6">
        <div className="text-center space-y-2">
          <div className="w-14 h-14 rounded-2xl bg-teal-50 text-teal-700 flex items-center justify-center mx-auto">
            <KeyRound className="w-7 h-7" />
          </div>
          <h1 className="text-3xl font-extrabold text-stone-900">Join a CareCircle</h1>
          <p className="text-sm text-stone-600">
            Enter your circle code and confidential role passcode.
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-800 p-3.5 rounded-xl text-sm flex items-start gap-2.5">
            <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="circle-code" className="block text-sm font-bold text-stone-800 mb-1.5">
              Circle Code
            </label>
            <input
              id="circle-code"
              type="text"
              required
              autoComplete="off"
              value={circleCode}
              onChange={e => setCircleCode(e.target.value.toUpperCase())}
              placeholder="e.g. CC-7489"
              className="w-full rounded-xl border border-sand-300 px-4 py-3 text-lg font-mono font-bold tracking-wider uppercase focus:outline-none"
            />
          </div>

          <div>
            <label htmlFor="passcode" className="block text-sm font-bold text-stone-800 mb-1.5">
              Role Passcode
            </label>
            <input
              id="passcode"
              type="text"
              required
              autoComplete="off"
              value={passcode}
              onChange={e => setPasscode(e.target.value.toUpperCase())}
              placeholder="e.g. PINE-482"
              className="w-full rounded-xl border border-sand-300 px-4 py-3 text-lg font-mono font-bold tracking-wider uppercase focus:outline-none"
            />
            <p className="text-xs text-stone-500 mt-1.5">
              Passcodes are 6–8 characters, designed to be easy to read aloud over the phone.
            </p>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 bg-teal-600 hover:bg-teal-700 text-white font-bold text-base rounded-xl shadow-gentle transition disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <span>{loading ? 'Verifying Passcode...' : 'Join Circle'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        {/* Demo Quick-Join */}
        <div className="pt-5 border-t border-sand-200 space-y-3">
          <div className="flex items-center justify-between text-xs text-stone-500">
            <span className="font-semibold">Quick Demo Sign-In</span>
            <span className="font-mono font-bold text-teal-700">CC-DEMO</span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              disabled={loading}
              onClick={() => quickJoinDemo('CC-DEMO', 'ELDER-99')}
              className="py-2 px-2 bg-sand-100 hover:bg-sand-200 rounded-xl text-xs font-bold text-teal-800 transition"
            >
              Elder
            </button>
            <button
              type="button"
              disabled={loading}
              onClick={() => quickJoinDemo('CC-DEMO', 'CARE-88')}
              className="py-2 px-2 bg-sand-100 hover:bg-sand-200 rounded-xl text-xs font-bold text-amber-800 transition"
            >
              Caretaker
            </button>
            <button
              type="button"
              disabled={loading}
              onClick={() => quickJoinDemo('CC-DEMO', 'FAM-77')}
              className="py-2 px-2 bg-sand-100 hover:bg-sand-200 rounded-xl text-xs font-bold text-blue-800 transition"
            >
              Family
            </button>
          </div>
        </div>

        <p className="text-center text-sm text-stone-500">
          Don&apos;t have a CareCircle yet?{' '}
          <Link to="/create-circle" className="text-teal-700 font-bold hover:underline">
            Create a Circle
          </Link>
        </p>
      </div>
    </div>
  );
};
