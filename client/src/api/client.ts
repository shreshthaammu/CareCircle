const API_BASE = '/api';
const TOKEN_STORAGE_KEY = 'carecircle_auth_token';

async function fetchJson<T>(url: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers || {});
  headers.set('X-CareCircle-CSRF', '1');

  const storedToken = typeof window !== 'undefined' ? window.sessionStorage.getItem(TOKEN_STORAGE_KEY) : null;
  if (storedToken && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${storedToken}`);
  }

  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  const res = await fetch(`${API_BASE}${url}`, {
    ...options,
    headers,
    credentials: 'include',
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    const errorMsg = data.error || (data.details ? data.details.map((d: any) => d.message).join(', ') : 'Request failed');
    throw new Error(errorMsg);
  }

  return data as T;
}

export const api = {
  // Auth
  createCircle: (data: {
    elderName: string;
    elderEmail: string;
    timezone?: string;
    language?: 'en' | 'hi' | 'te';
    emergencyContacts?: Array<{ name: string; relation: string; phone: string }>;
  }) => fetchJson<{ circle: any; passcodes: { elder: string; caretaker: string; family: string } }>('/auth/circles', {
    method: 'POST',
    body: JSON.stringify(data),
  }),

  joinCircle: async (circleCode: string, passcode: string) => {
    const res = await fetchJson<{ success: boolean; session: any; token: string }>('/auth/join', {
      method: 'POST',
      body: JSON.stringify({ circleCode, passcode }),
    });
    if (res.token && typeof window !== 'undefined') {
      window.sessionStorage.setItem(TOKEN_STORAGE_KEY, res.token);
    }
    return res;
  },

  getMe: () => fetchJson<{ session: any; circle: any }>('/auth/me'),

  logout: async () => {
    if (typeof window !== 'undefined') {
      window.sessionStorage.removeItem(TOKEN_STORAGE_KEY);
    }
    return fetchJson<{ success: boolean }>('/auth/logout', { method: 'POST' });
  },

  regeneratePasscode: (targetRole: 'CARETAKER' | 'FAMILY' | 'ELDER') =>
    fetchJson<{ success: boolean; newPasscode: string; message: string }>('/auth/regenerate-passcode', {
      method: 'POST',
      body: JSON.stringify({ targetRole }),
    }),

  revokePasscode: (targetRole: 'CARETAKER' | 'FAMILY') =>
    fetchJson<{ success: boolean; message: string }>('/auth/revoke-passcode', {
      method: 'POST',
      body: JSON.stringify({ targetRole }),
    }),

  // Medications
  getMedications: () => fetchJson<{ medications: any[] }>('/medications'),

  getTodayDoses: () => fetchJson<{ date: string; doses: any[] }>('/medications/today'),

  createMedication: (med: any) =>
    fetchJson<{ medication?: any; isSuggestion?: boolean; suggestion?: any; message?: string }>('/medications', {
      method: 'POST',
      body: JSON.stringify(med),
    }),

  updateMedication: (id: string, updates: any) =>
    fetchJson<{ medication?: any; isSuggestion?: boolean; suggestion?: any; message?: string }>(`/medications/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    }),

  archiveMedication: (id: string) =>
    fetchJson<{ success: boolean; message: string }>(`/medications/${id}`, {
      method: 'DELETE',
    }),

  markDoseStatus: (doseId: string, status: 'taken' | 'skipped' | 'snoozed', snoozeMinutes = 15) =>
    fetchJson<{ dose: any }>(`/medications/doses/${doseId}/status`, {
      method: 'POST',
      body: JSON.stringify({ status, snoozeMinutes }),
    }),

  getAdherence: () => fetchJson<{ metrics: any }>('/medications/adherence'),

  // Appointments
  getAppointments: () => fetchJson<{ upcoming: any[]; past: any[]; all: any[] }>('/appointments'),

  createAppointment: (data: any) =>
    fetchJson<{ appointment: any }>('/appointments', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updateAppointment: (id: string, data: any) =>
    fetchJson<{ appointment: any }>(`/appointments/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  deleteAppointment: (id: string) =>
    fetchJson<{ success: boolean; message: string }>(`/appointments/${id}`, {
      method: 'DELETE',
    }),

  downloadAppointmentIcs: async (id: string) => {
    const headers = new Headers();
    const storedToken = typeof window !== 'undefined' ? window.sessionStorage.getItem(TOKEN_STORAGE_KEY) : null;
    if (storedToken) {
      headers.set('Authorization', `Bearer ${storedToken}`);
    }
    const res = await fetch(`${API_BASE}/appointments/${id}/ics`, {
      method: 'GET',
      headers,
      credentials: 'include',
    });
    if (!res.ok) {
      throw new Error('Failed to download calendar file');
    }
    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `appointment-${id}.ics`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  },

  // Suggestions
  getSuggestions: () => fetchJson<{ suggestions: any[] }>('/suggestions'),

  approveSuggestion: (id: string, reviewNotes?: string) =>
    fetchJson<{ success: boolean; suggestion: any }>(`/suggestions/${id}/approve`, {
      method: 'POST',
      body: JSON.stringify({ reviewNotes }),
    }),

  declineSuggestion: (id: string, reviewNotes?: string) =>
    fetchJson<{ success: boolean; suggestion: any }>(`/suggestions/${id}/decline`, {
      method: 'POST',
      body: JSON.stringify({ reviewNotes }),
    }),

  // Circle Settings & Audit
  getSettings: () => fetchJson<{ settings: any }>('/circles/settings'),

  updateSettings: (updates: any) =>
    fetchJson<{ settings: any }>('/circles/settings', {
      method: 'PUT',
      body: JSON.stringify(updates),
    }),

  getAuditLogs: () => fetchJson<{ logs: any[] }>('/circles/audit'),

  // AI
  scanPrescription: (file: File) => {
    const formData = new FormData();
    formData.append('image', file);
    return fetchJson<{ medications: any[]; disclaimer: string; isSimulated: boolean }>('/ai/scan-prescription', {
      method: 'POST',
      body: formData,
    });
  },

  parseSchedule: (text: string) =>
    fetchJson<{ draft: any; disclaimer: string; isSimulated: boolean }>('/ai/parse-schedule', {
      method: 'POST',
      body: JSON.stringify({ text }),
    }),

  explainMedicine: (medicationName: string, dosage: string, language?: string) =>
    fetchJson<{ explanation: string; tips: string[]; disclaimer: string }>('/ai/explain-medicine', {
      method: 'POST',
      body: JSON.stringify({ medicationName, dosage, language }),
    }),

  getWeeklySummary: () =>
    fetchJson<{ summary: string; highlight: string; disclaimer: string }>('/ai/weekly-summary'),
};
