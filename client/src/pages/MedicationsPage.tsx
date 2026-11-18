import React, { useState, useEffect } from 'react';
import { api } from '../api/client.js';
import { useAuth } from '../context/AuthContext.js';
import { useLanguage } from '../context/LanguageContext.js';
import { TodayDoses } from '../components/TodayDoses.js';
import { MedicationList } from '../components/MedicationList.js';
import { AddMedicationModal } from '../components/AddMedicationModal.js';
import { Pill, Plus, Calendar, AlertCircle } from 'lucide-react';

export const MedicationsPage: React.FC = () => {
  const { session } = useAuth();
  const { t } = useLanguage();

  const [activeTab, setActiveTab] = useState<'today' | 'all'>('today');
  const [doses, setDoses] = useState<any[]>([]);
  const [medications, setMedications] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMedication, setEditingMedication] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [todayRes, medsRes] = await Promise.all([
        api.getTodayDoses(),
        api.getMedications(),
      ]);
      setDoses(todayRes.doses || []);
      setMedications(medsRes.medications || []);
    } catch (err: any) {
      setError(err?.message || 'Unable to load medications right now.');
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

  const openAddModal = () => {
    setEditingMedication(null);
    setIsModalOpen(true);
  };

  const openEditModal = (med: any) => {
    setEditingMedication(med);
    setIsModalOpen(true);
  };

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 space-y-6">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-6 border-b border-sand-200">
        <div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-stone-900">
            {t.navMedications}
          </h1>
          <p className="text-stone-600 font-medium mt-1">
            Track daily schedules, log administered doses, and manage prescription stock.
          </p>
        </div>

        <button
          type="button"
          onClick={openAddModal}
          className="px-5 py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl shadow-gentle flex items-center gap-2 transition whitespace-nowrap shrink-0"
        >
          <Plus className="w-5 h-5" />
          <span>{t.btnAddMedication}</span>
        </button>
      </div>

      {error && (
        <div className="bg-amber-50 border border-amber-300 text-amber-900 p-4 rounded-2xl flex items-center justify-between gap-4 text-sm">
          <div className="flex items-center gap-2.5">
            <AlertCircle className="w-5 h-5 text-amber-700 shrink-0" />
            <span>{error}</span>
          </div>
          <button
            type="button"
            onClick={fetchData}
            className="min-h-0 px-3 py-1.5 rounded-lg bg-amber-600 text-white font-semibold hover:bg-amber-700 transition"
          >
            Retry
          </button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex rounded-xl bg-sand-100 p-1 w-fit" role="tablist">
        <button
          type="button"
          onClick={() => setActiveTab('today')}
          role="tab"
          aria-selected={activeTab === 'today'}
          className={`min-h-0 px-5 py-2 rounded-lg text-sm font-bold transition flex items-center gap-2 tabular-nums ${
            activeTab === 'today' ? 'bg-white text-teal-800 shadow-sm' : 'text-stone-600 hover:text-stone-900'
          }`}
        >
          <Calendar className="w-4 h-4" />
          <span>Today&apos;s Doses ({doses.length})</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('all')}
          role="tab"
          aria-selected={activeTab === 'all'}
          className={`min-h-0 px-5 py-2 rounded-lg text-sm font-bold transition flex items-center gap-2 tabular-nums ${
            activeTab === 'all' ? 'bg-white text-teal-800 shadow-sm' : 'text-stone-600 hover:text-stone-900'
          }`}
        >
          <Pill className="w-4 h-4" />
          <span>All Medications ({medications.length})</span>
        </button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-44 rounded-2xl bg-sand-200/70 animate-pulse" />
          ))}
        </div>
      ) : activeTab === 'today' ? (
        <TodayDoses doses={doses} onMarkDose={handleMarkDose} />
      ) : (
        <MedicationList
          medications={medications}
          onRefresh={fetchData}
          onEdit={openEditModal}
          userRole={session?.role}
        />
      )}

      <AddMedicationModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingMedication(null);
        }}
        onSuccess={fetchData}
        userRole={session?.role}
        editingMedication={editingMedication}
      />
    </div>
  );
};
