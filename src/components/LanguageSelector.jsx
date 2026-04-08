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
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          display: 'flex', alignItems: 'center', gap: '8px',
          background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.08)',
          borderRadius: '12px', padding: compact ? '8px 12px' : '10px 16px',
          color: '#e2e8f0', fontSize: '13px', fontWeight: 600, cursor: 'pointer',
          transition: 'all .2s', width: compact ? 'auto' : '100%',
          justifyContent: compact ? 'center' : 'flex-start',
        }}
        title="Change Language"
      >
        <span className="material-symbols-outlined" style={{ fontSize: '18px', color: '#5eead4' }}>translate</span>
        {!compact && <span>{current.nativeName}</span>}
        {!compact && <span className="material-symbols-outlined" style={{ fontSize: '16px', color: '#64748b', marginLeft: 'auto' }}>{open ? 'expand_less' : 'expand_more'}</span>}
      </button>

      {open && (
        <div style={{
          position: 'absolute', bottom: compact ? 'auto' : '100%', top: compact ? '100%' : 'auto',
          left: 0, right: compact ? 'auto' : 0, minWidth: '180px',
          marginBottom: compact ? 0 : '6px', marginTop: compact ? '6px' : 0,
          background: '#1e293b', border: '1px solid rgba(255,255,255,.12)',
          borderRadius: '14px', padding: '6px', zIndex: 999,
          boxShadow: '0 12px 40px rgba(0,0,0,.5)',
        }}>
          {SUPPORTED_LANGUAGES.map(lang => (
            <button
              key={lang.code}
              onClick={() => { setLanguage(lang.code); setOpen(false); }}
              style={{
                display: 'flex', alignItems: 'center', gap: '10px', width: '100%',
                padding: '10px 14px', border: 'none', borderRadius: '10px',
                background: language === lang.code ? 'rgba(13,148,136,.2)' : 'transparent',
                color: language === lang.code ? '#5eead4' : '#cbd5e1',
                fontSize: '13px', fontWeight: language === lang.code ? 700 : 400,
                cursor: 'pointer', textAlign: 'left', transition: 'all .15s',
              }}
            >
              <span style={{ fontSize: '16px' }}>{lang.flag}</span>
              <span>{lang.nativeName}</span>
              <span style={{ fontSize: '11px', color: '#64748b', marginLeft: 'auto' }}>{lang.name}</span>
              {language === lang.code && (
                <span className="material-symbols-outlined" style={{ fontSize: '16px', color: '#2dd4bf' }}>check</span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
