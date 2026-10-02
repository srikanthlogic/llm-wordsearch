import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';

type ToastVariant = 'success' | 'error' | 'info';

interface ToastItem {
  id: number;
  message: string;
  variant: ToastVariant;
}

interface ConfirmOptions {
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
}

interface FeedbackContextType {
  toast: (message: string, variant?: ToastVariant) => void;
  confirm: (options: ConfirmOptions) => Promise<boolean>;
}

const FeedbackContext = createContext<FeedbackContextType | undefined>(undefined);

export const useFeedback = (): FeedbackContextType => {
  const context = useContext(FeedbackContext);
  if (context === undefined) {
    throw new Error('useFeedback must be used within a FeedbackProvider');
  }
  return context;
};

let nextToastId = 1;

const toastStyles: Record<ToastVariant, string> = {
  success: 'bg-emerald-600 text-white',
  error: 'bg-rose-600 text-white',
  info: 'bg-ink text-paper',
};

export const FeedbackProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [confirmState, setConfirmState] = useState<
    (ConfirmOptions & { resolve: (value: boolean) => void }) | null
  >(null);
  const confirmButtonRef = useRef<HTMLButtonElement>(null);
  const timersRef = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map());

  useEffect(() => {
    const timers = timersRef.current;
    return () => {
      timers.forEach(clearTimeout);
      timers.clear();
    };
  }, []);

  const dismissToast = useCallback((id: number) => {
    setToasts(prev => prev.filter(t => t.id !== id));
    const timer = timersRef.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timersRef.current.delete(id);
    }
  }, []);

  const toast = useCallback((message: string, variant: ToastVariant = 'info') => {
    const id = nextToastId++;
    setToasts(prev => [...prev.slice(-3), { id, message, variant }]);
    timersRef.current.set(
      id,
      setTimeout(() => dismissToast(id), 4000)
    );
  }, [dismissToast]);

  const confirm = useCallback((options: ConfirmOptions) => {
    return new Promise<boolean>(resolve => {
      setConfirmState({ ...options, resolve });
    });
  }, []);

  const settle = useCallback((value: boolean) => {
    if (confirmState) {
      confirmState.resolve(value);
      setConfirmState(null);
    }
  }, [confirmState]);

  useEffect(() => {
    if (!confirmState) return;
    confirmButtonRef.current?.focus();
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') settle(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [confirmState, settle]);

  return (
    <FeedbackContext.Provider value={{ toast, confirm }}>
      {children}
      <div aria-live="polite" className="pointer-events-none fixed top-4 right-4 z-[100] flex w-full max-w-sm flex-col gap-2 px-4 sm:px-0">
        {toasts.map(item => (
          <div
            key={item.id}
            role={item.variant === 'error' ? 'alert' : 'status'}
            className={`pointer-events-auto flex items-start justify-between gap-3 rounded-xl px-4 py-3 shadow-lg animate-fade-in ${toastStyles[item.variant]}`}
          >
            <p className="text-sm font-medium break-words">{item.message}</p>
            <button
              onClick={() => dismissToast(item.id)}
              className="shrink-0 rounded-md p-1 opacity-70 transition-opacity hover:opacity-100"
              aria-label="Dismiss"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        ))}
      </div>

      {confirmState && (
        <div
          role="presentation"
          className="fixed inset-0 z-[110] flex items-center justify-center bg-ink/60 p-4 animate-fade-in"
          onClick={(e) => { if (e.target === e.currentTarget) settle(false); }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label={confirmState.title}
            className="w-full max-w-md rounded-2xl bg-sheet p-6 shadow-2xl"
          >
            <h2 className="text-lg font-bold text-ink">{confirmState.title}</h2>
            {confirmState.message && (
              <p className="mt-2 text-sm text-ink-soft">{confirmState.message}</p>
            )}
            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={(e) => { if (e.target === e.currentTarget) settle(false); }}
                className="min-h-[44px] rounded-xl border border-ink/25 px-4 py-2.5 text-sm font-semibold text-ink transition-colors hover:bg-ink/5"
              >
                {confirmState.cancelLabel || 'Cancel'}
              </button>
              <button
                ref={confirmButtonRef}
                onClick={() => settle(true)}
                className={`min-h-[44px] rounded-xl px-4 py-2.5 text-sm font-semibold shadow-md transition-colors ${
                  confirmState.danger
                    ? 'bg-rose-600 text-white hover:bg-rose-700'
                    : 'btn-primary'
                }`}
              >
                {confirmState.confirmLabel || 'OK'}
              </button>
            </div>
          </div>
        </div>
      )}
    </FeedbackContext.Provider>
  );
};
