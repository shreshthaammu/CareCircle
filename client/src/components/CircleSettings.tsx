import React, { useState, useEffect } from 'react';
import { api } from '../api/client.js';
import { useToast } from '../context/ToastContext.js';
import {
  Shield,
  Key,
  RefreshCw,
  UserX,
  Activity,
  Copy,
  Check,
  Phone,
  Plus,
  Trash2,
  Eye,
  Search,
} from 'lucide-react';

interface CircleSettingsProps {
  settings: any;
  userRole?: string;
  onRefresh: () => void;
}

const VISIBILITY_OPTIONS = [
  { key: 'medications', label: 'Medications & Daily Doses' },
  { key: 'adherence', label: 'Adherence & Calendar Heatmap' },
  { key: 'appointments', label: 'Doctor Appointments' },
  { key: 'suggestions', label: 'Care Suggestions' },
];

export const CircleSettings: React.FC<CircleSettingsProps> = ({
  settings,
  userRole,
  onRefresh,
}) => {
  const { success: toastSuccess, error: toastError, confirm } = useToast();

  const [sharingPaused, setSharingPaused] = useState(Boolean(settings?.sharingPaused));
  const [autoApproveCaretaker, setAutoApproveCaretaker] = useState(Boolean(settings?.autoApproveCaretaker));
  const [contacts, setContacts] = useState<Array<{ name: string; relation: string; phone: string }>>(
    settings?.emergencyContacts || []
  );
  const [roleVisibility, setRoleVisibility] = useState<{ caretaker: string[]; family: string[] }>({
    caretaker: settings?.roleVisibility?.caretaker || ['medications', 'appointments', 'adherence', 'suggestions'],
    family: settings?.roleVisibility?.family || ['medications', 'appointments', 'adherence', 'suggestions'],
  });

  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [auditQuery, setAuditQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [savingContacts, setSavingContacts] = useState(false);
  const [generatedPasscodeNotice, setGeneratedPasscodeNotice] = useState<{
    role: string;
    code: string;
  } | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);

  // Sync local state whenever parent refreshes settings
  useEffect(() => {
    if (!settings) return;
    setSharingPaused(Boolean(settings.sharingPaused));
    setAutoApproveCaretaker(Boolean(settings.autoApproveCaretaker));
    setContacts(Array.isArray(settings.emergencyContacts) ? settings.emergencyContacts : []);
    setRoleVisibility({
      caretaker: settings.roleVisibility?.caretaker || ['medications', 'appointments', 'adherence', 'suggestions'],
      family: settings.roleVisibility?.family || ['medications', 'appointments', 'adherence', 'suggestions'],
    });
  }, [settings]);

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const res = await api.getAuditLogs();
        setAuditLogs(res.logs || []);
      } catch {
        // Handled cleanly if restricted
      }
    };
    fetchLogs();
  }, [settings]);

  const handleCopyCircleCode = async () => {
    if (!settings?.code) return;
    try {
      await navigator.clipboard.writeText(settings.code);
      setCopiedCode(true);
      toastSuccess(`Copied Circle Code ${settings.code}.`);
      setTimeout(() => setCopiedCode(false), 2000);
    } catch {
      toastError('Could not copy to clipboard.');
    }
  };

  const handleToggleSharing = async () => {
    const previous = sharingPaused;
    const updated = !sharingPaused;
    try {
      setLoading(true);
      setSharingPaused(updated);
      await api.updateSettings({ sharingPaused: updated });
      toastSuccess(updated ? 'Family & caretaker sharing paused.' : 'Circle sharing resumed.');
      onRefresh();
    } catch (err: any) {
      setSharingPaused(previous);
      toastError(err?.message || 'Failed to update sharing mode');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleAutoApprove = async () => {
    const previous = autoApproveCaretaker;
    const updated = !autoApproveCaretaker;
    try {
      setLoading(true);
      setAutoApproveCaretaker(updated);
      await api.updateSettings({ autoApproveCaretaker: updated });
      toastSuccess(
        updated
          ? 'Auto-approve enabled for caretaker updates.'
          : 'Elder consent required for all medication updates.'
      );
      onRefresh();
    } catch (err: any) {
      setAutoApproveCaretaker(previous);
      toastError(err?.message || 'Failed to update auto-approve preference');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleVisibility = async (target: 'caretaker' | 'family', sectionKey: string) => {
    const previous = roleVisibility;
    const list = roleVisibility[target];
    const nextList = list.includes(sectionKey)
      ? list.filter(k => k !== sectionKey)
      : [...list, sectionKey];
    const nextState = { ...roleVisibility, [target]: nextList };

    try {
      setLoading(true);
      setRoleVisibility(nextState);
      await api.updateSettings({ roleVisibility: nextState });
      toastSuccess(`Updated ${target} visibility permissions.`);
      onRefresh();
    } catch (err: any) {
      setRoleVisibility(previous);
      toastError(err?.message || 'Failed to update visibility');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveContacts = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = contacts
      .map(c => ({ name: c.name.trim(), relation: c.relation.trim(), phone: c.phone.trim() }))
      .filter(c => c.name && c.phone);

    try {
      setSavingContacts(true);
      await api.updateSettings({ emergencyContacts: cleaned });
      toastSuccess('Saved emergency contacts.');
      onRefresh();
    } catch (err: any) {
      toastError(err?.message || 'Failed to save emergency contacts');
    } finally {
      setSavingContacts(false);
    }
  };

  const handleRegenerate = async (targetRole: 'CARETAKER' | 'FAMILY' | 'ELDER') => {
    const confirmed = await confirm({
      title: `Generate new ${targetRole.toLowerCase()} passcode?`,
      message: `The current ${targetRole.toLowerCase()} passcode will immediately stop working.`,
      confirmLabel: 'Generate Passcode',
      tone: 'primary',
    });
    if (!confirmed) return;

    try {
      setLoading(true);
      const res = await api.regeneratePasscode(targetRole);
      setGeneratedPasscodeNotice({ role: targetRole, code: res.newPasscode });
      toastSuccess(`Generated new ${targetRole.toLowerCase()} passcode.`);
      onRefresh();
    } catch (err: any) {
      toastError(err?.message || 'Failed to regenerate passcode');
    } finally {
      setLoading(false);
    }
  };

  const handleRevoke = async (targetRole: 'CARETAKER' | 'FAMILY') => {
    const confirmed = await confirm({
      title: `Revoke ${targetRole.toLowerCase()} access?`,
      message: `Anyone using the ${targetRole.toLowerCase()} passcode will be locked out until you generate a new one.`,
      confirmLabel: 'Revoke Access',
      tone: 'danger',
    });
    if (!confirmed) return;

    try {
      setLoading(true);
      await api.revokePasscode(targetRole);
      setGeneratedPasscodeNotice(null);
      toastSuccess(`Access for ${targetRole.toLowerCase()} has been revoked.`);
      onRefresh();
    } catch (err: any) {
      toastError(err?.message || 'Failed to revoke passcode');
    } finally {
      setLoading(false);
    }
  };

  const q = auditQuery.trim().toLowerCase();
  const filteredLogs = auditLogs.filter(
    log =>
      !q ||
      (log.action || '').toLowerCase().includes(q) ||
      (log.details || '').toLowerCase().includes(q) ||
      (log.actorName || '').toLowerCase().includes(q)
  );

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      {/* Circle Identity Summary */}
      {settings && (
        <section className="card bg-white border border-sand-200 rounded-2xl p-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <span className="text-xs font-semibold text-stone-500 block">CareCircle Code</span>
            <div className="flex items-center gap-3 mt-1">
              <span className="font-mono text-2xl font-extrabold text-teal-800 tracking-wider">
                {settings.code}
              </span>
              <button
                type="button"
                onClick={handleCopyCircleCode}
                className="min-h-0 px-3 py-1.5 rounded-lg bg-sand-100 hover:bg-sand-200 text-stone-700 text-xs font-bold flex items-center gap-1.5 transition"
              >
                {copiedCode ? <Check className="w-3.5 h-3.5 text-teal-700" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedCode ? 'Copied' : 'Copy Code'}</span>
              </button>
            </div>
          </div>

          <div className="text-sm text-stone-600">
            <span className="block">
              Elder: <strong className="text-stone-900">{settings.elderName}</strong>
            </span>
            <span className="text-xs text-stone-500">Timezone: {settings.timezone || 'UTC'}</span>
          </div>
        </section>
      )}

      {/* Elder Privacy & Consent Preferences */}
      {userRole === 'ELDER' && (
        <section className="card bg-white border border-sand-200 rounded-2xl p-6 sm:p-8 space-y-6">
          <h3 className="text-xl font-extrabold text-stone-900 flex items-center gap-2">
            <Shield className="w-5 h-5 text-teal-600" />
            <span>Elder Sharing &amp; Consent Controls</span>
          </h3>

          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-4 p-4 bg-sand-50 rounded-2xl border border-sand-200">
              <div className="max-w-lg">
                <span className="font-bold text-stone-900 block text-base">
                  Pause Family &amp; Caretaker Sharing
                </span>
                <span className="text-sm text-stone-600">
                  Temporarily hides medications, adherence, and appointment details from other members.
                </span>
              </div>
              <button
                type="button"
                onClick={handleToggleSharing}
                disabled={loading}
                aria-pressed={sharingPaused}
                className={`px-5 py-2.5 rounded-xl font-bold text-sm transition whitespace-nowrap shrink-0 ${
                  sharingPaused
                    ? 'bg-red-600 hover:bg-red-700 text-white'
                    : 'bg-sand-200 hover:bg-sand-300 text-stone-800'
                }`}
              >
                {sharingPaused ? 'Sharing Paused' : 'Active Sharing'}
              </button>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-4 p-4 bg-sand-50 rounded-2xl border border-sand-200">
              <div className="max-w-lg">
                <span className="font-bold text-stone-900 block text-base">
                  Auto-Approve Caretaker Schedule Updates
                </span>
                <span className="text-sm text-stone-600">
                  When enabled, changes proposed by caretakers take effect immediately without review.
                </span>
              </div>
              <button
                type="button"
                onClick={handleToggleAutoApprove}
                disabled={loading}
                aria-pressed={autoApproveCaretaker}
                className={`px-5 py-2.5 rounded-xl font-bold text-sm transition whitespace-nowrap shrink-0 ${
                  autoApproveCaretaker
                    ? 'bg-teal-600 hover:bg-teal-700 text-white'
                    : 'bg-sand-200 hover:bg-sand-300 text-stone-800'
                }`}
              >
                {autoApproveCaretaker ? 'Enabled' : 'Consent Required'}
              </button>
            </div>
          </div>

          {/* Granular Role Visibility Matrix */}
          <div className="pt-4 border-t border-sand-200 space-y-4">
            <h4 className="text-sm font-extrabold text-stone-800 flex items-center gap-2">
              <Eye className="w-4 h-4 text-teal-600" />
              <span>Section Visibility by Member Role</span>
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {(['caretaker', 'family'] as const).map(target => (
                <div key={target} className="bg-sand-50 border border-sand-200 rounded-xl p-4 space-y-2.5">
                  <span className="text-xs font-bold uppercase tracking-wider text-stone-600 block">
                    {target === 'caretaker' ? 'Caretaker Access' : 'Family Access'}
                  </span>
                  {VISIBILITY_OPTIONS.map(opt => {
                    const checked = roleVisibility[target].includes(opt.key);
                    return (
                      <label
                        key={opt.key}
                        className="flex items-center justify-between gap-3 text-sm text-stone-800 cursor-pointer py-1"
                      >
                        <span>{opt.label}</span>
                        <input
                          type="checkbox"
                          checked={checked}
                          disabled={loading}
                          onChange={() => handleToggleVisibility(target, opt.key)}
                          className="w-4 h-4 text-teal-600 rounded border-sand-300"
                        />
                      </label>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Emergency Contacts Management (Elder Only) */}
      {userRole === 'ELDER' && (
        <section className="card bg-white border border-sand-200 rounded-2xl p-6 sm:p-8 space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-xl font-extrabold text-stone-900 flex items-center gap-2">
                <Phone className="w-5 h-5 text-teal-600" />
                <span>Emergency &amp; Doctor Contacts</span>
              </h3>
              <p className="text-sm text-stone-500 mt-0.5">
                Shown in Elder View speed-dial and on your Printable Emergency Card.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setContacts(prev => [...prev, { name: '', relation: '', phone: '' }])}
              className="min-h-0 px-3 py-2 rounded-xl bg-sand-100 hover:bg-sand-200 text-stone-800 text-xs font-bold flex items-center gap-1.5 transition"
            >
              <Plus className="w-4 h-4" />
              <span>Add Contact</span>
            </button>
          </div>

          <form onSubmit={handleSaveContacts} className="space-y-3">
            {contacts.length === 0 ? (
              <p className="text-sm text-stone-500 bg-sand-50 border border-sand-200 rounded-xl p-4">
                No emergency contacts saved yet. Click &ldquo;Add Contact&rdquo; to add a doctor or family member.
              </p>
            ) : (
              contacts.map((contact, idx) => (
                <div
                  key={idx}
                  className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_1fr_auto] gap-2.5 items-center bg-sand-50 p-3 rounded-xl border border-sand-200"
                >
                  <input
                    type="text"
                    required
                    placeholder="Contact Name"
                    aria-label={`Contact ${idx + 1} name`}
                    value={contact.name}
                    onChange={e =>
                      setContacts(prev =>
                        prev.map((c, i) => (i === idx ? { ...c, name: e.target.value } : c))
                      )
                    }
                    className="rounded-lg border border-sand-300 px-3 py-2 text-sm"
                  />
                  <input
                    type="text"
                    required
                    placeholder="Relation / Role"
                    aria-label={`Contact ${idx + 1} relation`}
                    value={contact.relation}
                    onChange={e =>
                      setContacts(prev =>
                        prev.map((c, i) => (i === idx ? { ...c, relation: e.target.value } : c))
                      )
                    }
                    className="rounded-lg border border-sand-300 px-3 py-2 text-sm"
                  />
                  <input
                    type="tel"
                    required
                    placeholder="Phone Number"
                    aria-label={`Contact ${idx + 1} phone`}
                    value={contact.phone}
                    onChange={e =>
                      setContacts(prev =>
                        prev.map((c, i) => (i === idx ? { ...c, phone: e.target.value } : c))
                      )
                    }
                    className="rounded-lg border border-sand-300 px-3 py-2 text-sm font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setContacts(prev => prev.filter((_, i) => i !== idx))}
                    aria-label={`Remove contact ${contact.name || idx + 1}`}
                    className="min-h-0 p-2 rounded-lg text-stone-500 hover:text-red-700 hover:bg-red-50 transition justify-self-end"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))
            )}

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={savingContacts}
                className="px-5 py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-bold text-sm rounded-xl transition disabled:opacity-50"
              >
                {savingContacts ? 'Saving...' : 'Save Contacts'}
              </button>
            </div>
          </form>
        </section>
      )}

      {/* Role Passcode Management (Elder Only) */}
      {userRole === 'ELDER' && (
        <section className="card bg-white border border-sand-200 rounded-2xl p-6 sm:p-8 space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-xl font-extrabold text-stone-900 flex items-center gap-2">
              <Key className="w-5 h-5 text-teal-600" />
              <span>Role Passcode Management</span>
            </h3>
            <span className="text-xs text-stone-500">Passcodes are hashed and never stored in plain text</span>
          </div>

          {generatedPasscodeNotice && (
            <div className="bg-teal-50 border-2 border-teal-500 text-teal-950 p-4 rounded-2xl flex flex-wrap items-center justify-between gap-3">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-teal-700 block">
                  New {generatedPasscodeNotice.role} Passcode (Shown Once)
                </span>
                <span className="font-mono text-xl font-extrabold tracking-wider">
                  {generatedPasscodeNotice.code}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={async () => {
                    await navigator.clipboard.writeText(generatedPasscodeNotice.code);
                    toastSuccess('Passcode copied to clipboard.');
                  }}
                  className="min-h-0 px-3 py-1.5 rounded-lg bg-teal-700 text-white text-xs font-bold flex items-center gap-1.5"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy</span>
                </button>
                <button
                  type="button"
                  onClick={() => setGeneratedPasscodeNotice(null)}
                  className="min-h-0 px-3 py-1.5 rounded-lg text-teal-800 hover:bg-teal-100 text-xs font-semibold"
                >
                  Dismiss
                </button>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-sand-50 border border-sand-200 rounded-2xl p-5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-extrabold text-stone-900 text-lg">Caretaker Passcode</span>
                <span className="text-xs font-bold text-amber-800">Manage &amp; Edit</span>
              </div>
              <p className="text-xs text-stone-600">
                Allows recording doses, scheduling appointments, and submitting medication updates.
              </p>
              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => handleRegenerate('CARETAKER')}
                  disabled={loading}
                  className="min-h-0 px-3.5 py-2 bg-teal-600 text-white text-xs font-bold rounded-lg hover:bg-teal-700 flex items-center gap-1.5 transition"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Regenerate</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleRevoke('CARETAKER')}
                  disabled={loading}
                  className="min-h-0 px-3.5 py-2 bg-red-100 text-red-800 text-xs font-bold rounded-lg hover:bg-red-200 flex items-center gap-1.5 transition"
                >
                  <UserX className="w-3.5 h-3.5" />
                  <span>Revoke</span>
                </button>
              </div>
            </div>

            <div className="bg-sand-50 border border-sand-200 rounded-2xl p-5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-extrabold text-stone-900 text-lg">Family Passcode</span>
                <span className="text-xs font-bold text-blue-800">View &amp; Suggest</span>
              </div>
              <p className="text-xs text-stone-600">
                Allows family members to view adherence, check upcoming doctor visits, and suggest changes.
              </p>
              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => handleRegenerate('FAMILY')}
                  disabled={loading}
                  className="min-h-0 px-3.5 py-2 bg-teal-600 text-white text-xs font-bold rounded-lg hover:bg-teal-700 flex items-center gap-1.5 transition"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Regenerate</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleRevoke('FAMILY')}
                  disabled={loading}
                  className="min-h-0 px-3.5 py-2 bg-red-100 text-red-800 text-xs font-bold rounded-lg hover:bg-red-200 flex items-center gap-1.5 transition"
                >
                  <UserX className="w-3.5 h-3.5" />
                  <span>Revoke</span>
                </button>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Transparent Audit Trail */}
      <section className="card bg-white border border-sand-200 rounded-2xl p-6 sm:p-8 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-xl font-extrabold text-stone-900 flex items-center gap-2">
              <Activity className="w-5 h-5 text-teal-600" />
              <span>Audit Trail ({filteredLogs.length})</span>
            </h3>
            <p className="text-sm text-stone-500 mt-0.5">
              Readable record of medication, appointment, and permission changes within this circle.
            </p>
          </div>

          {auditLogs.length > 0 && (
            <div className="relative min-w-[200px]">
              <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="search"
                value={auditQuery}
                onChange={e => setAuditQuery(e.target.value)}
                placeholder="Filter activity..."
                aria-label="Filter audit trail"
                className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-sand-300 text-sm"
              />
            </div>
          )}
        </div>

        {filteredLogs.length === 0 ? (
          <p className="text-stone-500 text-sm">No matching activity recorded yet.</p>
        ) : (
          <div className="space-y-3 max-h-96 overflow-y-auto pr-2 divide-y divide-sand-100">
            {filteredLogs.map(log => (
              <div key={log.id} className="pt-3 text-sm flex items-start justify-between gap-4">
                <div>
                  <span className="font-bold text-stone-900 block font-mono text-xs">{log.action}</span>
                  <span className="text-stone-700 block mt-0.5">{log.details}</span>
                  <span className="text-xs text-stone-500 block mt-0.5">
                    Actor: <strong>{log.actorName}</strong> ({log.actorRole})
                  </span>
                </div>
                <span className="text-xs text-stone-500 whitespace-nowrap tabular-nums">
                  {new Date(log.timestamp).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' })}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};
