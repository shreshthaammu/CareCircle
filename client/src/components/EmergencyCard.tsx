import React, { useState, useEffect } from 'react';
import { Printer, Heart, Phone, AlertCircle, Pencil, Check } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext.js';

interface EmergencyCardProps {
  elderName: string;
  circleCode: string;
  emergencyContacts: Array<{ name: string; relation: string; phone: string }>;
  medications: any[];
  doctorAppointments: any[];
}

export const EmergencyCard: React.FC<EmergencyCardProps> = ({
  elderName,
  circleCode,
  emergencyContacts,
  medications,
  doctorAppointments,
}) => {
  const { t } = useLanguage();
  const storageKey = `carecircle_emergency_notes_${circleCode}`;

  const [allergiesNote, setAllergiesNote] = useState('Penicillin (Mild rash) • No known food allergies.');
  const [hospitalNote, setHospitalNote] = useState('Mercy General Hospital & Regional Cardiac Center');
  const [editingNotes, setEditingNotes] = useState(false);

  useEffect(() => {
    try {
      const saved = typeof window !== 'undefined' ? window.localStorage.getItem(storageKey) : null;
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.allergiesNote) setAllergiesNote(parsed.allergiesNote);
        if (parsed.hospitalNote) setHospitalNote(parsed.hospitalNote);
      }
    } catch {
      // Ignore storage errors in isolated test/sandbox environments
    }
  }, [storageKey]);

  const handleSaveNotes = () => {
    try {
      window.localStorage.setItem(
        storageKey,
        JSON.stringify({ allergiesNote, hospitalNote })
      );
    } catch {
      // Ignore storage errors
    }
    setEditingNotes(false);
  };

  const handlePrint = () => {
    window.print();
  };

  const primaryDoctor = doctorAppointments[0] || null;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Action Bar (Hidden when printing) */}
      <div className="no-print card flex flex-wrap items-center justify-between gap-4 bg-sand-50 border border-sand-200 rounded-2xl p-4 sm:p-5">
        <div>
          <h2 className="text-xl font-extrabold text-stone-900">Printable Medical Emergency Card</h2>
          <p className="text-sm text-stone-600">
            Keep a physical copy in a wallet, on the refrigerator, or in the car glove box.
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => (editingNotes ? handleSaveNotes() : setEditingNotes(true))}
            className="px-4 py-2.5 bg-white hover:bg-sand-100 border border-sand-300 text-stone-800 font-bold text-sm rounded-xl flex items-center gap-1.5 transition whitespace-nowrap"
          >
            {editingNotes ? <Check className="w-4 h-4 text-teal-700" /> : <Pencil className="w-4 h-4" />}
            <span>{editingNotes ? 'Save Notes' : 'Edit Notes'}</span>
          </button>
          <button
            type="button"
            onClick={handlePrint}
            className="px-5 py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-bold text-sm rounded-xl flex items-center gap-2 transition whitespace-nowrap"
          >
            <Printer className="w-4 h-4" />
            <span>{t.btnPrint}</span>
          </button>
        </div>
      </div>

      {/* Printable Sheet */}
      <div className="card bg-white border-4 border-stone-800 rounded-3xl p-6 sm:p-10 text-stone-900 font-sans print:border-2 print:p-4">
        {/* Header */}
        <div className="border-b-4 border-red-600 pb-4 mb-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-red-600 font-extrabold text-lg sm:text-xl tracking-wider uppercase mb-1">
              <AlertCircle className="w-6 h-6" />
              <span>Medical Emergency Card &middot; CareCircle</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-stone-900">{elderName}</h1>
          </div>
          <div className="text-right">
            <span className="text-xs font-bold text-stone-500 uppercase block">Circle ID</span>
            <span className="text-2xl font-mono font-extrabold tracking-widest text-teal-800">
              {circleCode}
            </span>
          </div>
        </div>

        {/* Emergency Contacts Grid */}
        <div className="mb-6">
          <h2 className="text-base font-extrabold uppercase text-stone-800 tracking-wider mb-3 flex items-center gap-1.5 border-b border-stone-300 pb-1">
            <Phone className="w-5 h-5 text-red-600" />
            <span>Emergency Contacts &amp; Physicians</span>
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {emergencyContacts.map((contact, idx) => (
              <div key={idx} className="bg-sand-50 border-2 border-stone-300 rounded-xl p-3.5">
                <span className="text-xs uppercase font-bold text-stone-500 block">{contact.relation}</span>
                <span className="text-base font-extrabold text-stone-900 block mt-0.5">{contact.name}</span>
                <span className="text-lg font-mono font-extrabold text-teal-800 block mt-1 tabular-nums">
                  {contact.phone}
                </span>
              </div>
            ))}
            {primaryDoctor && (
              <div className="bg-sand-50 border-2 border-stone-300 rounded-xl p-3.5">
                <span className="text-xs uppercase font-bold text-stone-500 block">Primary Physician</span>
                <span className="text-base font-extrabold text-stone-900 block mt-0.5">
                  {primaryDoctor.doctor}
                </span>
                <span className="text-xs text-stone-600 block mt-1">{primaryDoctor.location}</span>
              </div>
            )}
          </div>
        </div>

        {/* Active Medications Table */}
        <div className="mb-6">
          <h2 className="text-base font-extrabold uppercase text-stone-800 tracking-wider mb-3 flex items-center gap-1.5 border-b border-stone-300 pb-1">
            <Heart className="w-5 h-5 text-teal-600" />
            <span>Active Medications ({medications.length})</span>
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b-2 border-stone-400 font-extrabold text-stone-700 text-xs uppercase">
                  <th className="py-2 px-2">Medication</th>
                  <th className="py-2 px-2">Dosage</th>
                  <th className="py-2 px-2">Schedule</th>
                  <th className="py-2 px-2">Instructions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-200">
                {medications.map(med => (
                  <tr key={med.id}>
                    <td className="py-2.5 px-2 font-extrabold text-stone-900">
                      {med.name || med.medicationName}
                    </td>
                    <td className="py-2.5 px-2 font-semibold text-stone-700">
                      {med.dosage} ({med.form})
                    </td>
                    <td className="py-2.5 px-2 text-stone-800 font-medium tabular-nums">
                      {med.schedule?.times?.join(', ') || med.scheduledTime || 'Daily'}
                    </td>
                    <td className="py-2.5 px-2 text-stone-600">{med.instructions}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Medical Notes & Allergies */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t-2 border-stone-300 text-sm">
          <div className="bg-sand-50 p-3.5 rounded-xl border border-stone-200">
            <span className="font-extrabold uppercase text-xs text-stone-600 block mb-1">
              Allergies / Critical Notes
            </span>
            {editingNotes ? (
              <textarea
                rows={2}
                value={allergiesNote}
                onChange={e => setAllergiesNote(e.target.value)}
                className="w-full rounded-lg border border-stone-300 p-2 text-sm"
              />
            ) : (
              <p className="text-stone-800 font-medium">{allergiesNote}</p>
            )}
          </div>
          <div className="bg-sand-50 p-3.5 rounded-xl border border-stone-200">
            <span className="font-extrabold uppercase text-xs text-stone-600 block mb-1">
              Hospital of Choice
            </span>
            {editingNotes ? (
              <textarea
                rows={2}
                value={hospitalNote}
                onChange={e => setHospitalNote(e.target.value)}
                className="w-full rounded-lg border border-stone-300 p-2 text-sm"
              />
            ) : (
              <p className="text-stone-800 font-medium">{hospitalNote}</p>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 pt-4 border-t-2 border-stone-300 text-xs text-stone-500 flex flex-wrap items-center justify-between gap-2 tabular-nums">
          <span>CareCircle Health Management</span>
          <span>Printed on {new Date().toLocaleDateString()}</span>
        </div>
      </div>
    </div>
  );
};
