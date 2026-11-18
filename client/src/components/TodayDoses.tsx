import React, { useState } from 'react';
import confetti from 'canvas-confetti';
import { useLanguage } from '../context/LanguageContext.js';
import { useToast } from '../context/ToastContext.js';
import { Check, Clock, X, Pill, Sunrise, Sun, Sunset, Moon } from 'lucide-react';

interface TodayDosesProps {
  doses: any[];
  onMarkDose: (doseId: string, status: 'taken' | 'skipped' | 'snoozed', snoozeMinutes?: number) => Promise<void>;
}

export const TodayDoses: React.FC<TodayDosesProps> = ({ doses, onMarkDose }) => {
  const { t } = useLanguage();
  const { success: toastSuccess, error: toastError, info: toastInfo } = useToast();
  const [loadingDoseId, setLoadingDoseId] = useState<string | null>(null);

  const handleMark = async (dose: any, status: 'taken' | 'skipped' | 'snoozed', minutes = 15) => {
    try {
      setLoadingDoseId(dose.id);
      await onMarkDose(dose.id, status, minutes);

      if (status === 'taken') {
        toastSuccess(`Marked ${dose.medicationName} as taken.`);
        const prefersReducedMotion =
          typeof window !== 'undefined' &&
          typeof window.matchMedia === 'function' &&
          window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        if (!prefersReducedMotion) {
          confetti({
            particleCount: 45,
            spread: 55,
            origin: { y: 0.65 },
          });
        }
      } else if (status === 'snoozed') {
        toastInfo(`Snoozed ${dose.medicationName} for ${minutes} minutes.`);
      } else {
        toastInfo(`Skipped ${dose.medicationName} for this schedule.`);
      }
    } catch (err: any) {
      toastError(err?.message || 'Could not update dose status. Please try again.');
    } finally {
      setLoadingDoseId(null);
    }
  };

  // Group doses into Morning (< 12:00), Afternoon (12:00 - 17:00), Evening (17:00 - 21:00), Night (>= 21:00)
  const periods = [
    { name: 'Morning', label: 'Morning Doses', Icon: Sunrise, filter: (time: string) => time < '12:00' },
    { name: 'Afternoon', label: 'Afternoon Doses', Icon: Sun, filter: (time: string) => time >= '12:00' && time < '17:00' },
    { name: 'Evening', label: 'Evening Doses', Icon: Sunset, filter: (time: string) => time >= '17:00' && time < '21:00' },
    { name: 'Night', label: 'Bedtime Doses', Icon: Moon, filter: (time: string) => time >= '21:00' },
  ];

  return (
    <div className="space-y-8">
      {doses.length === 0 ? (
        <div className="card bg-sand-50 border border-sand-200 rounded-2xl p-8 text-center">
          <Pill className="w-10 h-10 text-teal-600 mx-auto mb-3" />
          <p className="text-lg font-bold text-stone-800">No scheduled medications match this view.</p>
          <p className="text-sm text-stone-600 mt-1">
            Active medications with matching schedules automatically appear here.
          </p>
        </div>
      ) : (
        periods.map(period => {
          const periodDoses = doses.filter(d => period.filter(d.scheduledTime));
          if (periodDoses.length === 0) return null;
          const PeriodIcon = period.Icon;

          return (
            <div key={period.name} className="space-y-3.5">
              <div className="flex items-center justify-between border-b border-sand-200 pb-2">
                <h3 className="text-lg font-extrabold text-stone-900 flex items-center gap-2">
                  <PeriodIcon className="w-5 h-5 text-teal-600" />
                  <span>{period.label}</span>
                </h3>
                <span className="text-xs font-semibold text-stone-500 tabular-nums">
                  {periodDoses.filter(d => d.status === 'taken').length} / {periodDoses.length} taken
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {periodDoses.map(dose => {
                  const isTaken = dose.status === 'taken';
                  const isSnoozed = dose.status === 'snoozed';
                  const isSkipped = dose.status === 'skipped';

                  return (
                    <div
                      key={dose.id}
                      className={`card rounded-2xl p-5 border transition-colors ${
                        isTaken
                          ? 'bg-teal-50/60 border-teal-300'
                          : isSnoozed
                          ? 'bg-amber-50/60 border-amber-300'
                          : isSkipped
                          ? 'bg-sand-100 border-sand-300 opacity-80'
                          : 'bg-white border-sand-200 hover:border-teal-400'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3 mb-2.5">
                        <div className="min-w-0">
                          <span className="text-lg font-extrabold text-stone-900 block truncate">
                            {dose.medicationName}
                          </span>
                          <span className="text-sm text-stone-600 font-medium tabular-nums">
                            {dose.dosage} ({dose.form}) <span aria-hidden="true">&middot;</span> {dose.scheduledTime}
                          </span>
                        </div>

                        {isTaken && (
                          <span className="inline-flex items-center gap-1.5 text-xs font-bold text-teal-800 whitespace-nowrap shrink-0">
                            <span className="w-2 h-2 rounded-full bg-teal-600" aria-hidden="true" />
                            Taken
                          </span>
                        )}
                        {isSnoozed && (
                          <span className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-800 whitespace-nowrap shrink-0">
                            <span className="w-2 h-2 rounded-full bg-amber-500" aria-hidden="true" />
                            Snoozed 15m
                          </span>
                        )}
                        {isSkipped && (
                          <span className="inline-flex items-center gap-1.5 text-xs font-bold text-stone-600 whitespace-nowrap shrink-0">
                            <span className="w-2 h-2 rounded-full bg-stone-400" aria-hidden="true" />
                            Skipped
                          </span>
                        )}
                      </div>

                      <p className="text-sm text-stone-600 bg-sand-50 rounded-xl px-3 py-2.5 mb-4 border border-sand-200">
                        <strong className="text-stone-800">Instructions:</strong> {dose.instructions}
                      </p>

                      {!isTaken ? (
                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleMark(dose, 'taken')}
                            disabled={loadingDoseId === dose.id}
                            className="flex-1 min-h-[44px] bg-teal-600 hover:bg-teal-700 text-white font-bold text-sm px-4 py-2 rounded-xl flex items-center justify-center gap-2 transition disabled:opacity-50 whitespace-nowrap"
                          >
                            <Check className="w-4 h-4 shrink-0" />
                            <span>{loadingDoseId === dose.id ? 'Saving...' : t.btnTaken}</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleMark(dose, 'snoozed', 15)}
                            disabled={loadingDoseId === dose.id}
                            className="min-h-[44px] bg-amber-100 hover:bg-amber-200 text-amber-900 font-semibold text-sm px-3 py-2 rounded-xl flex items-center gap-1.5 transition disabled:opacity-50 border border-amber-300 whitespace-nowrap"
                            title="Snooze 15 minutes"
                          >
                            <Clock className="w-4 h-4" />
                            <span>15m</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleMark(dose, 'skipped')}
                            disabled={loadingDoseId === dose.id}
                            className="min-h-[44px] bg-sand-100 hover:bg-sand-200 text-stone-700 font-semibold text-sm px-3 py-2 rounded-xl flex items-center gap-1 transition disabled:opacity-50 border border-sand-200 whitespace-nowrap"
                            title="Skip this dose"
                          >
                            <X className="w-4 h-4" />
                            <span>Skip</span>
                          </button>
                        </div>
                      ) : (
                        <div className="text-xs text-teal-800 font-semibold flex items-center gap-1.5 tabular-nums">
                          <Check className="w-4 h-4 text-teal-600 shrink-0" />
                          <span>
                            Recorded{' '}
                            {dose.takenAt
                              ? `at ${new Date(dose.takenAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                              : ''}{' '}
                            by {dose.takenByName || 'Elder'}
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })
      )}
    </div>
  );
};
