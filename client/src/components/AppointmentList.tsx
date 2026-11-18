import React, { useState, useEffect } from 'react';
import { api } from '../api/client.js';
import { useLanguage } from '../context/LanguageContext.js';
import { useToast } from '../context/ToastContext.js';
import {
  Calendar,
  Clock,
  MapPin,
  Download,
  Plus,
  Car,
  CheckCircle,
  Trash2,
  X,
  Pencil,
  Search,
  Check,
} from 'lucide-react';

interface AppointmentListProps {
  upcoming: any[];
  past: any[];
  onRefresh: () => void;
  userRole?: string;
}

function toLocalDateTimeInput(iso?: string) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export const AppointmentList: React.FC<AppointmentListProps> = ({
  upcoming,
  past,
  onRefresh,
  userRole,
}) => {
  const { t } = useLanguage();
  const { success: toastSuccess, error: toastError, confirm } = useToast();

  const [activeTab, setActiveTab] = useState<'upcoming' | 'past'>('upcoming');
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingApp, setEditingApp] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Form fields
  const [doctor, setDoctor] = useState('');
  const [specialty, setSpecialty] = useState('General Practice');
  const [location, setLocation] = useState('');
  const [dateTime, setDateTime] = useState('');
  const [purpose, setPurpose] = useState('');
  const [notes, setNotes] = useState('');
  const [transportNeeded, setTransportNeeded] = useState(false);

  const openCreateModal = () => {
    setEditingApp(null);
    setError(null);
    setDoctor('');
    setSpecialty('General Practice');
    setLocation('');
    setDateTime('');
    setPurpose('');
    setNotes('');
    setTransportNeeded(false);
    setIsModalOpen(true);
  };

  const openEditModal = (app: any) => {
    setEditingApp(app);
    setError(null);
    setDoctor(app.doctor || '');
    setSpecialty(app.specialty || 'General Practice');
    setLocation(app.location || '');
    setDateTime(toLocalDateTimeInput(app.dateTime));
    setPurpose(app.purpose || '');
    setNotes(app.notes || '');
    setTransportNeeded(Boolean(app.transportNeeded));
    setIsModalOpen(true);
  };

  useEffect(() => {
    if (!isModalOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsModalOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isModalOpen]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError(null);
      const payload = {
        doctor: doctor.trim(),
        specialty: specialty.trim() || 'General Practice',
        location: location.trim(),
        dateTime: new Date(dateTime).toISOString(),
        purpose: purpose.trim(),
        notes: notes.trim(),
        transportNeeded,
      };

      if (editingApp) {
        await api.updateAppointment(editingApp.id, payload);
        toastSuccess(`Updated appointment with ${payload.doctor}.`);
      } else {
        await api.createAppointment(payload);
        toastSuccess(`Scheduled appointment with ${payload.doctor}.`);
      }

      setIsModalOpen(false);
      setEditingApp(null);
      onRefresh();
    } catch (err: any) {
      setError(err?.message || 'Failed to save appointment');
    } finally {
      setLoading(false);
    }
  };

  const handleMarkCompleted = async (app: any) => {
    try {
      await api.updateAppointment(app.id, { status: 'completed' });
      toastSuccess(`Marked visit with ${app.doctor} as completed.`);
      onRefresh();
    } catch (err: any) {
      toastError(err?.message || 'Failed to update appointment');
    }
  };

  const handleDelete = async (id: string, doctorName: string) => {
    const confirmed = await confirm({
      title: `Cancel appointment with ${doctorName}?`,
      message: 'This removes the visit from your CareCircle schedule and stops upcoming reminders.',
      confirmLabel: 'Remove Appointment',
      tone: 'danger',
    });
    if (!confirmed) return;

    try {
      await api.deleteAppointment(id);
      toastSuccess(`Removed appointment with ${doctorName}.`);
      onRefresh();
    } catch (err: any) {
      toastError(err?.message || 'Failed to delete appointment');
    }
  };

  const handleDownloadIcs = async (app: any) => {
    try {
      setDownloadingId(app.id);
      await api.downloadAppointmentIcs(app.id);
      toastSuccess(`Downloaded calendar invite for ${app.doctor}.`);
    } catch (err: any) {
      toastError(err?.message || 'Could not export calendar invite');
    } finally {
      setDownloadingId(null);
    }
  };

  const rawList = activeTab === 'upcoming' ? upcoming : past;
  const q = searchQuery.trim().toLowerCase();
  const currentList = rawList.filter(
    app =>
      !q ||
      (app.doctor || '').toLowerCase().includes(q) ||
      (app.specialty || '').toLowerCase().includes(q) ||
      (app.location || '').toLowerCase().includes(q) ||
      (app.purpose || '').toLowerCase().includes(q)
  );

  return (
    <div className="space-y-6">
      {/* Top Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex rounded-xl bg-sand-100 p-1" role="tablist">
            <button
              type="button"
              onClick={() => setActiveTab('upcoming')}
              role="tab"
              aria-selected={activeTab === 'upcoming'}
              className={`min-h-0 px-4 py-2 rounded-lg text-sm font-bold transition tabular-nums ${
                activeTab === 'upcoming' ? 'bg-white text-teal-800 shadow-sm' : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              Upcoming ({upcoming.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('past')}
              role="tab"
              aria-selected={activeTab === 'past'}
              className={`min-h-0 px-4 py-2 rounded-lg text-sm font-bold transition tabular-nums ${
                activeTab === 'past' ? 'bg-white text-teal-800 shadow-sm' : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              Past Visits ({past.length})
            </button>
          </div>

          {rawList.length > 0 && (
            <div className="relative min-w-[210px]">
              <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="search"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search doctor or clinic..."
                aria-label="Search appointments"
                className="w-full pl-9 pr-3 py-2 rounded-xl border border-sand-300 text-sm"
              />
            </div>
          )}
        </div>

        {userRole !== 'FAMILY' && (
          <button
            type="button"
            onClick={openCreateModal}
            className="px-5 py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl shadow-gentle flex items-center gap-2 transition whitespace-nowrap shrink-0"
          >
            <Plus className="w-5 h-5" />
            <span>{t.btnScheduleAppointment}</span>
          </button>
        )}
      </div>

      {/* Appointment Cards */}
      {currentList.length === 0 ? (
        <div className="card bg-sand-50 border border-sand-200 rounded-2xl p-8 text-center">
          <Calendar className="w-10 h-10 text-teal-600 mx-auto mb-3" />
          <p className="text-lg font-bold text-stone-800">
            {searchQuery
              ? 'No appointments match your search.'
              : activeTab === 'upcoming'
              ? 'No upcoming doctor appointments.'
              : 'No past appointment history.'}
          </p>
          <p className="text-sm text-stone-600 mt-1">
            Keep track of visits, clinic locations, and ride coordination here.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {currentList.map(app => {
            const dateObj = new Date(app.dateTime);

            return (
              <div
                key={app.id}
                className="card bg-white border border-sand-200 rounded-2xl p-6 hover:border-teal-400 transition-colors flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="min-w-0">
                      <h3 className="text-xl font-extrabold text-stone-900 truncate">{app.doctor}</h3>
                      <span className="text-sm font-semibold text-teal-700">{app.specialty}</span>
                    </div>

                    {app.status === 'completed' ? (
                      <span className="inline-flex items-center gap-1.5 text-xs font-bold text-teal-700 whitespace-nowrap shrink-0">
                        <CheckCircle className="w-4 h-4 text-teal-600" />
                        <span>Completed</span>
                      </span>
                    ) : app.transportNeeded ? (
                      <span className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-800 whitespace-nowrap shrink-0">
                        <Car className="w-4 h-4 text-amber-600" />
                        <span>Ride needed</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-teal-800 whitespace-nowrap shrink-0">
                        <CheckCircle className="w-4 h-4 text-teal-600" />
                        <span>Transport set</span>
                      </span>
                    )}
                  </div>

                  <div className="text-sm text-stone-600 bg-sand-50 rounded-xl p-3.5 mb-4 space-y-2 border border-sand-200">
                    <p className="flex items-center gap-2 font-medium text-stone-800 tabular-nums">
                      <Clock className="w-4 h-4 text-teal-600 shrink-0" />
                      <span>
                        {dateObj.toLocaleDateString(undefined, {
                          weekday: 'short',
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}{' '}
                        at {dateObj.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </p>
                    <p className="flex items-start gap-2">
                      <MapPin className="w-4 h-4 text-teal-600 shrink-0 mt-0.5" />
                      <span>{app.location}</span>
                    </p>
                    <p>
                      <strong className="text-stone-800">Purpose:</strong> {app.purpose}
                    </p>
                    {app.notes && (
                      <p className="text-xs text-stone-500 pt-1">
                        <strong className="text-stone-700">Notes:</strong> {app.notes}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-sand-200">
                  <button
                    type="button"
                    onClick={() => handleDownloadIcs(app)}
                    disabled={downloadingId === app.id}
                    className="min-h-0 text-xs font-bold text-teal-800 bg-teal-50 hover:bg-teal-100 border border-teal-200 px-3 py-2 rounded-lg flex items-center gap-1.5 transition whitespace-nowrap disabled:opacity-50"
                    title="Download iCalendar file for Google or Apple Calendar"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>{downloadingId === app.id ? 'Downloading...' : 'Calendar (.ics)'}</span>
                  </button>

                  {userRole !== 'FAMILY' && (
                    <div className="flex items-center gap-1">
                      {activeTab === 'upcoming' && app.status === 'upcoming' && (
                        <button
                          type="button"
                          onClick={() => handleMarkCompleted(app)}
                          className="min-h-0 text-xs font-semibold text-teal-700 hover:bg-teal-50 px-2.5 py-2 rounded-lg transition flex items-center gap-1 whitespace-nowrap"
                          title="Mark visit as completed"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>Complete</span>
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => openEditModal(app)}
                        className="min-h-0 text-xs font-semibold text-stone-600 hover:text-teal-800 px-2.5 py-2 rounded-lg hover:bg-sand-100 transition flex items-center gap-1"
                        aria-label={`Edit appointment with ${app.doctor}`}
                      >
                        <Pencil className="w-3.5 h-3.5" />
                        <span>Edit</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(app.id, app.doctor)}
                        className="min-h-0 text-xs font-semibold text-stone-500 hover:text-red-700 p-2 rounded-lg hover:bg-red-50 transition"
                        title="Cancel Appointment"
                        aria-label={`Cancel appointment with ${app.doctor}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create / Edit Appointment Modal */}
      {isModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-stone-950/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto"
          role="dialog"
          aria-modal="true"
          aria-labelledby="appt-modal-title"
        >
          <div className="card bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-elevated border border-sand-200">
            <div className="flex items-center justify-between pb-3 border-b border-sand-200 mb-4">
              <h3 id="appt-modal-title" className="text-xl font-bold text-stone-900">
                {editingApp ? `Edit Appointment` : t.btnScheduleAppointment}
              </h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                aria-label="Close appointment dialog"
                className="min-h-0 p-1.5 rounded-lg text-stone-500 hover:text-stone-800 hover:bg-sand-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-800 p-3 rounded-xl mb-4 text-sm">
                {error}
              </div>
            )}

            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label htmlFor="appt-doctor" className="block text-sm font-bold text-stone-800 mb-1">
                  Doctor Name *
                </label>
                <input
                  id="appt-doctor"
                  type="text"
                  required
                  value={doctor}
                  onChange={e => setDoctor(e.target.value)}
                  placeholder="e.g. Dr. Sarah Jenkins"
                  className="w-full rounded-xl border border-sand-300 p-2.5 text-base"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="appt-specialty" className="block text-sm font-bold text-stone-800 mb-1">
                    Specialty
                  </label>
                  <input
                    id="appt-specialty"
                    type="text"
                    value={specialty}
                    onChange={e => setSpecialty(e.target.value)}
                    placeholder="e.g. Cardiology"
                    className="w-full rounded-xl border border-sand-300 p-2.5 text-base"
                  />
                </div>

                <div>
                  <label htmlFor="appt-datetime" className="block text-sm font-bold text-stone-800 mb-1">
                    Date &amp; Time *
                  </label>
                  <input
                    id="appt-datetime"
                    type="datetime-local"
                    required
                    value={dateTime}
                    onChange={e => setDateTime(e.target.value)}
                    className="w-full rounded-xl border border-sand-300 p-2.5 text-base font-mono"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="appt-location" className="block text-sm font-bold text-stone-800 mb-1">
                  Location / Clinic *
                </label>
                <input
                  id="appt-location"
                  type="text"
                  required
                  value={location}
                  onChange={e => setLocation(e.target.value)}
                  placeholder="e.g. Mercy Medical Center, Suite 402"
                  className="w-full rounded-xl border border-sand-300 p-2.5 text-base"
                />
              </div>

              <div>
                <label htmlFor="appt-purpose" className="block text-sm font-bold text-stone-800 mb-1">
                  Purpose of Visit *
                </label>
                <input
                  id="appt-purpose"
                  type="text"
                  required
                  value={purpose}
                  onChange={e => setPurpose(e.target.value)}
                  placeholder="e.g. Blood pressure review, annual checkup"
                  className="w-full rounded-xl border border-sand-300 p-2.5 text-base"
                />
              </div>

              <div>
                <label htmlFor="appt-notes" className="block text-sm font-bold text-stone-800 mb-1">
                  Special Notes
                </label>
                <textarea
                  id="appt-notes"
                  rows={2}
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="Items to bring, fasting required, questions to ask..."
                  className="w-full rounded-xl border border-sand-300 p-2.5 text-base"
                />
              </div>

              <div className="flex items-center gap-3 bg-sand-50 p-3.5 rounded-xl border border-sand-200">
                <input
                  type="checkbox"
                  id="transport"
                  checked={transportNeeded}
                  onChange={e => setTransportNeeded(e.target.checked)}
                  className="w-5 h-5 text-teal-600 rounded border-sand-300"
                />
                <label htmlFor="transport" className="text-sm font-bold text-stone-800 cursor-pointer">
                  Transport ride needed (flag to family and caretaker)
                </label>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-sand-200">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 font-bold text-stone-600 hover:bg-sand-100 rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-6 py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl transition disabled:opacity-50"
                >
                  {loading ? 'Saving...' : editingApp ? 'Save Changes' : 'Confirm Appointment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
