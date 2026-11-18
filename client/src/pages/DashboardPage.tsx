import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client.js';
import { useAuth } from '../context/AuthContext.js';
import { useLanguage } from '../context/LanguageContext.js';
import { useToast } from '../context/ToastContext.js';
import { TodayDoses } from '../components/TodayDoses.js';
import { AdherenceDashboard } from '../components/AdherenceDashboard.js';
import { AddMedicationModal } from '../components/AddMedicationModal.js';
import {
  UserCheck,
  Pill,
  Calendar,
  Plus,
  Flame,
  AlertCircle,
  Lock,
  ArrowRight,
  PackageOpen,
} from 'lucide-react';

export const DashboardPage: React.FC = () => {
  const { session } = useAuth();
  const { t } = useLanguage();
  const { error: toastError } = useToast();

  const [doses, setDoses] = useState<any[]>([]);
  const [medications, setMedications] = useState<any[]>([]);
  const [metrics, setMetrics] = useState<any | null>(null);
  const [nextAppointment, setNextAppointment] = useState<any | null>(null);
  const [pendingSuggestionsCount, setPendingSuggestionsCount] = useState(0);
  const [restrictedSections, setRestrictedSections] = useState<string[]>([]);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [doseFilter, setDoseFilter] = useState<'all' | 'remaining' | 'taken'>('all');
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [dosesRes, medsRes, adherenceRes, apptsRes, suggestionsRes] = await Promise.allSettled([
        api.getTodayDoses(),
        api.getMedications(),
        api.getAdherence(),
        api.getAppointments(),
        api.getSuggestions(),
      ]);

      const restricted: string[] = [];

      if (dosesRes.status === 'fulfilled') {
        setDoses(dosesRes.value.doses || []);
      } else {
        restricted.push('medications');
        setDoses([]);
      }

      if (medsRes.status === 'fulfilled') {
        setMedications(medsRes.value.medications || []);
      } else {
        setMedications([]);
      }

      if (adherenceRes.status === 'fulfilled') {
        setMetrics(adherenceRes.value.metrics || null);
      } else {
        restricted.push('adherence');
        setMetrics(null);
      }

      if (apptsRes.status === 'fulfilled') {
        setNextAppointment(apptsRes.value.upcoming?.[0] || null);
      } else {
        restricted.push('appointments');
        setNextAppointment(null);
      }

      if (suggestionsRes.status === 'fulfilled') {
        setPendingSuggestionsCount(
          (suggestionsRes.value.suggestions || []).filter((s: any) => s.status === 'pending').length
        );
      } else {
        setPendingSuggestionsCount(0);
      }

      setRestrictedSections(restricted);
    } catch (err: any) {
      toastError(err.message || 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleMarkDose = async (doseId: string, status: 'taken' | 'skipped' | 'snoozed', minutes = 15) => {
    await api.markDoseStatus(doseId, status, minutes);
    await fetchData();
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto py-10 px-4 sm:px-6 space-y-6">
        <div className="h-24 rounded-2xl bg-sand-200/70 animate-pulse" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-28 rounded-2xl bg-sand-200/70 animate-pulse" />
          ))}
        </div>
        <div className="h-64 rounded-2xl bg-sand-200/70 animate-pulse" />
      </div>
    );
  }

  const remainingDosesCount = doses.filter(d => d.status === 'scheduled' || d.status === 'snoozed').length;
  const takenDosesCount = doses.filter(d => d.status === 'taken').length;
  const lowStockMeds = medications.filter(m => m.stockCount <= m.refillThreshold);

  const filteredDoses = doses.filter(d => {
    if (doseFilter === 'remaining') return d.status === 'scheduled' || d.status === 'snoozed';
    if (doseFilter === 'taken') return d.status === 'taken';
    return true;
  });

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 space-y-8">
      {/* Top Contextual Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-6 border-b border-sand-200">
        <div>
          <p className="text-xs font-semibold text-stone-500">
            {session?.role} <span aria-hidden="true">·</span>{' '}
            <span className="font-mono font-bold text-teal-700">{session?.circleCode}</span>
          </p>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-stone-900 mt-1">
            CareCircle: {session?.elderName}
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Link
            to="/elder"
            className="px-4 py-2.5 bg-white hover:bg-sand-100 border border-sand-300 text-stone-800 font-semibold text-sm rounded-xl transition flex items-center gap-2 whitespace-nowrap shrink-0"
          >
            <UserCheck className="w-4 h-4 text-accent-600" />
            <span>Switch to Elder View</span>
          </Link>
          <button
            type="button"
            onClick={() => setIsAddModalOpen(true)}
            className="px-5 py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-bold text-sm rounded-xl shadow-gentle flex items-center gap-2 transition whitespace-nowrap shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>{t.btnAddMedication}</span>
          </button>
        </div>
      </div>

      {/* Sharing Restricted Notice (when Elder pauses sharing or restricts visibility) */}
      {restrictedSections.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3 text-sm text-amber-900">
          <Lock className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
          <div>
            <p className="font-bold">Some circle information is currently private</p>
            <p className="text-amber-800 mt-0.5">
              The elder has paused sharing or restricted visibility for: {restrictedSections.join(', ')}.
            </p>
          </div>
        </div>
      )}

      {/* Pending Consent Alert (for Elder) */}
      {session?.role === 'ELDER' && pendingSuggestionsCount > 0 && (
        <div className="bg-amber-50 border border-amber-300 rounded-2xl p-4 sm:p-5 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-6 h-6 text-amber-700 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-stone-900 text-base">
                {pendingSuggestionsCount} care {pendingSuggestionsCount === 1 ? 'change' : 'changes'} awaiting your consent
              </p>
              <p className="text-sm text-stone-600">
                Your caretaker or family suggested medication updates. Review to approve or decline.
              </p>
            </div>
          </div>
          <Link
            to="/suggestions"
            className="px-4 py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl text-sm transition flex items-center gap-1.5 whitespace-nowrap shrink-0"
          >
            <span>Review Changes</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      )}

      {/* KPI Summary Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card bg-white border border-sand-200 rounded-2xl p-5">
          <span className="text-xs font-semibold text-stone-500 block">Today&apos;s Doses</span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-3xl font-extrabold text-teal-700 tabular-nums">
              {takenDosesCount}/{doses.length}
            </span>
            <span className="text-xs text-stone-500">taken</span>
          </div>
          <p className="text-xs text-stone-500 mt-2">
            {remainingDosesCount === 0 && doses.length > 0
              ? 'All scheduled doses complete'
              : `${remainingDosesCount} remaining today`}
          </p>
        </div>

        <div className="card bg-white border border-sand-200 rounded-2xl p-5">
          <span className="text-xs font-semibold text-stone-500 block">Weekly Adherence</span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-3xl font-extrabold text-stone-900 tabular-nums">
              {metrics ? `${metrics.weeklyRate}%` : '—'}
            </span>
            <span className="text-xs text-stone-500">7 days</span>
          </div>
          <p className="text-xs text-stone-500 mt-2">
            {metrics ? `${metrics.monthlyRate}% over past 30 days` : 'Restricted'}
          </p>
        </div>

        <div className="card bg-white border border-sand-200 rounded-2xl p-5">
          <span className="text-xs font-semibold text-stone-500 flex items-center gap-1.5">
            <Flame className="w-3.5 h-3.5 text-accent-500" />
            Routine Streak
          </span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-3xl font-extrabold text-accent-600 tabular-nums">
              {metrics ? metrics.currentStreakDays : '—'}
            </span>
            <span className="text-xs text-stone-500">{t.daysStreak}</span>
          </div>
          <p className="text-xs text-stone-500 mt-2">
            {metrics ? `Best streak: ${metrics.bestStreakDays} days` : 'Restricted'}
          </p>
        </div>

        <div className="card bg-white border border-sand-200 rounded-2xl p-5">
          <span className="text-xs font-semibold text-stone-500 flex items-center gap-1.5">
            <PackageOpen className="w-3.5 h-3.5 text-amber-600" />
            Refill Alerts
          </span>
          <div className="flex items-baseline gap-2 mt-1">
            <span
              className={`text-3xl font-extrabold tabular-nums ${
                lowStockMeds.length > 0 ? 'text-amber-600' : 'text-teal-700'
              }`}
            >
              {lowStockMeds.length}
            </span>
            <span className="text-xs text-stone-500">medications</span>
          </div>
          <p className="text-xs text-stone-500 mt-2">
            {lowStockMeds.length > 0 ? (
              <Link to="/medications" className="text-teal-700 font-semibold hover:underline">
                Review low stock &rarr;
              </Link>
            ) : (
              'All stock levels healthy'
            )}
          </p>
        </div>
      </div>

      {/* Main Content Grid: Today's Doses + Sidebar Widgets */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left 2 Columns: Today's Doses */}
        <div className="lg:col-span-2 space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-2xl font-extrabold text-stone-900 flex items-center gap-2">
              <Pill className="w-6 h-6 text-teal-600" />
              <span>{t.actionTodaysMeds}</span>
            </h2>

            {/* Segmented Filter */}
            <div className="flex items-center gap-1 p-1 bg-sand-100 rounded-xl" role="group" aria-label="Filter today's doses">
              <button
                type="button"
                onClick={() => setDoseFilter('all')}
                className={`min-h-0 px-3 py-1.5 text-xs font-semibold rounded-lg transition whitespace-nowrap ${
                  doseFilter === 'all' ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                All ({doses.length})
              </button>
              <button
                type="button"
                onClick={() => setDoseFilter('remaining')}
                className={`min-h-0 px-3 py-1.5 text-xs font-semibold rounded-lg transition whitespace-nowrap ${
                  doseFilter === 'remaining' ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                Remaining ({remainingDosesCount})
              </button>
              <button
                type="button"
                onClick={() => setDoseFilter('taken')}
                className={`min-h-0 px-3 py-1.5 text-xs font-semibold rounded-lg transition whitespace-nowrap ${
                  doseFilter === 'taken' ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                Taken ({takenDosesCount})
              </button>
            </div>
          </div>

          <TodayDoses doses={filteredDoses} onMarkDose={handleMarkDose} />
        </div>

        {/* Right Sidebar: Next Appointment & Low Stock */}
        <div className="space-y-6">
          <div className="card bg-white border border-sand-200 rounded-2xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-extrabold text-stone-900 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-teal-600" />
                <span>Next Doctor Visit</span>
              </h3>
              <Link to="/appointments" className="text-xs font-semibold text-teal-700 hover:underline">
                View all
              </Link>
            </div>

            {nextAppointment ? (
              <div className="pt-3 border-t border-sand-200 space-y-2">
                <p className="text-lg font-extrabold text-stone-900">{nextAppointment.doctor}</p>
                <p className="text-xs font-semibold text-teal-700">
                  {nextAppointment.specialty}
                  {nextAppointment.transportNeeded && ' · Ride needed'}
                </p>
                <p className="text-sm text-stone-700 tabular-nums">
                  {new Date(nextAppointment.dateTime).toLocaleDateString(undefined, {
                    weekday: 'short',
                    month: 'short',
                    day: 'numeric',
                  })}{' '}
                  at{' '}
                  {new Date(nextAppointment.dateTime).toLocaleTimeString(undefined, {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
                <p className="text-xs text-stone-500">{nextAppointment.location}</p>
                <Link
                  to="/appointments"
                  className="inline-flex items-center gap-1 text-xs font-bold text-teal-700 hover:underline pt-2"
                >
                  <span>Schedule &amp; .ics calendar export</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            ) : (
              <p className="text-sm text-stone-500 pt-2 border-t border-sand-200">
                No upcoming doctor appointments scheduled.
              </p>
            )}
          </div>

          {lowStockMeds.length > 0 && (
            <div className="card bg-white border border-amber-300 rounded-2xl p-6 space-y-3">
              <h3 className="text-base font-extrabold text-stone-900 flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-amber-600" />
                <span>Refill Reminders</span>
              </h3>
              <ul className="divide-y divide-sand-100 text-sm">
                {lowStockMeds.map(med => (
                  <li key={med.id} className="py-2 flex items-center justify-between gap-2">
                    <span className="font-semibold text-stone-800 truncate">{med.name}</span>
                    <span className="font-mono text-xs font-bold text-amber-700 whitespace-nowrap">
                      {med.stockCount} left
                    </span>
                  </li>
                ))}
              </ul>
              <Link
                to="/medications"
                className="inline-flex items-center gap-1 text-xs font-bold text-teal-700 hover:underline"
              >
                <span>Update stock in Medications</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Adherence Dashboard Section */}
      {metrics && (
        <section className="pt-8 border-t border-sand-200">
          <h2 className="text-2xl font-extrabold text-stone-900 mb-6">{t.adherenceTitle}</h2>
          <AdherenceDashboard metrics={metrics} onRefresh={fetchData} />
        </section>
      )}

      {/* Add Medication Modal */}
      <AddMedicationModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSuccess={fetchData}
        userRole={session?.role}
      />
    </div>
  );
};
