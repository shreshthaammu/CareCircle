import React, { useState } from 'react';
import { api } from '../api/client.js';
import { useLanguage } from '../context/LanguageContext.js';
import { useToast } from '../context/ToastContext.js';
import {
  Pill,
  AlertTriangle,
  Sparkles,
  Trash2,
  X,
  Pencil,
  PackagePlus,
  Search,
  ShieldCheck,
} from 'lucide-react';

interface MedicationListProps {
  medications: any[];
  onRefresh: () => void;
  onEdit?: (med: any) => void;
  userRole?: string;
}

const DAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export const MedicationList: React.FC<MedicationListProps> = ({
  medications,
  onRefresh,
  onEdit,
  userRole,
}) => {
  const { t, language } = useLanguage();
  const { success: toastSuccess, error: toastError, info: toastInfo, confirm } = useToast();

  const [selectedMedForExplain, setSelectedMedForExplain] = useState<any | null>(null);
  const [aiExplanation, setAiExplanation] = useState<{ explanation: string; tips: string[]; disclaimer: string } | null>(null);
  const [loadingExplain, setLoadingExplain] = useState(false);
  const [refillingId, setRefillingId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMode, setFilterMode] = useState<'all' | 'low'>('all');

  const handleExplain = async (med: any) => {
    try {
      setSelectedMedForExplain(med);
      setAiExplanation(null);
      setLoadingExplain(true);
      const res = await api.explainMedicine(med.name, med.dosage, language);
      setAiExplanation(res);
    } catch {
      setAiExplanation({
        explanation: `${med.name} (${med.dosage}) is prescribed to support your daily health routine.`,
        tips: ['Take with water at consistent times', 'Check with your doctor if you notice new symptoms'],
        disclaimer: t.aiDisclaimer,
      });
    } finally {
      setLoadingExplain(false);
    }
  };

  const handleQuickRefill = async (med: any) => {
    try {
      setRefillingId(med.id);
      const nextStock = (Number(med.stockCount) || 0) + 30;
      const res = await api.updateMedication(med.id, { stockCount: nextStock });
      if (res.isSuggestion) {
        toastInfo(`Submitted +30 refill suggestion for ${med.name}.`);
      } else {
        toastSuccess(`Added +30 doses to ${med.name} (${nextStock} remaining).`);
      }
      onRefresh();
    } catch (err: any) {
      toastError(err?.message || 'Failed to update medication stock');
    } finally {
      setRefillingId(null);
    }
  };

  const handleArchive = async (id: string, name: string) => {
    const confirmed = await confirm({
      title: `Archive ${name}?`,
      message: `Archiving ${name} stops future daily dose reminders for this medicine. You can add it again later if needed.`,
      confirmLabel: 'Archive Medication',
      tone: 'danger',
    });
    if (!confirmed) return;

    try {
      await api.archiveMedication(id);
      toastSuccess(`${name} archived.`);
      onRefresh();
    } catch (err: any) {
      toastError(err?.message || 'Failed to archive medication');
    }
  };

  const formatDays = (days?: number[]) => {
    if (!days || days.length === 7) return 'Daily';
    if (days.length === 5 && !days.includes(0) && !days.includes(6)) return 'Weekdays';
    return days.map(d => DAY_SHORT[d]).join(', ');
  };

  const lowStockCount = medications.filter(m => m.stockCount <= m.refillThreshold).length;

  const filteredMeds = medications.filter(med => {
    const matchesFilter = filterMode === 'low' ? med.stockCount <= med.refillThreshold : true;
    const q = searchQuery.trim().toLowerCase();
    const matchesSearch =
      !q ||
      med.name.toLowerCase().includes(q) ||
      (med.dosage || '').toLowerCase().includes(q) ||
      (med.instructions || '').toLowerCase().includes(q);
    return matchesFilter && matchesSearch;
  });

  return (
    <div className="space-y-5">
      {/* Search & Filter Toolbar */}
      {medications.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="relative flex-1 min-w-[220px] max-w-sm">
            <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="search"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search medications or instructions..."
              aria-label="Search medications"
              className="w-full pl-10 pr-3 py-2 rounded-xl border border-sand-300 text-sm"
            />
          </div>

          <div className="flex items-center gap-1 bg-sand-100 p-1 rounded-xl" role="group" aria-label="Filter medications">
            <button
              type="button"
              onClick={() => setFilterMode('all')}
              className={`min-h-0 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                filterMode === 'all' ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              All ({medications.length})
            </button>
            <button
              type="button"
              onClick={() => setFilterMode('low')}
              className={`min-h-0 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                filterMode === 'low' ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              Low Stock ({lowStockCount})
            </button>
          </div>
        </div>
      )}

      {filteredMeds.length === 0 ? (
        <div className="card bg-sand-50 border border-sand-200 rounded-2xl p-8 text-center">
          <Pill className="w-10 h-10 text-teal-600 mx-auto mb-3" />
          <p className="text-lg font-bold text-stone-800">
            {medications.length === 0 ? 'No active medications found.' : 'No medications match your filter.'}
          </p>
          <p className="text-sm text-stone-600 mt-1">
            {medications.length === 0
              ? 'Use "Add Medication" above to start managing schedules.'
              : 'Try clearing your search or switching back to all medications.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredMeds.map(med => {
            const isLowStock = med.stockCount <= med.refillThreshold;

            return (
              <div
                key={med.id}
                className="card bg-white border border-sand-200 rounded-2xl p-6 hover:border-teal-400 transition-colors flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="min-w-0">
                      <h3 className="text-xl font-extrabold text-stone-900 truncate">{med.name}</h3>
                      <span className="text-sm font-semibold text-teal-700">
                        {med.dosage} <span aria-hidden="true">&middot;</span> {med.form}
                      </span>
                    </div>

                    {isLowStock && (
                      <span className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-800 whitespace-nowrap shrink-0">
                        <AlertTriangle className="w-4 h-4 text-amber-600" />
                        <span className="tabular-nums">Refill due ({med.stockCount} left)</span>
                      </span>
                    )}
                  </div>

                  <div className="text-sm text-stone-600 bg-sand-50 rounded-xl p-3.5 mb-4 space-y-1.5 border border-sand-200">
                    <p>
                      <strong className="text-stone-800">Instructions:</strong> {med.instructions}
                    </p>
                    <p className="tabular-nums">
                      <strong className="text-stone-800">Schedule:</strong>{' '}
                      {med.schedule?.times?.join(', ')} ({formatDays(med.schedule?.daysOfWeek)})
                    </p>
                    <p className="tabular-nums">
                      <strong className="text-stone-800">Stock:</strong> {med.stockCount} doses remaining
                      (alert at {med.refillThreshold})
                    </p>
                    {med.notes && (
                      <p className="text-xs text-stone-500 pt-1">
                        <strong className="text-stone-700">Notes:</strong> {med.notes}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-sand-200">
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleExplain(med)}
                      className="min-h-0 text-xs font-bold text-teal-800 bg-teal-50 hover:bg-teal-100 border border-teal-200 px-3 py-2 rounded-lg flex items-center gap-1.5 transition whitespace-nowrap"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-teal-600" />
                      <span>Explain</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleQuickRefill(med)}
                      disabled={refillingId === med.id}
                      className="min-h-0 text-xs font-bold text-stone-700 bg-sand-100 hover:bg-sand-200 border border-sand-200 px-3 py-2 rounded-lg flex items-center gap-1.5 transition whitespace-nowrap disabled:opacity-50"
                    >
                      <PackagePlus className="w-3.5 h-3.5 text-teal-700" />
                      <span>{refillingId === med.id ? 'Updating...' : '+30 Refill'}</span>
                    </button>
                  </div>

                  <div className="flex items-center gap-1">
                    {onEdit && (
                      <button
                        type="button"
                        onClick={() => onEdit(med)}
                        className="min-h-0 text-xs font-semibold text-stone-600 hover:text-teal-800 px-2.5 py-2 rounded-lg hover:bg-sand-100 transition flex items-center gap-1"
                        title={`Edit ${med.name}`}
                        aria-label={`Edit ${med.name}`}
                      >
                        <Pencil className="w-3.5 h-3.5" />
                        <span>Edit</span>
                      </button>
                    )}

                    {userRole !== 'FAMILY' && (
                      <button
                        type="button"
                        onClick={() => handleArchive(med.id, med.name)}
                        className="min-h-0 text-xs font-semibold text-stone-500 hover:text-red-700 p-2 rounded-lg hover:bg-red-50 transition"
                        title="Archive Medication"
                        aria-label={`Archive ${med.name}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* AI Explanation Modal */}
      {selectedMedForExplain && (
        <div
          className="fixed inset-0 z-50 bg-stone-950/60 backdrop-blur-sm flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="explain-modal-title"
        >
          <div className="card bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-elevated border border-sand-200">
            <div className="flex items-center justify-between pb-3 border-b border-sand-200 mb-4">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-teal-600" />
                <h3 id="explain-modal-title" className="text-xl font-bold text-stone-900">
                  {selectedMedForExplain.name}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedMedForExplain(null)}
                aria-label="Close explanation"
                className="min-h-0 p-1.5 rounded-lg text-stone-500 hover:text-stone-800 hover:bg-sand-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {loadingExplain ? (
              <div className="py-8 text-center text-teal-700 font-semibold animate-pulse">
                Preparing a plain-language explanation...
              </div>
            ) : aiExplanation ? (
              <div className="space-y-4">
                <div className="bg-teal-50 p-4 rounded-2xl border border-teal-200">
                  <p className="text-base text-stone-800 leading-relaxed font-medium">
                    {aiExplanation.explanation}
                  </p>
                </div>

                {aiExplanation.tips && aiExplanation.tips.length > 0 && (
                  <div>
                    <h4 className="text-sm font-bold text-stone-800 mb-2">Helpful Tips</h4>
                    <ul className="list-disc pl-5 text-sm text-stone-600 space-y-1">
                      {aiExplanation.tips.map((tip, idx) => (
                        <li key={idx}>{tip}</li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="bg-sand-50 p-3 rounded-xl border border-sand-200 text-xs text-stone-500 flex items-start gap-2">
                  <ShieldCheck className="w-4 h-4 text-teal-700 shrink-0 mt-0.5" />
                  <span>{aiExplanation.disclaimer}</span>
                </div>
              </div>
            ) : null}

            <div className="mt-6 text-right">
              <button
                type="button"
                onClick={() => setSelectedMedForExplain(null)}
                className="px-5 py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl text-sm transition"
              >
                Got It
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
