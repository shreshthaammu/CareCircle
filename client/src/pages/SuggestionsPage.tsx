import React, { useState, useEffect } from 'react';
import { api } from '../api/client.js';
import { useAuth } from '../context/AuthContext.js';
import { SuggestionsList } from '../components/SuggestionsList.js';
import { AlertCircle } from 'lucide-react';

export const SuggestionsPage: React.FC = () => {
  const { session } = useAuth();
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchSuggestions = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.getSuggestions();
      setSuggestions(res.suggestions || []);
    } catch (err: any) {
      setError(err?.message || 'Unable to load care suggestions right now.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSuggestions();
  }, []);

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 space-y-6">
      <div className="pb-6 border-b border-sand-200">
        <h1 className="text-3xl sm:text-4xl font-extrabold text-stone-900">
          Care Circle Suggestions &amp; Consent
        </h1>
        <p className="text-stone-600 font-medium mt-1">
          Review medication proposals submitted by caretakers and family members.
        </p>
      </div>

      {error && (
        <div className="bg-amber-50 border border-amber-300 text-amber-900 p-4 rounded-2xl flex items-center justify-between gap-4 text-sm">
          <div className="flex items-center gap-2.5">
            <AlertCircle className="w-5 h-5 text-amber-700 shrink-0" />
            <span>{error}</span>
          </div>
          <button
            type="button"
            onClick={fetchSuggestions}
            className="min-h-0 px-3 py-1.5 rounded-lg bg-amber-600 text-white font-semibold hover:bg-amber-700 transition"
          >
            Retry
          </button>
        </div>
      )}

      {loading ? (
        <div className="space-y-4">
          {[1, 2].map(i => (
            <div key={i} className="h-44 rounded-2xl bg-sand-200/70 animate-pulse" />
          ))}
        </div>
      ) : (
        <SuggestionsList
          suggestions={suggestions}
          userRole={session?.role}
          onRefresh={fetchSuggestions}
        />
      )}
    </div>
  );
};
