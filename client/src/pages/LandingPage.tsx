import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.js';
import { useToast } from '../context/ToastContext.js';
import { Mail, Sparkles, UserCheck, ArrowRight, ShieldCheck, Clock, HeartHandshake } from 'lucide-react';

export const LandingPage: React.FC = () => {
  const { session, login } = useAuth();
  const { error: toastError } = useToast();
  const navigate = useNavigate();
  const [joiningRole, setJoiningRole] = useState<string | null>(null);

  const handleInstantDemo = async (rolePasscode: string) => {
    try {
      setJoiningRole(rolePasscode);
      await login('CC-DEMO', rolePasscode);
      navigate('/dashboard');
    } catch (err: any) {
      toastError(err.message || 'Demo login failed');
    } finally {
      setJoiningRole(null);
    }
  };

  return (
    <div className="max-w-7xl mx-auto py-12 sm:py-16 px-4 sm:px-6 space-y-20">
      {/* Hero Section */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-stretch">
        <div className="lg:col-span-7 flex flex-col justify-center space-y-6">
          <p className="text-sm font-semibold text-teal-700 tracking-wide">
            Collaborative Elderly Care <span aria-hidden="true">·</span> Consent-First Medication Coordination
          </p>

          <h1 className="font-display font-extrabold text-stone-900 tracking-tight leading-[1.1] text-[clamp(2.25rem,4vw,3.5rem)]">
            Caring for the ones who cared for us.
          </h1>

          <p className="text-lg sm:text-xl text-stone-600 leading-relaxed max-w-2xl">
            Keep elderly family members independent with an ultra-clear daily routine while caretakers and relatives stay informed through gentle escalations and consent-based updates.
          </p>

          <div className="flex flex-wrap items-center gap-4 pt-2">
            {session ? (
              <Link
                to="/dashboard"
                className="px-7 py-3.5 bg-teal-600 hover:bg-teal-700 text-white font-bold text-base rounded-xl shadow-gentle transition flex items-center gap-2 whitespace-nowrap shrink-0"
              >
                <span>Go to Dashboard</span>
                <ArrowRight className="w-5 h-5" />
              </Link>
            ) : (
              <>
                <Link
                  to="/create-circle"
                  className="px-7 py-3.5 bg-teal-600 hover:bg-teal-700 text-white font-bold text-base rounded-xl shadow-gentle transition flex items-center gap-2 whitespace-nowrap shrink-0"
                >
                  <span>Create a Care Circle</span>
                  <ArrowRight className="w-5 h-5" />
                </Link>
                <Link
                  to="/join"
                  className="px-6 py-3.5 bg-white hover:bg-sand-100 text-stone-800 font-semibold text-base rounded-xl border border-sand-300 transition whitespace-nowrap shrink-0"
                >
                  Join with Passcode
                </Link>
              </>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 pt-2 text-sm text-stone-500">
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-teal-600" />
              Elder approval required for schedule changes
            </span>
            <span className="flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-teal-600" />
              Timezone-aware reminders &amp; .ics calendar sync
            </span>
          </div>
        </div>

        {/* Instant Demo Sandbox Card */}
        <div className="lg:col-span-5 flex flex-col justify-between card bg-white border border-sand-200 rounded-2xl p-6 sm:p-8 shadow-gentle space-y-6">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between gap-2 text-xs font-semibold text-stone-500">
              <span>Interactive Demo Circle</span>
              <span className="font-mono text-teal-700 font-bold">CC-DEMO</span>
            </div>
            <h2 className="text-2xl font-extrabold text-stone-900">
              Eleanor Vance&apos;s Circle
            </h2>
            <p className="text-sm text-stone-600 leading-relaxed">
              Sign in with one click using seeded medications, 14-day adherence history, appointments, and a pending consent request.
            </p>
          </div>

          <div className="space-y-3">
            <button
              type="button"
              onClick={() => handleInstantDemo('ELDER-99')}
              disabled={joiningRole !== null}
              className="w-full p-4 bg-teal-50/70 hover:bg-teal-50 border border-teal-200 hover:border-teal-400 rounded-xl text-left transition flex items-center justify-between gap-4 disabled:opacity-60"
            >
              <div>
                <span className="text-base font-bold text-stone-900 block">
                  {joiningRole === 'ELDER-99' ? 'Signing in...' : 'Elder View'}
                </span>
                <span className="text-xs text-stone-600">
                  Full control <span aria-hidden="true">·</span> Approve suggestions <span aria-hidden="true">·</span> Elder-First mode
                </span>
              </div>
              <code className="font-mono text-xs font-bold text-teal-800 whitespace-nowrap shrink-0">
                ELDER-99
              </code>
            </button>

            <button
              type="button"
              onClick={() => handleInstantDemo('CARE-88')}
              disabled={joiningRole !== null}
              className="w-full p-4 bg-white hover:bg-sand-50 border border-sand-200 hover:border-amber-400 rounded-xl text-left transition flex items-center justify-between gap-4 disabled:opacity-60"
            >
              <div>
                <span className="text-base font-bold text-stone-900 block">
                  {joiningRole === 'CARE-88' ? 'Signing in...' : 'Caretaker View'}
                </span>
                <span className="text-xs text-stone-600">
                  Log doses <span aria-hidden="true">·</span> Schedule visits <span aria-hidden="true">·</span> Propose changes
                </span>
              </div>
              <code className="font-mono text-xs font-bold text-amber-800 whitespace-nowrap shrink-0">
                CARE-88
              </code>
            </button>

            <button
              type="button"
              onClick={() => handleInstantDemo('FAM-77')}
              disabled={joiningRole !== null}
              className="w-full p-4 bg-white hover:bg-sand-50 border border-sand-200 hover:border-blue-400 rounded-xl text-left transition flex items-center justify-between gap-4 disabled:opacity-60"
            >
              <div>
                <span className="text-base font-bold text-stone-900 block">
                  {joiningRole === 'FAM-77' ? 'Signing in...' : 'Family View'}
                </span>
                <span className="text-xs text-stone-600">
                  Track adherence <span aria-hidden="true">·</span> Suggest updates <span aria-hidden="true">·</span> View visits
                </span>
              </div>
              <code className="font-mono text-xs font-bold text-blue-800 whitespace-nowrap shrink-0">
                FAM-77
              </code>
            </button>
          </div>
        </div>
      </section>

      {/* Core Capabilities Section */}
      <section className="space-y-8 pt-6 border-t border-sand-200">
        <div className="max-w-2xl space-y-2">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-stone-900">
            Designed around dignity, clarity, and real daily routines
          </h2>
          <p className="text-stone-600">
            Every workflow connects the elder, primary caretaker, and extended family without overwhelming notifications or fragmented spreadsheets.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="card bg-white border border-sand-200 rounded-2xl p-6 space-y-3">
            <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center">
              <Mail className="w-5 h-5" />
            </div>
            <h3 className="text-xl font-bold text-stone-900">01. Proactive Escalation Engine</h3>
            <p className="text-sm text-stone-600 leading-relaxed">
              Gentle 3-tier reminders notify the elder first, then escalate to the caretaker and family only if a scheduled dose goes unconfirmed.
            </p>
          </div>

          <div className="card bg-white border border-sand-200 rounded-2xl p-6 space-y-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center">
              <UserCheck className="w-5 h-5" />
            </div>
            <h3 className="text-xl font-bold text-stone-900">02. Elder-First Consent &amp; Control</h3>
            <p className="text-sm text-stone-600 leading-relaxed">
              Large-print 3-action Elder View paired with an explicit approval queue so family and caretakers suggest changes without overriding autonomy.
            </p>
          </div>

          <div className="card bg-white border border-sand-200 rounded-2xl p-6 space-y-3">
            <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center">
              <Sparkles className="w-5 h-5" />
            </div>
            <h3 className="text-xl font-bold text-stone-900">03. Smart Prescription &amp; Voice Entry</h3>
            <p className="text-sm text-stone-600 leading-relaxed">
              Extract schedules from prescription photos or spoken notes, plus plain-language medicine explanations in English, Hindi, and Telugu.
            </p>
          </div>
        </div>
      </section>

      {/* Quiet Footer */}
      <footer className="pt-8 border-t border-sand-200 flex flex-wrap items-center justify-between gap-4 text-sm text-stone-500">
        <div className="flex items-center gap-2 font-medium text-stone-700">
          <HeartHandshake className="w-4 h-4 text-teal-600" />
          <span>CareCircle — Collaborative Elderly Care &amp; Medication Management</span>
        </div>
        <div className="flex items-center gap-6">
          <Link to="/create-circle" className="hover:text-stone-900 transition">Create Circle</Link>
          <Link to="/join" className="hover:text-stone-900 transition">Join with Passcode</Link>
        </div>
      </footer>
    </div>
  );
};
