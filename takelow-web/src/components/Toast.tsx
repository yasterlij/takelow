import { useToastStore } from '../store/toast.store';

const icons: Record<string, string> = {
  success: '✓',
  error: '✕',
  warning: '⚠',
  info: 'ℹ',
};

const bg: Record<string, string> = {
  success: 'bg-emerald-500/20 border-emerald-500/30',
  error: 'bg-red-500/20 border-red-500/30',
  warning: 'bg-amber-500/20 border-amber-500/30',
  info: 'bg-sky-500/20 border-sky-500/30',
};

const fg: Record<string, string> = {
  success: 'text-emerald-400',
  error: 'text-red-400',
  warning: 'text-amber-400',
  info: 'text-sky-400',
};

export function ToastContainer() {
  const toasts = useToastStore((s) => s.toasts);
  const removeToast = useToastStore((s) => s.removeToast);

  return (
    <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-2 max-w-sm pointer-events-none">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-xl border backdrop-blur-xl ${bg[t.type]} ${t.exiting ? 'animate-toast-out' : 'animate-toast-in'}`}
          onClick={() => removeToast(t.id)}
        >
          <span className={`text-lg font-bold ${fg[t.type]}`}>{icons[t.type]}</span>
          <span className="text-light-text/90 text-sm">{t.message}</span>
        </div>
      ))}
    </div>
  );
}