import React, { useState } from 'react';
import { api } from '../api/client.js';
import { useLanguage } from '../context/LanguageContext.js';
import { useToast } from '../context/ToastContext.js';
import { Check, X, UserCheck, ArrowRight, Lock } from 'lucide-react';

interface SuggestionsListProps {
  suggestions: any[];
  userRole?: string;
  onRefresh: () => void;
}

function describeSuggestion(sug: any) {
  const payload = sug.payload || {};

  if (sug.type === 'medication_update') {
    const current = payload.current || {};
    const updates = payload.updates || {};
    const title = updates.name || current.name || 'Medication Update';
    const dosage = updates.dosage || current.dosage || '';
    const changes: Array<{ label: string; before: string; after: string }> = [];

    if (updates.name && updates.name !== current.name) {
      changes.push({ label: 'Name', before: current.name || '—', after: updates.name });
    }
    if (updates.dosage && updates.dosage !== current.dosage) {
      changes.push({ label: 'Dosage', before: current.dosage || '—', after: updates.dosage });
    }
    if (updates.form && updates.form !== current.form) {
      changes.push({ label: 'Form', before: current.form || '—', after: updates.form });
    }
    if (updates.instructions && updates.instructions !== current.instructions) {
      changes.push({ label: 'Instructions', before: current.instructions || '—', after: updates.instructions });
    }
    if (updates.schedule?.times) {
      changes.push({
        label: 'Times',
        before: current.schedule?.times?.join(', ') || '—',
        after: updates.schedule.times.join(', '),
      });
    }
    if (updates.stockCount !== undefined && updates.stockCount !== current.stockCount) {
      changes.push({
        label: 'Stock',
        before: String(current.stockCount ?? '—'),
        after: String(updates.stockCount),
      });
    }
    if (updates.notes && updates.notes !== current.notes) {
      changes.push({ label: 'Notes', before: current.notes || 'None', after: updates.notes });
    }

    return {
      kindLabel: 'Update Medication',
      title,
      dosage,
      changes,
      form: updates.form || current.form || 'Tablet',
      instructions: updates.instructions || current.instructions || 'As directed',
      times: updates.schedule?.times || current.schedule?.times || [],
      notes: updates.notes || current.notes || '',
    };
  }

  if (sug.type === 'medication_delete') {
    const target = payload.current || payload;
    return {
      kindLabel: 'Archive Medication',
      title: target.name || 'Medication Archive',
      dosage: target.dosage || '',
      changes: [],
      form: target.form || 'Tablet',
      instructions: target.instructions || 'Stop daily schedule',
      times: target.schedule?.times || [],
      notes: target.notes || '',
    };
  }

  return {
    kindLabel: 'Add Medication',
    title: payload.name || 'New Medication',
    dosage: payload.dosage || '',
    changes: [],
    form: payload.form || 'Tablet',
    instructions: payload.instructions || 'As directed',
    times: payload.schedule?.times || [],
    notes: payload.notes || '',
  };
}

