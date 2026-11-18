import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import { CheckCircle2, AlertCircle, Info, X, AlertTriangle } from 'lucide-react';

type ToastTone = 'success' | 'error' | 'info';

interface ToastItem {
  id: string;
  message: string;
  tone: ToastTone;
}

export interface ConfirmOptions {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: 'danger' | 'primary';
}

interface ToastContextValue {
  notify: (message: string, tone?: ToastTone) => void;
  success: (message: string) => void;
  error: (message: string) => void;
  info: (message: string) => void;
  confirm: (options: ConfirmOptions) => Promise<boolean>;
}

const fallbackToast: ToastContextValue = {
  notify: () => {},
  success: () => {},
  error: () => {},
  info: () => {},
  confirm: async () => true,
};

const ToastContext = createContext<ToastContextValue>(fallbackToast);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [confirmState, setConfirmState] = useState<(ConfirmOptions & { open: boolean }) | null>(null);
  const resolverRef = useRef<((value: boolean) => void) | null>(null);

  const dismiss = useCallback((id: string) => {
    setToasts(prev => prev.filter(item => item.id !== id));
  }, []);

  const notify = useCallback((message: string, tone: ToastTone = 'info') => {
    const id = `toast_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    setToasts(prev => [...prev.slice(-3), { id, message, tone }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(item => item.id !== id));
    }, 4500);
  }, []);

  const success = useCallback((message: string) => notify(message, 'success'), [notify]);
  const error = useCallback((message: string) => notify(message, 'error'), [notify]);
  const info = useCallback((message: string) => notify(message, 'info'), [notify]);

  const confirm = useCallback((options: ConfirmOptions) => {
    return new Promise<boolean>((resolve) => {
      resolverRef.current = resolve;
      setConfirmState({ ...options, open: true });
    });
  }, []);

  const resolveConfirm = (result: boolean) => {
    const resolver = resolverRef.current;
    resolverRef.current = null;
    setConfirmState(null);
    if (resolver) resolver(result);
  };

  return (
    <ToastContext.Provider value={{ notify, success, error, info, confirm }}>
      {children}

      {/* Accessible Toast Stack */}
      <div
        aria-live="polite"
        aria-atomic="true"
        className="no-print fixed bottom-4 right-4 z-[60] flex flex-col gap-2.5 max-w-sm w-[calc(100vw-2rem)] pointer-events-none"
      >
        {toasts.map(toast => {
          const styles = {
            success: 'bg-teal-900 text-white border-teal-700',
            error: 'bg-red-900 text-white border-red-700',
            info: 'bg-stone-900 text-white border-stone-700',
          }[toast.tone];

          const Icon = toast.tone === 'success' ? CheckCircle2 : toast.tone === 'error' ? AlertCircle : Info;

          return (
            <div
              key={toast.id}
              role="status"
              className={`pointer-events-auto flex items-start gap-3 px-4 py-3.5 rounded-xl border shadow-elevated text-sm font-medium transition-all duration-150 ${styles}`}
            >
              <Icon className="w-5 h-5 shrink-0 mt-0.5" />
              <span className="flex-1 leading-snug">{toast.message}</span>
              <button
                type="button"
                onClick={() => dismiss(toast.id)}
                aria-label="Dismiss notification"
                className="min-h-0 p-1 rounded-md opacity-75 hover:opacity-100 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          );
        })}
      </div>

      {/* Accessible Confirmation Dialog */}
      {confirmState?.open && (
        <div
          className="no-print fixed inset-0 z-[70] bg-stone-950/60 backdrop-blur-sm flex items-center justify-center p-4"
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="confirm-dialog-title"
          aria-describedby="confirm-dialog-desc"
        >
          <div className="card bg-white border border-sand-200 rounded-2xl max-w-md w-full p-6 shadow-elevated space-y-4">
            <div className="flex items-start gap-3">
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                  confirmState.tone === 'danger' ? 'bg-red-100 text-red-700' : 'bg-teal-100 text-teal-700'
                }`}
              >
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 id="confirm-dialog-title" className="text-lg font-bold text-stone-900">
                  {confirmState.title}
                </h3>
                <p id="confirm-dialog-desc" className="text-sm text-stone-600 mt-1 leading-relaxed">
                  {confirmState.message}
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => resolveConfirm(false)}
                className="px-4 py-2 rounded-xl border border-sand-300 text-stone-700 hover:bg-sand-100 font-semibold text-sm transition"
              >
                {confirmState.cancelLabel || 'Cancel'}
              </button>
              <button
                type="button"
                onClick={() => resolveConfirm(true)}
                className={`px-4 py-2 rounded-xl text-white font-semibold text-sm transition ${
                  confirmState.tone === 'danger'
                    ? 'bg-red-600 hover:bg-red-700'
                    : 'bg-teal-600 hover:bg-teal-700'
                }`}
              >
                {confirmState.confirmLabel || 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </ToastContext.Provider>
  );
};

export const useToast = () => useContext(ToastContext);
