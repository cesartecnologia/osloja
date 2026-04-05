'use client';

import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { AlertTriangle, CheckCircle2, Info, X, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type ToastVariant = 'success' | 'error' | 'warning' | 'info';

type ToastItem = {
  id: number;
  title: string;
  description?: string;
  variant: ToastVariant;
};

type ConfirmOptions = {
  title: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
  tone?: 'default' | 'danger' | 'warning' | 'success';
};

type PromptOptions = ConfirmOptions & {
  label?: string;
  placeholder?: string;
  defaultValue?: string;
  inputType?: 'text' | 'password' | 'email' | 'number';
};

type DialogState =
  | ({ mode: 'confirm' } & ConfirmOptions)
  | ({ mode: 'prompt'; value: string } & PromptOptions)
  | null;

type FeedbackContextValue = {
  notify: (input: { title: string; description?: string; variant?: ToastVariant }) => void;
  confirm: (options: ConfirmOptions) => Promise<boolean>;
  prompt: (options: PromptOptions) => Promise<string | null>;
};

const FeedbackContext = createContext<FeedbackContextValue | null>(null);

const toneMap = {
  default: 'default' as const,
  danger: 'outline' as const,
  warning: 'warning' as const,
  success: 'success' as const
};

const toastStyleMap: Record<ToastVariant, { icon: typeof Info; wrapper: string; iconColor: string }> = {
  success: {
    icon: CheckCircle2,
    wrapper: 'border-emerald-200 bg-emerald-50/95',
    iconColor: 'text-emerald-600'
  },
  error: {
    icon: XCircle,
    wrapper: 'border-red-200 bg-red-50/95',
    iconColor: 'text-red-600'
  },
  warning: {
    icon: AlertTriangle,
    wrapper: 'border-amber-200 bg-amber-50/95',
    iconColor: 'text-amber-600'
  },
  info: {
    icon: Info,
    wrapper: 'border-sky-200 bg-sky-50/95',
    iconColor: 'text-sky-600'
  }
};

export function FeedbackProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [dialog, setDialog] = useState<DialogState>(null);
  const resolverRef = useRef<((value: boolean | string | null) => void) | null>(null);

  const closeDialog = useCallback((value: boolean | string | null) => {
    resolverRef.current?.(value);
    resolverRef.current = null;
    setDialog(null);
  }, []);

  const notify = useCallback((input: { title: string; description?: string; variant?: ToastVariant }) => {
    const id = Date.now() + Math.floor(Math.random() * 1000);
    const toast: ToastItem = {
      id,
      title: input.title,
      description: input.description,
      variant: input.variant ?? 'info'
    };

    setToasts((current) => [...current, toast]);
    window.setTimeout(() => {
      setToasts((current) => current.filter((item) => item.id !== id));
    }, 4200);
  }, []);

  const confirm = useCallback((options: ConfirmOptions) => {
    return new Promise<boolean>((resolve) => {
      resolverRef.current = (value) => resolve(Boolean(value));
      setDialog({
        mode: 'confirm',
        title: options.title,
        description: options.description,
        confirmText: options.confirmText ?? 'Confirmar',
        cancelText: options.cancelText ?? 'Cancelar',
        tone: options.tone ?? 'default'
      });
    });
  }, []);

  const prompt = useCallback((options: PromptOptions) => {
    return new Promise<string | null>((resolve) => {
      resolverRef.current = (value) => resolve(typeof value === 'string' ? value : null);
      setDialog({
        mode: 'prompt',
        title: options.title,
        description: options.description,
        confirmText: options.confirmText ?? 'Salvar',
        cancelText: options.cancelText ?? 'Cancelar',
        tone: options.tone ?? 'default',
        label: options.label ?? 'Valor',
        placeholder: options.placeholder,
        inputType: options.inputType ?? 'text',
        defaultValue: options.defaultValue ?? '',
        value: options.defaultValue ?? ''
      });
    });
  }, []);

  const value = useMemo<FeedbackContextValue>(() => ({ notify, confirm, prompt }), [confirm, notify, prompt]);

  return (
    <FeedbackContext.Provider value={value}>
      {children}

      <div className="pointer-events-none fixed right-4 top-4 z-[80] flex w-full max-w-sm flex-col gap-3">
        {toasts.map((toast) => {
          const style = toastStyleMap[toast.variant];
          const Icon = style.icon;
          return (
            <div
              key={toast.id}
              className={cn(
                'pointer-events-auto rounded-2xl border px-4 py-3 shadow-lg backdrop-blur',
                style.wrapper
              )}
            >
              <div className="flex items-start gap-3">
                <div className={cn('mt-0.5', style.iconColor)}>
                  <Icon className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-ink">{toast.title}</p>
                  {toast.description ? <p className="mt-1 text-sm text-gray-600">{toast.description}</p> : null}
                </div>
                <button
                  type="button"
                  className="rounded-full p-1 text-gray-400 transition hover:bg-white/70 hover:text-gray-600"
                  onClick={() => setToasts((current) => current.filter((item) => item.id !== toast.id))}
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {dialog ? (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-[2px]">
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-white p-6 shadow-2xl">
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-red-600">Confirmação</p>
              <h3 className="text-xl font-bold text-ink">{dialog.title}</h3>
              {dialog.description ? <p className="text-sm leading-6 text-gray-600">{dialog.description}</p> : null}
            </div>

            {dialog.mode === 'prompt' ? (
              <div className="mt-5 space-y-2">
                <label className="text-sm font-medium text-ink">{dialog.label}</label>
                <input
                  autoFocus
                  type={dialog.inputType ?? 'text'}
                  value={dialog.value}
                  placeholder={dialog.placeholder}
                  onChange={(event) => setDialog((current) => current && current.mode === 'prompt' ? { ...current, value: event.target.value } : current)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') closeDialog(dialog.value.trim());
                  }}
                  className="flex h-11 w-full rounded-xl border border-gray-200 bg-white px-3 text-sm text-ink outline-none ring-0 transition placeholder:text-gray-400 focus:border-red-300"
                />
              </div>
            ) : null}

            <div className="mt-6 flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => closeDialog(dialog.mode === 'prompt' ? null : false)}>
                {dialog.cancelText ?? 'Cancelar'}
              </Button>
              <Button
                type="button"
                variant={toneMap[dialog.tone ?? 'default']}
                className={dialog.tone === 'danger' ? 'border-red-200 bg-red-600 text-white hover:bg-red-700' : undefined}
                onClick={() => closeDialog(dialog.mode === 'prompt' ? dialog.value.trim() : true)}
              >
                {dialog.confirmText ?? 'Confirmar'}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </FeedbackContext.Provider>
  );
}

export function useFeedback() {
  const context = useContext(FeedbackContext);
  if (!context) throw new Error('useFeedback deve ser usado dentro de FeedbackProvider.');
  return context;
}
