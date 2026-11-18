import React, { useState, useEffect } from 'react';
import { api } from '../api/client.js';
import { useAuth } from '../context/AuthContext.js';
import { ElderFirstMode } from '../components/ElderFirstMode.js';
import { Lock } from 'lucide-react';

export const ElderModePage: React.FC = () => {
  const { session } = useAuth();
  const [doses, setDoses] = useState<any[]>([]);
  const [nextAppointment, setNextAppointment] = useState<any | null>(null);
  const [emergencyContacts, setEmergencyContacts] = useState<any[]>([]);
  const [restrictedSections, setRestrictedSections] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [dosesRes, apptsRes, settingsRes] = await Promise.allSettled([
        api.getTodayDoses(),
        api.getAppointments(),
        api.getSettings(),
      ]);

      const restricted: string[] = [];

      if (dosesRes.status === 'fulfilled') {
        setDoses(dosesRes.value.doses || []);
      } else {
        restricted.push('medications');
        setDoses([]);
      }

      if (apptsRes.status === 'fulfilled') {
        setNextAppointment(apptsRes.value.upcoming?.[0] || null);
      } else {
        restricted.push('appointments');
        setNextAppointment(null);
      }

      if (settingsRes.status === 'fulfilled') {
        setEmergencyContacts(settingsRes.value.settings?.emergencyContacts || []);
      } else {
        setEmergencyContacts([]);
      }

      setRestrictedSections(restricted);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleMarkDose = async (doseId: string, status: 'taken' | 'snoozed') => {
    await api.markDoseStatus(doseId, status, 15);
    await fetchData();
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto py-10 px-4 space-y-6">
        <div className="h-32 rounded-2xl bg-sand-200/70 animate-pulse" />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-20 rounded-2xl bg-sand-200/70 animate-pulse" />
          ))}
        </div>
        <div className="h-56 rounded-2xl bg-sand-200/70 animate-pulse" />
      </div>
    );
  }

  return (
    <div>
      {restrictedSections.length > 0 && (
        <div className="max-w-4xl mx-auto px-4 pt-6">
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-center gap-3 text-sm text-amber-900">
            <Lock className="w-5 h-5 text-amber-700 shrink-0" />
            <span>
              Sharing is currently restricted for: <strong>{restrictedSections.join(', ')}</strong>.
            </span>
          </div>
        </div>
      )}
      <ElderFirstMode
        doses={doses}
        nextAppointment={nextAppointment}
        emergencyContacts={emergencyContacts}
        elderName={session?.elderName || 'Elder'}
        onMarkDose={handleMarkDose}
      />
    </div>
  );
};
