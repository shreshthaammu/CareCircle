import React, { useState, useEffect } from 'react';
import { api } from '../api/client.js';
import { useLanguage } from '../context/LanguageContext.js';
import { useToast } from '../context/ToastContext.js';
import { useVoiceInput } from '../hooks/useVoiceInput.js';
import { X, Upload, Mic, MicOff, Sparkles, AlertCircle, Check, ShieldCheck } from 'lucide-react';

interface AddMedicationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  userRole?: string;
  editingMedication?: any | null;
}

export const AddMedicationModal: React.FC<AddMedicationModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  userRole,
  editingMedication = null,
}) => {
  const { t } = useLanguage();
  const { success: toastSuccess, info: toastInfo } = useToast();
  const isEditing = Boolean(editingMedication?.id);

  const [activeTab, setActiveTab] = useState<'manual' | 'scan' | 'nlp'>('manual');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  // Form fields
  const [name, setName] = useState('');
  const [dosage, setDosage] = useState('');
  const [form, setForm] = useState('Tablet');
  const [instructions, setInstructions] = useState('Take with water after meals');
  const [times, setTimes] = useState<string[]>(['08:00']);
  const [daysOfWeek, setDaysOfWeek] = useState<number[]>([0, 1, 2, 3, 4, 5, 6]);
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState('');
  const [stockCount, setStockCount] = useState(30);
  const [refillThreshold, setRefillThreshold] = useState(7);
  const [notes, setNotes] = useState('');

  // AI Scanner & NLP state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [scannerResults, setScannerResults] = useState<any[]>([]);
  const [nlpText, setNlpText] = useState('');

  const { isListening, isSupported, startListening } = useVoiceInput(text => {
    setNlpText(prev => (prev ? `${prev} ${text}` : text));
  });

  // Synchronize form state on modal open or when switching between Add / Edit targets
  useEffect(() => {
    if (!isOpen) return;

    setError(null);
    setFeedbackMessage(null);
    setActiveTab('manual');
    setSelectedFile(null);
    setScannerResults([]);
    setNlpText('');

    if (editingMedication) {
      setName(editingMedication.name || '');
      setDosage(editingMedication.dosage || '');
      setForm(editingMedication.form || 'Tablet');
      setInstructions(editingMedication.instructions || 'Take with water after meals');
      setTimes(
        editingMedication.schedule?.times?.length > 0
          ? [...editingMedication.schedule.times]
          : ['08:00']
      );
      setDaysOfWeek(
        editingMedication.schedule?.daysOfWeek?.length > 0
          ? [...editingMedication.schedule.daysOfWeek]
          : [0, 1, 2, 3, 4, 5, 6]
      );
      setStartDate(
        editingMedication.schedule?.startDate || new Date().toISOString().split('T')[0]
      );
      setEndDate(editingMedication.schedule?.endDate || '');
      setStockCount(editingMedication.stockCount ?? 30);
      setRefillThreshold(editingMedication.refillThreshold ?? 7);
      setNotes(editingMedication.notes || '');
    } else {
      setName('');
      setDosage('');
      setForm('Tablet');
      setInstructions('Take with water after meals');
      setTimes(['08:00']);
      setDaysOfWeek([0, 1, 2, 3, 4, 5, 6]);
      setStartDate(new Date().toISOString().split('T')[0]);
      setEndDate('');
      setStockCount(30);
      setRefillThreshold(7);
      setNotes('');
    }
  }, [isOpen, editingMedication]);

  // Escape key dismissal
  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleAddTimeToSchedule = () => {
    const candidates = ['08:00', '13:00', '20:00', '21:30'];
    const next = candidates.find(c => !times.includes(c)) || '12:00';
    setTimes(prev => (prev.includes(next) ? prev : [...prev, next]));
  };

  const handleRemoveTime = (index: number) => {
    setTimes(prev => prev.filter((_, i) => i !== index));
  };

  const handleUpdateTime = (index: number, val: string) => {
    setTimes(prev => prev.map((item, i) => (i === index ? val : item)));
  };

  const handleToggleDay = (day: number) => {
    setDaysOfWeek(prev =>
      prev.includes(day)
        ? prev.length > 1
          ? prev.filter(d => d !== day)
          : prev
        : [...prev, day].sort((a, b) => a - b)
    );
  };

  const handleScanPrescription = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) {
      setError('Please select an image file first.');
      return;
    }
    try {
      setLoading(true);
      setError(null);
      const res = await api.scanPrescription(selectedFile);
      setScannerResults(res.medications || []);
      if (res.isSimulated || res.medications.length === 0) {
        setFeedbackMessage(res.disclaimer);
      } else {
        setFeedbackMessage('Image processed. Review each extracted detail before saving.');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to scan prescription image');
    } finally {
      setLoading(false);
    }
  };

  const handleApplyScannedMed = (scanned: any) => {
    setName(scanned.name || '');
    setDosage(scanned.dosage || '');
    setForm(scanned.form || 'Tablet');
    setInstructions(scanned.instructions || 'Take as directed');
    if (scanned.suggestedTimes && scanned.suggestedTimes.length > 0) {
      setTimes(Array.from(new Set(scanned.suggestedTimes)));
    }
    if (scanned.stockCount) {
      setStockCount(scanned.stockCount);
    }
    setActiveTab('manual');
    setFeedbackMessage('Details applied to form. Review and click Save.');
  };

  const handleParseNlp = async () => {
    if (!nlpText.trim()) return;
    try {
      setLoading(true);
      setError(null);
      const res = await api.parseSchedule(nlpText);
      const draft = res.draft;
      if (draft) {
        if (draft.name) setName(draft.name);
        if (draft.dosage) setDosage(draft.dosage);
        if (draft.form) setForm(draft.form);
        if (draft.instructions) setInstructions(draft.instructions);
        if (draft.times && draft.times.length > 0) setTimes(Array.from(new Set(draft.times)));
        if (draft.daysOfWeek) setDaysOfWeek(draft.daysOfWeek);
        if (draft.notes) setNotes(draft.notes);
        setActiveTab('manual');
        setFeedbackMessage(
          res.isSimulated
            ? 'Draft prepared using local heuristics. Please verify every field before saving.'
            : 'Draft generated. Please verify every field before saving.'
        );
      }
    } catch (err: any) {
      setError(err.message || 'Failed to parse schedule text');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const uniqueTimes = Array.from(new Set(times.filter(Boolean)));
    if (uniqueTimes.length === 0) {
      setError('Please include at least one scheduled time.');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const payload = {
        name: name.trim(),
        dosage: dosage.trim(),
        form,
        instructions: instructions.trim(),
        schedule: {
          times: uniqueTimes,
          daysOfWeek,
          startDate,
          endDate: endDate ? endDate : undefined,
        },
        stockCount: Number(stockCount),
        refillThreshold: Number(refillThreshold),
        notes: notes.trim(),
      };

      const res = isEditing
        ? await api.updateMedication(editingMedication.id, payload)
        : await api.createMedication(payload);

      if (res.isSuggestion) {
        toastInfo('Submitted as a suggestion awaiting Elder consent.');
      } else {
        toastSuccess(isEditing ? `Updated ${payload.name}.` : `Added ${payload.name} to active medications.`);
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to save medication');
    } finally {
      setLoading(false);
    }
  };

  const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div
      className="fixed inset-0 z-50 bg-stone-950/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div className="card bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 sm:p-8 shadow-elevated border border-sand-200">
        {/* Header */}
        <div className="flex items-start justify-between pb-4 border-b border-sand-200 mb-6 gap-4">
          <div>
            <h2 id="modal-title" className="text-2xl font-extrabold text-stone-900">
              {isEditing ? `Edit ${editingMedication.name}` : t.btnAddMedication}
            </h2>
            {userRole && userRole !== 'ELDER' && (
              <p className="text-xs font-semibold text-amber-800 mt-1">
                Consent Mode: Proposals may be sent to the Elder for review before taking effect.
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="min-h-0 p-2 rounded-xl text-stone-500 hover:text-stone-800 hover:bg-sand-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mode Tabs (hidden when editing an existing medication) */}
        {!isEditing && (
          <div className="flex rounded-xl bg-sand-100 p-1 mb-6" role="tablist">
            <button
              type="button"
              onClick={() => setActiveTab('manual')}
              role="tab"
              aria-selected={activeTab === 'manual'}
              className={`min-h-0 flex-1 py-2.5 rounded-lg text-sm font-bold transition ${
                activeTab === 'manual' ? 'bg-white text-teal-800 shadow-sm' : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              Manual Entry
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('scan')}
              role="tab"
              aria-selected={activeTab === 'scan'}
              className={`min-h-0 flex-1 py-2.5 rounded-lg text-sm font-bold transition flex items-center justify-center gap-1.5 ${
                activeTab === 'scan' ? 'bg-white text-teal-800 shadow-sm' : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              <Sparkles className="w-4 h-4 text-teal-600" />
              <span>AI Scanner</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('nlp')}
              role="tab"
              aria-selected={activeTab === 'nlp'}
              className={`min-h-0 flex-1 py-2.5 rounded-lg text-sm font-bold transition flex items-center justify-center gap-1.5 ${
                activeTab === 'nlp' ? 'bg-white text-teal-800 shadow-sm' : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              <Mic className="w-4 h-4 text-accent-500" />
              <span>Voice / Draft</span>
            </button>
          </div>
        )}

        {feedbackMessage && (
          <div className="bg-teal-50 border border-teal-300 text-teal-900 p-3 rounded-xl mb-4 text-sm flex items-center gap-2">
            <Check className="w-4 h-4 text-teal-600 shrink-0" />
            <span>{feedbackMessage}</span>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-300 text-red-800 p-3 rounded-xl mb-4 text-sm flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Tab 2: Prescription Scanner */}
        {activeTab === 'scan' && !isEditing && (
          <div className="space-y-6">
            <div className="border-2 border-dashed border-teal-300 rounded-2xl p-6 text-center bg-teal-50/50">
              <Upload className="w-10 h-10 text-teal-600 mx-auto mb-3" />
              <h3 className="text-lg font-bold text-teal-950 mb-1">Upload Prescription or Medicine Strip</h3>
              <p className="text-sm text-stone-600 mb-4">
                Extracts medicines, dosages, and suggested timings for your review.
              </p>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={e => setSelectedFile(e.target.files?.[0] || null)}
                className="block mx-auto text-sm text-stone-600 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-bold file:bg-teal-600 file:text-white hover:file:bg-teal-700 cursor-pointer"
              />
              <button
                type="button"
                onClick={handleScanPrescription}
                disabled={loading || !selectedFile}
                className="mt-4 px-6 py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl transition disabled:opacity-50"
              >
                {loading ? 'Analyzing image...' : 'Extract Medicines'}
              </button>
            </div>

            {scannerResults.length > 0 && (
              <div className="space-y-3">
                <h4 className="font-bold text-stone-800">Detected Medicines</h4>
                {scannerResults.map((med, idx) => (
                  <div
                    key={idx}
                    className="bg-sand-50 border border-sand-200 rounded-xl p-4 flex items-center justify-between gap-4"
                  >
                    <div>
                      <span className="font-extrabold text-stone-900 block">
                        {med.name} ({med.dosage})
                      </span>
                      <span className="text-xs text-stone-600 block">{med.instructions}</span>
                      <span className="text-xs text-stone-500">
                        Form: {med.form} &middot; Suggested: {med.suggestedTimes?.join(', ') || 'N/A'}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleApplyScannedMed(med)}
                      className="px-4 py-2 bg-teal-600 text-white font-bold text-sm rounded-lg hover:bg-teal-700 transition whitespace-nowrap shrink-0"
                    >
                      Use Details
                    </button>
                  </div>
                ))}
              </div>
            )}

            <p className="text-xs text-stone-500 bg-sand-50 p-3 rounded-xl border border-sand-200 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-teal-700 shrink-0" />
              <span>{t.aiDisclaimer}</span>
            </p>
          </div>
        )}

        {/* Tab 3: Natural Language / Voice Entry */}
        {activeTab === 'nlp' && !isEditing && (
          <div className="space-y-5">
            <div>
              <label htmlFor="nlp-text" className="block text-sm font-bold text-stone-800 mb-2">
                Describe the Medication Schedule
              </label>
              <textarea
                id="nlp-text"
                rows={3}
                value={nlpText}
                onChange={e => setNlpText(e.target.value)}
                placeholder="e.g. Metformin 500mg tablet twice daily after breakfast and dinner for 60 days"
                className="w-full rounded-xl border border-sand-300 p-3 text-base"
              />
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {isSupported && (
                <button
                  type="button"
                  onClick={startListening}
                  className={`px-4 py-2.5 rounded-xl font-bold flex items-center gap-2 transition ${
                    isListening
                      ? 'bg-red-600 text-white'
                      : 'bg-sand-200 hover:bg-sand-300 text-stone-800'
                  }`}
                >
                  {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5 text-accent-600" />}
                  <span>{isListening ? 'Listening...' : 'Voice Dictation'}</span>
                </button>
              )}
              <button
                type="button"
                onClick={handleParseNlp}
                disabled={loading || !nlpText.trim()}
                className="px-5 py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl transition disabled:opacity-50 flex items-center gap-2"
              >
                <Sparkles className="w-4 h-4" />
                <span>{loading ? 'Parsing...' : 'Convert to Schedule'}</span>
              </button>
            </div>

            <p className="text-xs text-stone-500 bg-sand-50 p-3 rounded-xl border border-sand-200 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-teal-700 shrink-0" />
              <span>{t.aiDisclaimer}</span>
            </p>
          </div>
        )}

        {/* Tab 1: Manual / Edit Form */}
        {activeTab === 'manual' && (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="med-name" className="block text-sm font-bold text-stone-800 mb-1">
                  Medication Name *
                </label>
                <input
                  id="med-name"
                  type="text"
                  required
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="e.g. Metformin"
                  className="w-full rounded-xl border border-sand-300 p-2.5 text-base"
                />
              </div>

              <div>
                <label htmlFor="med-dosage" className="block text-sm font-bold text-stone-800 mb-1">
                  Dosage *
                </label>
                <input
                  id="med-dosage"
                  type="text"
                  required
                  value={dosage}
                  onChange={e => setDosage(e.target.value)}
                  placeholder="e.g. 500mg"
                  className="w-full rounded-xl border border-sand-300 p-2.5 text-base"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="med-form" className="block text-sm font-bold text-stone-800 mb-1">
                  Form
                </label>
                <select
                  id="med-form"
                  value={form}
                  onChange={e => setForm(e.target.value)}
                  className="w-full rounded-xl border border-sand-300 p-2.5 text-base"
                >
                  <option value="Tablet">Tablet</option>
                  <option value="Capsule">Capsule</option>
                  <option value="Liquid">Liquid / Syrup</option>
                  <option value="Drops">Eye/Ear Drops</option>
                  <option value="Inhaler">Inhaler</option>
                  <option value="Injection">Injection</option>
                  <option value="Patch">Transdermal Patch</option>
                </select>
              </div>

              <div>
                <label htmlFor="med-instructions" className="block text-sm font-bold text-stone-800 mb-1">
                  Instructions
                </label>
                <input
                  id="med-instructions"
                  type="text"
                  value={instructions}
                  onChange={e => setInstructions(e.target.value)}
                  placeholder="e.g. Take with breakfast"
                  className="w-full rounded-xl border border-sand-300 p-2.5 text-base"
                />
              </div>
            </div>

            {/* Scheduled Times */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-sm font-bold text-stone-800">Scheduled Daily Times</label>
                <button
                  type="button"
                  onClick={handleAddTimeToSchedule}
                  className="min-h-0 text-xs font-bold text-teal-700 hover:text-teal-900"
                >
                  + Add another time
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {times.map((time, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-1 bg-sand-100 px-2 py-1 rounded-xl border border-sand-300"
                  >
                    <input
                      type="time"
                      value={time}
                      onChange={e => handleUpdateTime(idx, e.target.value)}
                      className="min-h-0 bg-transparent border-0 text-sm font-bold font-mono px-1"
                    />
                    {times.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveTime(idx)}
                        className="min-h-0 text-stone-500 hover:text-red-600 px-1 font-bold"
                        aria-label="Remove time"
                      >
                        &times;
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Days of Week with quick presets */}
            <div>
              <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
                <label className="block text-sm font-bold text-stone-800">Days of Week</label>
                <div className="flex items-center gap-2 text-xs font-semibold">
                  <button
                    type="button"
                    onClick={() => setDaysOfWeek([0, 1, 2, 3, 4, 5, 6])}
                    className="min-h-0 text-teal-700 hover:underline"
                  >
                    Every day
                  </button>
                  <span className="text-stone-300">&middot;</span>
                  <button
                    type="button"
                    onClick={() => setDaysOfWeek([1, 2, 3, 4, 5])}
                    className="min-h-0 text-teal-700 hover:underline"
                  >
                    Weekdays
                  </button>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {dayLabels.map((lbl, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleToggleDay(idx)}
                    aria-pressed={daysOfWeek.includes(idx)}
                    className={`min-h-0 w-10 h-10 rounded-xl font-bold text-xs transition ${
                      daysOfWeek.includes(idx)
                        ? 'bg-teal-600 text-white'
                        : 'bg-sand-100 text-stone-600 hover:bg-sand-200 border border-sand-200'
                    }`}
                  >
                    {lbl}
                  </button>
                ))}
              </div>
            </div>

            {/* Schedule Dates */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="med-start-date" className="block text-sm font-bold text-stone-800 mb-1">
                  Start Date
                </label>
                <input
                  id="med-start-date"
                  type="date"
                  value={startDate}
                  onChange={e => setStartDate(e.target.value)}
                  className="w-full rounded-xl border border-sand-300 p-2.5 text-base font-mono"
                />
              </div>

              <div>
                <label htmlFor="med-end-date" className="block text-sm font-bold text-stone-800 mb-1">
                  End Date (Optional)
                </label>
                <input
                  id="med-end-date"
                  type="date"
                  value={endDate}
                  onChange={e => setEndDate(e.target.value)}
                  className="w-full rounded-xl border border-sand-300 p-2.5 text-base font-mono"
                />
              </div>
            </div>

            {/* Stock and Threshold */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="med-stock" className="block text-sm font-bold text-stone-800 mb-1">
                  Current Stock
                </label>
                <input
                  id="med-stock"
                  type="number"
                  min="0"
                  value={stockCount}
                  onChange={e => setStockCount(Number(e.target.value))}
                  className="w-full rounded-xl border border-sand-300 p-2.5 text-base tabular-nums"
                />
              </div>

              <div>
                <label htmlFor="med-threshold" className="block text-sm font-bold text-stone-800 mb-1">
                  Refill Alert Threshold
                </label>
                <input
                  id="med-threshold"
                  type="number"
                  min="0"
                  value={refillThreshold}
                  onChange={e => setRefillThreshold(Number(e.target.value))}
                  className="w-full rounded-xl border border-sand-300 p-2.5 text-base tabular-nums"
                />
              </div>
            </div>

            {/* Notes */}
            <div>
              <label htmlFor="med-notes" className="block text-sm font-bold text-stone-800 mb-1">
                Notes
              </label>
              <textarea
                id="med-notes"
                rows={2}
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Doctor's advice, purpose, special storage..."
                className="w-full rounded-xl border border-sand-300 p-2.5 text-base"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-sand-200">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 rounded-xl font-bold text-stone-600 hover:bg-sand-100 transition"
              >
                {t.btnCancel}
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl transition disabled:opacity-50"
              >
                {loading ? 'Saving...' : isEditing ? 'Update Medication' : t.btnSave}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
