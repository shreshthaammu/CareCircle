import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { api } from '../api/client.js';
import { useAuth } from '../context/AuthContext.js';
import { useToast } from '../context/ToastContext.js';
import { Heart, Copy, Check, AlertTriangle } from 'lucide-react';

export const CreateCirclePage: React.FC = () => {
  const { login } = useAuth();
  const { success: toastSuccess, error: toastError } = useToast();
  const navigate = useNavigate();

  const [elderName, setElderName] = useState('');
  const [elderEmail, setElderEmail] = useState('');
  const [timezone, setTimezone] = useState('America/New_York');
  const [language, setLanguage] = useState<'en' | 'hi' | 'te'>('en');

  // Emergency contacts
  const [contactName1, setContactName1] = useState('');
  const [contactRel1, setContactRel1] = useState('Primary Physician');
  const [contactPhone1, setContactPhone1] = useState('');

  const [contactName2, setContactName2] = useState('');
  const [contactRel2, setContactRel2] = useState('Family / Son');
  const [contactPhone2, setContactPhone2] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [createdData, setCreatedData] = useState<{
    circle: any;
    passcodes: { elder: string; caretaker: string; family: string };
  } | null>(null);
  const [copied, setCopied] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError(null);

      const emergencyContacts = [];
      if (contactName1.trim() && contactPhone1.trim()) {
        emergencyContacts.push({
          name: contactName1.trim(),
          relation: contactRel1.trim() || 'Physician',
          phone: contactPhone1.trim(),
        });
      }
      if (contactName2.trim() && contactPhone2.trim()) {
        emergencyContacts.push({
          name: contactName2.trim(),
          relation: contactRel2.trim() || 'Family',
          phone: contactPhone2.trim(),
        });
      }

      const res = await api.createCircle({
        elderName: elderName.trim(),
        elderEmail: elderEmail.trim(),
        timezone,
        language,
        emergencyContacts,
      });

      setCreatedData(res);
      toastSuccess(`Created CareCircle ${res.circle.code}. Save your passcodes below.`);
    } catch (err: any) {
      setError(err?.message || 'Failed to create CareCircle');
    } finally {
      setLoading(false);
    }
  };

  const copyAllPasscodes = async () => {
    if (!createdData) return;
    const text = `CareCircle Details for ${createdData.circle.elderName}
Circle Code: ${createdData.circle.code}
Elder Passcode: ${createdData.passcodes.elder} (Full Control)
Caretaker Passcode: ${createdData.passcodes.caretaker} (Schedules & Appointments)
Family Passcode: ${createdData.passcodes.family} (View & Suggest)
Save these passcodes safely!`;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toastSuccess('Copied circle code and all 3 role passcodes.');
      setTimeout(() => setCopied(false), 2500);
    } catch {
      toastError('Could not access clipboard. Please copy the passcodes manually.');
    }
  };

  const proceedToDashboard = async () => {
    if (!createdData) return;
    try {
      setLoading(true);
      await login(createdData.circle.code, createdData.passcodes.elder);
      navigate('/dashboard');
    } catch {
      navigate('/join');
    } finally {
      setLoading(false);
    }
  };

  if (createdData) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center py-12 px-4">
        <div className="card bg-white border-2 border-teal-500 rounded-3xl p-8 sm:p-10 max-w-xl w-full shadow-elevated space-y-6">
          <div className="text-center">
            <span className="w-14 h-14 rounded-2xl bg-teal-100 text-teal-700 flex items-center justify-center mx-auto mb-3">
              <Check className="w-7 h-7" />
            </span>
            <h1 className="text-3xl font-extrabold text-stone-900">CareCircle Created</h1>
            <p className="text-stone-600 mt-1">
              Circle for <strong>{createdData.circle.elderName}</strong> is ready.
            </p>
          </div>

          <div className="bg-amber-50 border border-amber-300 rounded-2xl p-4 text-amber-900 text-sm flex items-start gap-2.5">
            <AlertTriangle className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
            <div>
              <strong className="block font-bold">Important Security Notice</strong>
              Passcodes are displayed only once. We store one-way cryptographic hashes, so save or copy these codes now.
            </div>
          </div>

          <div className="space-y-3 bg-sand-50 border border-sand-200 rounded-2xl p-5">
            <div className="flex items-center justify-between pb-3 border-b border-sand-200">
              <span className="text-xs font-bold uppercase text-stone-500">Circle Code</span>
              <span className="font-mono text-2xl font-extrabold text-teal-800 tracking-wider">
                {createdData.circle.code}
              </span>
            </div>

            <div className="flex items-center justify-between py-1.5">
              <div>
                <span className="text-sm font-bold text-stone-900 block">Elder Passcode</span>
                <span className="text-xs text-stone-500">Full control &amp; consent approval</span>
              </div>
              <code className="bg-white border-2 border-teal-500 text-teal-800 px-3 py-1.5 rounded-xl font-mono font-extrabold text-base tracking-wide">
                {createdData.passcodes.elder}
              </code>
            </div>

            <div className="flex items-center justify-between py-1.5">
              <div>
                <span className="text-sm font-bold text-stone-900 block">Caretaker Passcode</span>
                <span className="text-xs text-stone-500">Schedules &amp; doctor visits</span>
              </div>
              <code className="bg-white border-2 border-amber-400 text-amber-900 px-3 py-1.5 rounded-xl font-mono font-extrabold text-base tracking-wide">
                {createdData.passcodes.caretaker}
              </code>
            </div>

            <div className="flex items-center justify-between py-1.5">
              <div>
                <span className="text-sm font-bold text-stone-900 block">Family Passcode</span>
                <span className="text-xs text-stone-500">View progress &amp; suggest updates</span>
              </div>
              <code className="bg-white border-2 border-blue-400 text-blue-900 px-3 py-1.5 rounded-xl font-mono font-extrabold text-base tracking-wide">
                {createdData.passcodes.family}
              </code>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <button
              type="button"
              onClick={copyAllPasscodes}
              className="flex-1 py-3 bg-sand-200 hover:bg-sand-300 text-stone-900 font-bold rounded-xl flex items-center justify-center gap-2 transition"
            >
              {copied ? <Check className="w-5 h-5 text-teal-700" /> : <Copy className="w-5 h-5" />}
              <span>{copied ? 'Passcodes Copied' : 'Copy All Passcodes'}</span>
            </button>
            <button
              type="button"
              onClick={proceedToDashboard}
              disabled={loading}
              className="flex-1 py-3 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl transition disabled:opacity-50"
            >
              {loading ? 'Signing in...' : 'Enter Dashboard as Elder'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center py-12 px-4">
      <div className="card bg-white border border-sand-200 rounded-3xl p-8 sm:p-10 max-w-lg w-full shadow-elevated">
        <div className="text-center mb-6">
          <div className="w-12 h-12 rounded-2xl bg-teal-50 border border-teal-200 text-teal-700 flex items-center justify-center mx-auto mb-3">
            <Heart className="w-6 h-6 fill-current" />
          </div>
          <h1 className="text-3xl font-extrabold text-stone-900">Create a Care Circle</h1>
          <p className="text-stone-600 text-sm mt-1">
            Set up an elder&apos;s profile to coordinate medication routines and appointments.
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-800 p-3 rounded-xl mb-4 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="elder-name" className="block text-sm font-bold text-stone-800 mb-1">
              Elder&apos;s Full Name *
            </label>
            <input
              id="elder-name"
              type="text"
              required
              value={elderName}
              onChange={e => setElderName(e.target.value)}
              placeholder="e.g. Eleanor Vance"
              className="w-full rounded-xl border border-sand-300 p-3 text-base"
            />
          </div>

          <div>
            <label htmlFor="elder-email" className="block text-sm font-bold text-stone-800 mb-1">
              Elder&apos;s Email Address *
            </label>
            <input
              id="elder-email"
              type="email"
              required
              value={elderEmail}
              onChange={e => setElderEmail(e.target.value)}
              placeholder="e.g. eleanor@example.com"
              className="w-full rounded-xl border border-sand-300 p-3 text-base"
            />
            <p className="text-xs text-stone-500 mt-1">
              Dose reminders with one-tap confirmation links are sent to this address.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="elder-lang" className="block text-sm font-bold text-stone-800 mb-1">
                Preferred Language
              </label>
              <select
                id="elder-lang"
                value={language}
                onChange={e => setLanguage(e.target.value as any)}
                className="w-full rounded-xl border border-sand-300 p-3 text-base"
              >
                <option value="en">English</option>
                <option value="hi">हिन्दी (Hindi)</option>
                <option value="te">తెలుగు (Telugu)</option>
              </select>
            </div>

            <div>
              <label htmlFor="elder-tz" className="block text-sm font-bold text-stone-800 mb-1">
                Timezone
              </label>
              <select
                id="elder-tz"
                value={timezone}
                onChange={e => setTimezone(e.target.value)}
                className="w-full rounded-xl border border-sand-300 p-3 text-base"
              >
                <option value="America/New_York">Eastern Time (ET)</option>
                <option value="America/Chicago">Central Time (CT)</option>
                <option value="America/Denver">Mountain Time (MT)</option>
                <option value="America/Los_Angeles">Pacific Time (PT)</option>
                <option value="Asia/Kolkata">India Standard Time (IST)</option>
                <option value="UTC">UTC</option>
              </select>
            </div>
          </div>

          <div className="bg-sand-50 p-3.5 rounded-xl border border-sand-200 space-y-2">
            <span className="text-xs font-bold uppercase text-stone-600 block">
              Primary Physician (Optional)
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <input
                type="text"
                placeholder="Doctor Name"
                value={contactName1}
                onChange={e => setContactName1(e.target.value)}
                className="rounded-lg border border-sand-300 p-2 text-sm"
              />
              <input
                type="text"
                placeholder="Specialty"
                value={contactRel1}
                onChange={e => setContactRel1(e.target.value)}
                className="rounded-lg border border-sand-300 p-2 text-sm"
              />
              <input
                type="tel"
                placeholder="Phone Number"
                value={contactPhone1}
                onChange={e => setContactPhone1(e.target.value)}
                className="rounded-lg border border-sand-300 p-2 text-sm font-mono"
              />
            </div>
          </div>

          <div className="bg-sand-50 p-3.5 rounded-xl border border-sand-200 space-y-2">
            <span className="text-xs font-bold uppercase text-stone-600 block">
              Family / Care Coordinator Contact (Optional)
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <input
                type="text"
                placeholder="Contact Name"
                value={contactName2}
                onChange={e => setContactName2(e.target.value)}
                className="rounded-lg border border-sand-300 p-2 text-sm"
              />
              <input
                type="text"
                placeholder="Relation"
                value={contactRel2}
                onChange={e => setContactRel2(e.target.value)}
                className="rounded-lg border border-sand-300 p-2 text-sm"
              />
              <input
                type="tel"
                placeholder="Phone Number"
                value={contactPhone2}
                onChange={e => setContactPhone2(e.target.value)}
                className="rounded-lg border border-sand-300 p-2 text-sm font-mono"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 bg-teal-600 hover:bg-teal-700 text-white font-bold text-lg rounded-xl transition disabled:opacity-50 mt-2"
          >
            {loading ? 'Generating Passcodes...' : 'Create CareCircle'}
          </button>
        </form>

        <div className="mt-5 text-center text-sm text-stone-500">
          Already have a passcode?{' '}
          <Link to="/join" className="text-teal-700 font-bold hover:underline">
            Join Existing Circle
          </Link>
        </div>
      </div>
    </div>
  );
};
