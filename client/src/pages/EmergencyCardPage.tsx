import React, { useState, useEffect } from 'react';
import { api } from '../api/client.js';
import { useAuth } from '../context/AuthContext.js';
import { EmergencyCard } from '../components/EmergencyCard.js';
import { Lock } from 'lucide-react';

export const EmergencyCardPage: React.FC = () => {
  const { session } = useAuth();
  const [settings, setSettings] = useState<any | null>(null);
  const [medications, setMedications] = useState<any[]>([]);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [restrictedSections, setRestrictedSections] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [settingsRes, medsRes, apptsRes] = await Promise.allSettled([
          api.getSettings(),
          api.getMedications(),
          api.getAppointments(),
        ]);

        const restricted: string[] = [];

        if (settingsRes.status === 'fulfilled') {
          setSettings(settingsRes.value.settings || null);
        } else {
          setSettings(null);
        }

        if (medsRes.status === 'fulfilled') {
          setMedications(medsRes.value.medications || []);
        } else {
          restricted.push('medications');
          setMedications([]);
        }

        if (apptsRes.status === 'fulfilled') {
          setAppointments(apptsRes.value.upcoming || []);
        } else {
          restricted.push('appointments');
          setAppointments([]);
        }

        setRestrictedSections(restricted);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 space-y-6">
        <div className="h-20 rounded-2xl bg-sand-200/70 animate-pulse" />
        <div className="h-96 rounded-3xl bg-sand-200/70 animate-pulse" />
      </div>
    );
  }

  return (
    <div className="py-8 px-4 sm:px-6 space-y-4">
      {restrictedSections.length > 0 && (
        <div className="no-print max-w-4xl mx-auto bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-center gap-3 text-sm text-amber-900">
          <Lock className="w-5 h-5 text-amber-700 shrink-0" />
          <span>
            Some sections ({restrictedSections.join(', ')}) are hidden because sharing is restricted.
          </span>
        </div>
      )}
      <EmergencyCard
        elderName={session?.elderName || 'Elder'}
        circleCode={session?.circleCode || 'CC-DEMO'}
        emergencyContacts={settings?.emergencyContacts || []}
        medications={medications}
        doctorAppointments={appointments}
      />
    </div>
  );
};
