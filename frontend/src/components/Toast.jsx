import { useEffect } from 'react';
import { CheckCircle, XCircle, Info, X } from 'lucide-react';

const icons = {
  success: <CheckCircle size={18} className="text-secondary shrink-0" />,
  error: <XCircle size={18} className="text-error shrink-0" />,
  info: <Info size={18} className="text-primary shrink-0" />,
};

const colors = {
  success: 'border-secondary/30 bg-secondary/10',
  error: 'border-error/30 bg-error/10',
  info: 'border-primary/30 bg-primary/10',
};

export default function Toast({ toast, onDismiss }) {
  useEffect(() => {
    const t = setTimeout(onDismiss, 4000);
    return () => clearTimeout(t);
  }, [toast]);

  return (
    <div className={`fixed bottom-6 right-6 z-[100] flex items-center gap-3 px-4 py-3 rounded-xl border shadow-2xl backdrop-blur-md animate-fade-in ${colors[toast.type]}`}>
      {icons[toast.type]}
      <p className="text-sm font-medium">{toast.message}</p>
      <button onClick={onDismiss} className="ml-2 text-text-muted hover:text-white transition-colors">
        <X size={16} />
      </button>
    </div>
  );
}
