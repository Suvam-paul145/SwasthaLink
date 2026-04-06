function Logo({ size = 'md', showText = true, className = '' }) {
  const sizes = {
    sm: { container: 36, icon: 22 },
    md: { container: 48, icon: 28 },
    lg: { container: 64, icon: 36 },
    xl: { container: 80, icon: 44 },
  };

  const sizeConfig = sizes[size] || sizes.md;

  const textClass =
    size === 'sm' ? 'text-xs' : size === 'md' ? 'text-lg' : size === 'lg' ? 'text-2xl' : 'text-3xl';

  const subtitleClass =
    size === 'sm' ? 'text-[8px]' : size === 'md' ? 'text-[10px]' : size === 'lg' ? 'text-xs' : 'text-sm';

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <div
        style={{
          width: sizeConfig.container,
          height: sizeConfig.container,
        }}
        className="relative flex items-center justify-center overflow-hidden rounded-2xl border border-teal-200/40 bg-gradient-to-br from-teal-300/25 via-cyan-300/15 to-emerald-300/10 shadow-[0_0_24px_rgba(45,212,191,0.35)] transition-all hover:shadow-[0_0_32px_rgba(45,212,191,0.5)]"
      >
        <div className="absolute inset-0 bg-gradient-to-br from-white/8 via-transparent to-white/5" />
        <svg viewBox="0 0 100 100" width={sizeConfig.icon} height={sizeConfig.icon} className="relative z-10" aria-hidden="true">
          <circle cx="50" cy="50" r="44" fill="none" stroke="#22d3ee" strokeWidth="6" opacity="0.85" />
          <path d="M50 18 L62 40 L86 40 L66 56 L74 80 L50 66 L26 80 L34 56 L14 40 L38 40 Z" fill="#2dd4bf" opacity="0.92" />
          <path d="M50 27 V73" stroke="#071325" strokeWidth="8" strokeLinecap="round" />
          <path d="M27 50 H73" stroke="#071325" strokeWidth="8" strokeLinecap="round" />
          <circle cx="50" cy="50" r="8" fill="#22d3ee" opacity="0.95" />
        </svg>
      </div>

      {showText ? (
        <div>
          <div className={`bg-gradient-to-r from-teal-200 via-cyan-200 to-emerald-200 bg-clip-text font-black tracking-tight text-transparent ${textClass}`}>
            SwasthaLink
          </div>
          <p className={`${subtitleClass} font-semibold uppercase tracking-[0.2em] text-teal-200/70`}>
            Ethereal Clinic
          </p>
        </div>
      ) : null}
    </div>
  );
}

export default Logo;
