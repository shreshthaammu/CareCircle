import React, { useState, useEffect } from 'react';
import { api } from '../api/client.js';
import { useLanguage } from '../context/LanguageContext.js';
import { Flame, Award, Calendar, AlertTriangle, Sparkles, ShieldCheck } from 'lucide-react';

interface AdherenceDashboardProps {
  metrics: any;
  onRefresh?: () => void;
}

export const AdherenceDashboard: React.FC<AdherenceDashboardProps> = ({ metrics }) => {
  const { t } = useLanguage();
  const [weeklyStory, setWeeklyStory] = useState<{ summary: string; highlight: string; disclaimer: string } | null>(null);

  useEffect(() => {
    let active = true;
    const fetchStory = async () => {
      try {
        const story = await api.getWeeklySummary();
        if (active) setWeeklyStory(story);
      } catch {
        // Ignore if offline or unauthenticated (e.g., isolated unit test)
      }
    };
    fetchStory();
    return () => {
      active = false;
    };
  }, [metrics]);

  if (!metrics) {
    return <div className="text-center py-8 text-stone-500">Loading adherence metrics...</div>;
  }

  const getLevelStyles = (level: number) => {
    switch (level) {
      case 4:
        return 'bg-teal-600 text-white border-teal-700'; // 100%
      case 3:
        return 'bg-teal-200 text-teal-950 border-teal-300'; // 80-99%
      case 2:
        return 'bg-amber-200 text-amber-950 border-amber-300'; // 50-79%
      case 1:
        return 'bg-red-500 text-white border-red-600'; // < 50%
      default:
        return 'bg-sand-100 text-stone-600 border-sand-200'; // 0 / none
    }
  };

  return (
    <div className="space-y-8">
      {/* Metrics Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card bg-white border border-sand-200 rounded-2xl p-5">
          <span className="text-xs font-semibold text-stone-500 block mb-1">{t.weeklyRate}</span>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl sm:text-4xl font-extrabold text-teal-700 tabular-nums">
              {metrics.weeklyRate}%
            </span>
            <span className="text-xs text-stone-500">past 7 days</span>
          </div>
          <div className="w-full bg-sand-200 h-2 rounded-full mt-3 overflow-hidden">
            <div
              className="bg-teal-600 h-full rounded-full transition-all duration-500"
              style={{ width: `${Math.min(100, Math.max(0, metrics.weeklyRate))}%` }}
            />
          </div>
        </div>

        <div className="card bg-white border border-sand-200 rounded-2xl p-5">
          <span className="text-xs font-semibold text-stone-500 block mb-1">{t.monthlyRate}</span>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl sm:text-4xl font-extrabold text-teal-800 tabular-nums">
              {metrics.monthlyRate}%
            </span>
            <span className="text-xs text-stone-500">past 30 days</span>
          </div>
          <div className="w-full bg-sand-200 h-2 rounded-full mt-3 overflow-hidden">
            <div
              className="bg-teal-700 h-full rounded-full transition-all duration-500"
              style={{ width: `${Math.min(100, Math.max(0, metrics.monthlyRate))}%` }}
            />
          </div>
        </div>

        <div className="card bg-white border border-sand-200 rounded-2xl p-5">
          <span className="text-xs font-semibold text-stone-500 mb-1 flex items-center gap-1.5">
            <Flame className="w-4 h-4 text-accent-500" />
            <span>{t.currentStreak}</span>
          </span>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl sm:text-4xl font-extrabold text-accent-600 tabular-nums">
              {metrics.currentStreakDays}
            </span>
            <span className="text-xs text-stone-500">{t.daysStreak}</span>
          </div>
          <p className="text-xs text-stone-500 mt-2">Consecutive days on routine</p>
        </div>

        <div className="card bg-white border border-sand-200 rounded-2xl p-5">
          <span className="text-xs font-semibold text-stone-500 mb-1 flex items-center gap-1.5">
            <Award className="w-4 h-4 text-amber-500" />
            <span>{t.bestStreak}</span>
          </span>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl sm:text-4xl font-extrabold text-amber-600 tabular-nums">
              {metrics.bestStreakDays}
            </span>
            <span className="text-xs text-stone-500">{t.daysStreak}</span>
          </div>
          <p className="text-xs text-stone-500 mt-2">All-time personal best</p>
        </div>
      </div>

      {/* Plain-Language Weekly Summary */}
      {weeklyStory && (
        <div className="card bg-teal-50 border border-teal-200 rounded-2xl p-6">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-teal-600" />
              <h3 className="text-lg font-bold text-teal-900">{t.aiWeeklySummary}</h3>
            </div>
            <span className="text-xs font-bold text-teal-800">{weeklyStory.highlight}</span>
          </div>
          <p className="text-stone-700 leading-relaxed text-base mb-3">{weeklyStory.summary}</p>
          <p className="text-xs text-stone-500 border-t border-teal-200/70 pt-2.5 flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-teal-700 shrink-0" />
            <span>{weeklyStory.disclaimer}</span>
          </p>
        </div>
      )}

      {/* Accessible 30-Day Calendar Heatmap */}
      <div className="card bg-white border border-sand-200 rounded-2xl p-6">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-5">
          <div>
            <h3 className="text-lg font-extrabold text-stone-900 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-teal-600" />
              <span>{t.calendarHeatmapTitle}</span>
            </h3>
            <p className="text-xs text-stone-500 mt-0.5">
              Each cell shows the day of month and adherence percentage. Hover or focus for dose counts.
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs font-semibold text-stone-600" aria-hidden="true">
            <span>Missed</span>
            <span className="w-3.5 h-3.5 rounded bg-red-500 inline-block" title="<50% adherence" />
            <span className="w-3.5 h-3.5 rounded bg-amber-200 border border-amber-300 inline-block" title="50-79% adherence" />
            <span className="w-3.5 h-3.5 rounded bg-teal-200 border border-teal-300 inline-block" title="80-99% adherence" />
            <span className="w-3.5 h-3.5 rounded bg-teal-600 inline-block" title="100% adherence" />
            <span>100%</span>
          </div>
        </div>

        <div
          className="grid grid-cols-5 sm:grid-cols-10 md:grid-cols-15 gap-2"
          role="region"
          aria-label="30 Day Adherence Heatmap"
        >
          {(metrics.heatmap || []).map((day: any) => {
            const dateObj = new Date(`${day.date}T12:00:00`);
            const label = `${dateObj.toLocaleDateString(undefined, {
              month: 'short',
              day: 'numeric',
            })}: ${day.rate}% adherence (${day.taken} of ${day.total} doses taken)`;

            return (
              <div
                key={day.date}
                className={`h-12 rounded-xl border flex flex-col items-center justify-center text-xs font-bold transition-transform hover:scale-105 cursor-default tabular-nums ${getLevelStyles(
                  day.level
                )}`}
                title={label}
                aria-label={label}
                tabIndex={0}
              >
                <span>{dateObj.getDate()}</span>
                <span className="text-[10px] opacity-85 font-semibold">{day.rate}%</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Missed Doses Section */}
      {metrics.missedDoses && metrics.missedDoses.length > 0 && (
        <div className="card bg-white border border-sand-200 rounded-2xl p-6">
          <h3 className="text-lg font-extrabold text-stone-900 mb-4 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-500" />
            <span>Recent Unrecorded Doses ({metrics.missedDoses.length})</span>
          </h3>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-sand-200 text-stone-500 text-xs font-bold uppercase">
                  <th className="py-2.5 px-3">Date</th>
                  <th className="py-2.5 px-3">Time</th>
                  <th className="py-2.5 px-3">Medication</th>
                  <th className="py-2.5 px-3">Dosage</th>
                  <th className="py-2.5 px-3">Instructions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-sand-100">
                {metrics.missedDoses.map((m: any) => (
                  <tr key={m.id} className="hover:bg-sand-50/70 transition">
                    <td className="py-3 px-3 font-semibold text-stone-800 tabular-nums whitespace-nowrap">
                      {m.scheduledDate}
                    </td>
                    <td className="py-3 px-3 font-medium text-stone-600 tabular-nums whitespace-nowrap">
                      {m.scheduledTime}
                    </td>
                    <td className="py-3 px-3 font-bold text-stone-900">{m.medicationName}</td>
                    <td className="py-3 px-3 text-stone-600">{m.dosage}</td>
                    <td className="py-3 px-3 text-stone-500">{m.instructions}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
