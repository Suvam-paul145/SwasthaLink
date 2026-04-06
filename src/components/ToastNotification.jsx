import { useEffect, useState } from 'react';

function ToastNotification({ message, type = 'info', onClose, duration = 5000 }) {
  const [isLeaving, setIsLeaving] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLeaving(true);
      setTimeout(onClose, 300);
    }, duration);
    return () => clearTimeout(timer);
  }, [duration, onClose]);

  const colors = {
    info: 'border-teal-400/30 bg-teal-900/80 text-teal-100',
    success: 'border-emerald-400/30 bg-emerald-900/80 text-emerald-100',
    warning: 'border-amber-400/30 bg-amber-900/80 text-amber-100',
    error: 'border-rose-400/30 bg-rose-900/80 text-rose-100',
  };

  const icons = {
    info: 'notifications_active',
    success: 'check_circle',
    warning: 'warning',
    error: 'error',
  };

  return (
    <div
      className={`flex items-center gap-3 px-5 py-3.5 rounded-2xl border backdrop-blur-xl shadow-2xl transition-all duration-300 ${colors[type]} ${
        isLeaving ? 'translate-x-full opacity-0' : 'translate-x-0 opacity-100'
      }`}
    >
      <span className="material-symbols-outlined text-xl">{icons[type]}</span>
      <p className="text-sm font-medium flex-1">{message}</p>
      <button onClick={() => { setIsLeaving(true); setTimeout(onClose, 300); }} className="opacity-60 hover:opacity-100 transition-opacity">
        <span className="material-symbols-outlined text-lg">close</span>
      </button>
    </div>
  );
}

function ToastContainer({ toasts, removeToast }) {
  return (
    <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 max-w-sm w-full pointer-events-none">
      {toasts.map((toast) => (
        <div key={toast.id} className="pointer-events-auto">
          <ToastNotification
            message={toast.message}
            type={toast.type}
            duration={toast.duration}
            onClose={() => removeToast(toast.id)}
          />
        </div>
      ))}
    </div>
  );
}

// Hook for easy toast management
export function useToasts() {
  const [toasts, setToasts] = useState([]);

  const addToast = (message, type = 'info', duration = 5000) => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, message, type, duration }]);
  };

  const removeToast = (id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return { toasts, addToast, removeToast };
}

export default ToastContainer;