export const SuggestionsList: React.FC<SuggestionsListProps> = ({
  suggestions,
  userRole,
  onRefresh,
}) => {
  const { t } = useLanguage();
  const { success: toastSuccess, error: toastError, info: toastInfo } = useToast();
  const [reviewNotes, setReviewNotes] = useState<Record<string, string>>({});
  const [processingId, setProcessingId] = useState<string | null>(null);

  const handleApprove = async (id: string) => {
    try {
      setProcessingId(id);
      await api.approveSuggestion(id, reviewNotes[id]);
      toastSuccess('Approved care change and updated active schedule.');
      onRefresh();
    } catch (err: any) {
      toastError(err?.message || 'Failed to approve suggestion');
    } finally {
      setProcessingId(null);
    }
  };

  const handleDecline = async (id: string) => {
    try {
      setProcessingId(id);
      await api.declineSuggestion(id, reviewNotes[id]);
      toastInfo('Suggestion declined.');
      onRefresh();
    } catch (err: any) {
      toastError(err?.message || 'Failed to decline suggestion');
    } finally {
      setProcessingId(null);
    }
  };

  const pendingList = suggestions.filter(s => s.status === 'pending');
  const pastList = suggestions.filter(s => s.status !== 'pending');

  return (
    <div className="space-y-8">
      {/* Pending Suggestions */}
      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-xl font-extrabold text-stone-900 flex items-center gap-2">
            <UserCheck className="w-5 h-5 text-teal-600" />
            <span>
              {t.suggestionsTitle} ({pendingList.length})
            </span>
          </h3>
          {userRole !== 'ELDER' && (
            <span className="text-xs font-semibold text-amber-800 flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-amber-700" />
              <span>Awaiting Elder consent before changes apply</span>
            </span>
          )}
        </div>

        {pendingList.length === 0 ? (
          <div className="card bg-sand-50 border border-sand-200 rounded-2xl p-8 text-center">
            <p className="text-lg font-bold text-stone-800">No pending suggestions.</p>
            <p className="text-sm text-stone-600 mt-1">
              All proposed medication updates have been reviewed.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {pendingList.map(sug => {
              const info = describeSuggestion(sug);

              return (
                <div
                  key={sug.id}
                  className="card bg-white border-2 border-teal-300 rounded-2xl p-6 space-y-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3 border-b border-sand-200 pb-3">
                    <div>
                      <span className="text-xs font-bold uppercase tracking-wider text-teal-700 block">
                        {info.kindLabel}
                      </span>
                      <h4 className="text-2xl font-extrabold text-stone-900 mt-0.5">
                        {info.title} {info.dosage ? `(${info.dosage})` : ''}
                      </h4>
                    </div>

                    <div className="text-right text-xs">
                      <span className="font-bold text-stone-800 block">
                        Proposed by {sug.proposedByName}
                      </span>
                      <span className="text-stone-500 block mt-0.5 tabular-nums">
                        {new Date(sug.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>

                  {/* Structured Diff for medication_update or summary for add/delete */}
                  {info.changes.length > 0 ? (
                    <div className="bg-sand-50 border border-sand-200 rounded-xl p-4 text-sm space-y-2">
                      <p className="text-xs font-bold uppercase tracking-wider text-stone-500">
                        Proposed Changes
                      </p>
                      <div className="divide-y divide-sand-200">
                        {info.changes.map((c, idx) => (
                          <div key={idx} className="py-2 flex flex-wrap items-center gap-2">
                            <span className="font-bold text-stone-800 min-w-[96px]">{c.label}:</span>
                            <span className="text-stone-500 line-through">{c.before}</span>
                            <ArrowRight className="w-3.5 h-3.5 text-teal-700 shrink-0" />
                            <span className="font-bold text-teal-800">{c.after}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="bg-sand-50 border border-sand-200 rounded-xl p-4 text-sm space-y-1.5 text-stone-700">
                      <p>
                        <strong className="text-stone-900">Form:</strong> {info.form}{' '}
                        <span aria-hidden="true">&middot;</span>{' '}
                        <strong className="text-stone-900">Instructions:</strong> {info.instructions}
                      </p>
                      {info.times.length > 0 && (
                        <p className="tabular-nums">
                          <strong className="text-stone-900">Schedule:</strong> {info.times.join(', ')} daily
                        </p>
                      )}
                      {info.notes && (
                        <p className="text-stone-600">
                          <strong className="text-stone-900">Notes:</strong> {info.notes}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Elder Actions */}
                  {userRole === 'ELDER' ? (
                    <div className="space-y-3 pt-1">
                      <input
                        type="text"
                        value={reviewNotes[sug.id] || ''}
                        onChange={e => setReviewNotes(prev => ({ ...prev, [sug.id]: e.target.value }))}
                        placeholder="Optional comment to share with your circle..."
                        aria-label={`Review comment for ${info.title}`}
                        className="w-full text-sm rounded-xl border border-sand-300 p-2.5"
                      />

                      <div className="flex flex-wrap items-center gap-3">
                        <button
                          type="button"
                          onClick={() => handleApprove(sug.id)}
                          disabled={processingId === sug.id}
                          className="flex-1 min-w-[180px] py-2.5 px-5 bg-teal-600 hover:bg-teal-700 text-white font-bold text-base rounded-xl flex items-center justify-center gap-2 transition disabled:opacity-50"
                        >
                          <Check className="w-5 h-5" />
                          <span>{t.btnApprove}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDecline(sug.id)}
                          disabled={processingId === sug.id}
                          className="py-2.5 px-5 bg-sand-100 hover:bg-red-50 border border-sand-300 hover:border-red-300 text-red-700 font-bold text-base rounded-xl flex items-center gap-2 transition disabled:opacity-50"
                        >
                          <X className="w-5 h-5" />
                          <span>{t.btnDecline}</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-stone-500">
                      The elder will see this proposal on their dashboard to approve or decline.
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Past Reviewed Suggestions */}
      {pastList.length > 0 && (
        <section className="pt-6 border-t border-sand-200 space-y-4">
          <h4 className="text-lg font-bold text-stone-700">Past Decisions ({pastList.length})</h4>
          <div className="space-y-2.5">
            {pastList.map(sug => {
              const info = describeSuggestion(sug);
              const approved = sug.status === 'approved';
              return (
                <div
                  key={sug.id}
                  className="card bg-sand-50 border border-sand-200 rounded-xl p-4 flex items-center justify-between gap-4 text-sm"
                >
                  <div className="min-w-0">
                    <span className="font-bold text-stone-900 block truncate">
                      {info.title} {info.dosage ? `(${info.dosage})` : ''}
                    </span>
                    <span className="text-stone-500 text-xs block mt-0.5">
                      Suggested by {sug.proposedByName} &middot; {sug.reviewNotes || 'Reviewed'}
                    </span>
                  </div>
                  <span
                    className={`inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide whitespace-nowrap shrink-0 ${
                      approved ? 'text-teal-700' : 'text-red-700'
                    }`}
                  >
                    <span
                      className={`w-2 h-2 rounded-full ${approved ? 'bg-teal-600' : 'bg-red-600'}`}
                      aria-hidden="true"
                    />
                    {sug.status}
                  </span>
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
};
