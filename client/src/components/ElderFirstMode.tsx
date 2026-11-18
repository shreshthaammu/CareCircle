import React, { useState } from 'react';
import confetti from 'canvas-confetti';
import { useLanguage } from '../context/LanguageContext.js';
import { useToast } from '../context/ToastContext.js';
import { Pill, Calendar, PhoneCall, Check, Clock, AlertTriangle } from 'lucide-react';

interface ElderFirstModeProps {
  doses: any[];
  nextAppointment: any | null;
  emergencyContacts: Array<{ name: string; relation: string; phone: string }>;
  elderName: string;
  onMarkDose: (doseId: string, status: 'taken' | 'snoozed') => Promise<void>;
}

export const ElderFirstMode: React.FC<ElderFirstModeProps> = ({
  doses,
  nextAppointment,
  emergencyContacts,
  elderName,
  onMarkDose,
}) => {
  const { t } = useLanguage();
  const { success: toastSuccess, error: toastError, info: toastInfo } = useToast();
  const [activeTab, setActiveTab] = useState<'meds' | 'appt' | 'call'>('meds');
  const [loadingDoseId, setLoadingDoseId] = useState<string | null>(null);

  const remainingDoses = doses.filter(d => d.status === 'scheduled' || d.status === 'snoozed');
  const completedDoses = doses.filter(d => d.status === 'taken');

  const handleTake = async (dose: any) => {
    try {
      setLoadingDoseId(dose.id);
      await onMarkDose(dose.id, 'taken');
      toastSuccess(`Marked ${dose.medicationName} as taken.`);
      const prefersReducedMotion =
        typeof window !== 'undefined' &&
        typeof window.matchMedia === 'function' &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (!prefersReducedMotion) {
        confetti({
          particleCount: 70,
          spread: 60,
          origin: { y: 0.6 },
        });
      }
    } catch (err: any) {
      toastError(err?.message || 'Could not record dose. Please try again.');
    } finally {
      setLoadingDoseId(null);
    }
  };

  const handleSnooze = async (dose: any) => {
    try {
      setLoadingDoseId(dose.id);
      await onMarkDose(dose.id, 'snoozed');
      toastInfo(`Snoozed ${dose.medicationName} for 15 minutes.`);
    } catch (err: any) {
      toastError(err?.message || 'Could not snooze dose.');
    } finally {
      setLoadingDoseId(null);
    }
  };

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      {/* Header Banner */}
      <div className="card bg-sand-50 border-2 border-teal-600 rounded-2xl p-6 mb-8 text-center">
        <h1 className="text-3xl sm:text-4xl font-extrabold text-teal-800 mb-2">
          {t.elderModeTitle} for {elderName}
        </h1>
        <p className="text-lg sm:text-xl text-stone-700">{t.elderModeSubtitle}</p>
      </div>

      {/* 3 Primary Touch-Friendly Navigation Tabs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8" role="tablist" aria-label="Elder Care Actions">
        <button
          type="button"
          onClick={() => setActiveTab('meds')}
          role="tab"
          aria-selected={activeTab === 'meds'}
          aria-controls="panel-meds"
          id="tab-meds"
          className={`min-h-[72px] rounded-2xl p-4 font-extrabold text-xl flex items-center justify-center gap-3 transition border-2 ${
            activeTab === 'meds'
              ? 'bg-teal-700 text-white border-teal-800 ring-4 ring-teal-200'
              : 'bg-white text-teal-800 border-sand-300 hover:bg-sand-50'
          }`}
        >
          <Pill className="w-7 h-7 shrink-0" />
          <span>{t.actionTodaysMeds}</span>
          {remainingDoses.length > 0 && (
            <span className="ml-1 w-7 h-7 rounded-full bg-accent-500 text-white text-sm flex items-center justify-center font-bold tabular-nums">
              {remainingDoses.length}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('appt')}
          role="tab"
          aria-selected={activeTab === 'appt'}
          aria-controls="panel-appt"
          id="tab-appt"
          className={`min-h-[72px] rounded-2xl p-4 font-extrabold text-xl flex items-center justify-center gap-3 transition border-2 ${
            activeTab === 'appt'
              ? 'bg-teal-700 text-white border-teal-800 ring-4 ring-teal-200'
              : 'bg-white text-teal-800 border-sand-300 hover:bg-sand-50'
          }`}
        >
          <Calendar className="w-7 h-7 shrink-0" />
          <span>{t.actionNextAppt}</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('call')}
          role="tab"
          aria-selected={activeTab === 'call'}
          aria-controls="panel-call"
          id="tab-call"
          className={`min-h-[72px] rounded-2xl p-4 font-extrabold text-xl flex items-center justify-center gap-3 transition border-2 ${
            activeTab === 'call'
              ? 'bg-teal-700 text-white border-teal-800 ring-4 ring-teal-200'
              : 'bg-white text-teal-800 border-sand-300 hover:bg-sand-50'
          }`}
        >
          <PhoneCall className="w-7 h-7 shrink-0" />
          <span>{t.actionCallSomeone}</span>
        </button>
      </div>

      {/* Panel 1: Today's Medicines */}
      {activeTab === 'meds' && (
        <section id="panel-meds" role="tabpanel" aria-labelledby="tab-meds" className="space-y-6">
          <h2 className="text-2xl font-bold text-stone-800 flex items-center gap-2">
            <Pill className="w-7 h-7 text-teal-600" />
            <span className="tabular-nums">
              {t.actionTodaysMeds} ({remainingDoses.length} to take)
            </span>
          </h2>

          {remainingDoses.length === 0 ? (
            <div className="card bg-teal-50 border-2 border-teal-300 rounded-2xl p-8 text-center">
              <div className="w-16 h-16 bg-teal-700 text-white rounded-full flex items-center justify-center mx-auto mb-4 text-3xl font-bold">
                <Check className="w-8 h-8" />
              </div>
              <p className="text-2xl font-extrabold text-teal-900 mb-2">{t.allDoneToday}</p>
              <p className="text-xl text-teal-800">{t.noMedsLeftToday}</p>
            </div>
          ) : (
            <div className="space-y-5">
              {remainingDoses.map(dose => (
                <div
                  key={dose.id}
                  className="card bg-white border-2 border-sand-300 rounded-2xl p-6 hover:border-teal-500 transition"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                    <div>
                      <span className="text-2xl sm:text-3xl font-extrabold text-stone-900 block mb-1">
                        {dose.medicationName} ({dose.dosage})
                      </span>
                      <span className="text-lg sm:text-xl text-stone-600 block tabular-nums">
                        <strong>Form:</strong> {dose.form} &middot; <strong>Time:</strong> {dose.scheduledTime}
                      </span>
                    </div>
                    {dose.status === 'snoozed' && (
                      <span className="bg-amber-100 text-amber-900 border border-amber-300 px-3 py-1.5 rounded-xl font-bold text-base flex items-center gap-1.5">
                        <Clock className="w-5 h-5 text-amber-700" />
                        <span>Snoozed</span>
                      </span>
                    )}
                  </div>

                  <div className="bg-sand-50 rounded-xl p-4 border border-sand-200 mb-6 text-lg sm:text-xl text-stone-800">
                    <strong>Instructions:</strong> {dose.instructions}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <button
                      type="button"
                      onClick={() => handleTake(dose)}
                      disabled={loadingDoseId === dose.id}
                      className="min-h-[64px] bg-teal-700 hover:bg-teal-800 text-white font-extrabold text-xl sm:text-2xl rounded-2xl flex items-center justify-center gap-3 transition disabled:opacity-50"
                    >
                      <Check className="w-7 h-7" />
                      <span>{t.btnTaken}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSnooze(dose)}
                      disabled={loadingDoseId === dose.id}
                      className="min-h-[64px] bg-sand-100 hover:bg-sand-200 text-stone-900 font-extrabold text-xl sm:text-2xl rounded-2xl flex items-center justify-center gap-3 transition disabled:opacity-50 border border-sand-300"
                    >
                      <Clock className="w-6 h-6 text-stone-700" />
                      <span>{t.btnSnooze}</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {completedDoses.length > 0 && (
            <div className="mt-8 pt-6 border-t-2 border-sand-200">
              <h3 className="text-xl font-bold text-stone-700 mb-4 tabular-nums">
                Completed Today ({completedDoses.length})
              </h3>
              <div className="space-y-3">
                {completedDoses.map(dose => (
                  <div
                    key={dose.id}
                    className="card bg-sand-50 border border-sand-200 rounded-xl p-4 flex items-center justify-between text-lg text-stone-800"
                  >
                    <span className="font-bold flex items-center gap-2">
                      <Check className="w-5 h-5 text-teal-700" />
                      <span>
                        {dose.medicationName} ({dose.dosage})
                      </span>
                    </span>
                    <span className="text-teal-800 font-semibold tabular-nums">
                      Scheduled {dose.scheduledTime}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>
      )}

      {/* Panel 2: Next Doctor Visit */}
      {activeTab === 'appt' && (
        <section id="panel-appt" role="tabpanel" aria-labelledby="tab-appt" className="space-y-6">
          <h2 className="text-2xl font-bold text-stone-800 flex items-center gap-2">
            <Calendar className="w-7 h-7 text-teal-600" />
            <span>{t.actionNextAppt}</span>
          </h2>

          {nextAppointment ? (
            <div className="card bg-white border-2 border-teal-600 rounded-2xl p-6 sm:p-8">
              <div className="flex items-center gap-3 text-teal-800 font-bold text-xl sm:text-2xl mb-4">
                <Calendar className="w-7 h-7 shrink-0" />
                <span>
                  {new Date(nextAppointment.dateTime).toLocaleDateString(undefined, {
                    weekday: 'long',
                    month: 'long',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </span>
              </div>

              <div className="text-3xl font-extrabold text-stone-900 mb-1">
                {nextAppointment.doctor}
              </div>
              <div className="text-xl text-teal-800 font-semibold mb-6">
                Specialty: {nextAppointment.specialty}
              </div>

              <div className="bg-sand-50 border border-sand-200 rounded-xl p-5 space-y-3 text-lg sm:text-xl mb-6">
                <p className="tabular-nums">
                  <strong>Time:</strong>{' '}
                  {new Date(nextAppointment.dateTime).toLocaleTimeString(undefined, {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
                <p>
                  <strong>Location:</strong> {nextAppointment.location}
                </p>
                <p>
                  <strong>Purpose:</strong> {nextAppointment.purpose}
                </p>
                {nextAppointment.notes && (
                  <p>
                    <strong>Notes:</strong> {nextAppointment.notes}
                  </p>
                )}
              </div>

              {nextAppointment.transportNeeded && (
                <div className="bg-amber-100 border-2 border-amber-300 rounded-xl p-4 text-amber-900 font-bold text-lg flex items-center gap-3">
                  <AlertTriangle className="w-6 h-6 text-amber-700 shrink-0" />
                  <span>Transport ride is requested for this visit.</span>
                </div>
              )}
            </div>
          ) : (
            <div className="card bg-white border-2 border-sand-300 rounded-2xl p-8 text-center">
              <p className="text-2xl font-bold text-stone-800 mb-2">No Upcoming Doctor Appointments</p>
              <p className="text-lg text-stone-600">
                Your schedule is clear. Ask your caretaker if you would like to add a visit.
              </p>
            </div>
          )}
        </section>
      )}

      {/* Panel 3: Call Someone */}
      {activeTab === 'call' && (
        <section id="panel-call" role="tabpanel" aria-labelledby="tab-call" className="space-y-6">
          <h2 className="text-2xl font-bold text-stone-800 flex items-center gap-2">
            <PhoneCall className="w-7 h-7 text-teal-600" />
            <span>{t.actionCallSomeone}</span>
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {emergencyContacts.map((contact, idx) => (
              <a
                key={idx}
                href={`tel:${contact.phone.replace(/[^0-9+]/g, '')}`}
                className="card min-h-[88px] bg-white border-2 border-sand-300 hover:border-teal-600 rounded-2xl p-5 flex items-center justify-between transition text-left group"
              >
                <div>
                  <span className="text-2xl font-extrabold text-stone-900 block group-hover:text-teal-800">
                    {contact.name}
                  </span>
                  <span className="text-base font-semibold text-stone-600 block">{contact.relation}</span>
                  <span className="text-xl font-bold text-teal-800 mt-1 block font-mono tabular-nums">
                    {contact.phone}
                  </span>
                </div>
                <div className="w-12 h-12 rounded-full bg-teal-100 group-hover:bg-teal-700 text-teal-800 group-hover:text-white flex items-center justify-center transition shrink-0">
                  <PhoneCall className="w-6 h-6" />
                </div>
              </a>
            ))}

            <a
              href="tel:911"
              className="min-h-[88px] bg-red-700 hover:bg-red-800 text-white rounded-2xl p-5 flex items-center justify-between transition sm:col-span-2"
            >
              <div>
                <span className="text-2xl sm:text-3xl font-extrabold block">Emergency (911 / 112)</span>
                <span className="text-base sm:text-lg text-red-100 block">
                  Immediate Medical or Emergency Dispatch
                </span>
              </div>
              <div className="w-12 h-12 rounded-full bg-white text-red-700 flex items-center justify-center shrink-0">
                <PhoneCall className="w-6 h-6" />
              </div>
            </a>
          </div>
        </section>
      )}
    </div>
  );
};
