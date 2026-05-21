import { useState, useRef, useEffect } from 'react';
import { useLanguage } from '../context/LanguageContext';

export default function LanguageSelector({ compact = false }) {
  const { language, setLanguage, SUPPORTED_LANGUAGES } = useLanguage();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handleClick = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const current = SUPPORTED_LANGUAGES.find(l => l.code === language) || SUPPORTED_LANGUAGES[0];

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className={`flex items-center gap-2 bg-white/5 border border-white/[0.08] rounded-xl text-[13px] font-semibold text-slate-200 hover:bg-white/[0.08] active:scale-[0.98] transition-all duration-200 ${
          compact ? 'px-3 py-2 w-auto justify-center' : 'px-4 py-2.5 w-full justify-start'
        }`}
        title="Change Language"
      >
        <span className="material-symbols-outlined text-[18px] text-teal-300">translate</span>
        {!compact && <span>{current.nativeName}</span>}
        {!compact && (
          <span className="material-symbols-outlined text-base text-slate-500 ml-auto">
            {open ? 'expand_less' : 'expand_more'}
          </span>
        )}
      </button>

      {open && (
        <div
          className={`absolute left-0 min-w-[180px] bg-slate-800 border border-white/10 rounded-2xl p-1.5 z-[999] shadow-2xl shadow-black/50 ${
            compact ? 'top-full right-auto mt-1.5' : 'bottom-full right-0 mb-1.5'
          }`}
        >
          {SUPPORTED_LANGUAGES.map(lang => (
            <button
              key={lang.code}
              onClick={() => { setLanguage(lang.code); setOpen(false); }}
              className={`flex items-center gap-2.5 w-full px-3.5 py-2.5 border-none rounded-lg text-[13px] text-left transition-all duration-150 ${
                language === lang.code
                  ? 'bg-teal-500/20 text-teal-300 font-bold'
                  : 'bg-transparent text-slate-300 font-normal hover:bg-white/5 hover:text-slate-100'
              }`}
            >
              <span className="text-base">{lang.flag}</span>
              <span>{lang.nativeName}</span>
              <span className="text-[11px] text-slate-500 ml-auto">{lang.name}</span>
              {language === lang.code && (
                <span className="material-symbols-outlined text-base text-teal-400">check</span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
