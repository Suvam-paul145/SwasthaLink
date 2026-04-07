import { useRef, useEffect, useState } from 'react';
import { motion } from 'framer-motion';

function useCountUp(target, duration = 1500) {
  const [count, setCount] = useState(0);
  const frameRef = useRef(null);

  useEffect(() => {
    const numTarget = typeof target === 'number' ? target : parseInt(target, 10);
    if (isNaN(numTarget)) { setCount(target); return; }

    let startTime = null;
    const animate = (timestamp) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
      setCount(Math.round(eased * numTarget));
      if (progress < 1) frameRef.current = requestAnimationFrame(animate);
    };
    frameRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frameRef.current);
  }, [target, duration]);

  return count;
}

export function AnimatedStatCard({
  title,
  value,
  suffix = '',
  icon,
  trend,
  trendLabel,
  gradient = 'from-teal-400 to-cyan-400',
  delay = 0,
  sparkline,
}) {
  const animatedValue = useCountUp(typeof value === 'number' ? value : 0);
  const displayValue = typeof value === 'number' ? animatedValue : value;

  return (
    <motion.div
      initial={{ opacity: 0, y: 30, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.5, delay, ease: [0.25, 0.46, 0.45, 0.94] }}
      whileHover={{ y: -4, transition: { duration: 0.2 } }}
      className="relative group"
    >
      <div className="relative rounded-2xl border border-white/[0.08] bg-white/[0.03] backdrop-blur-xl p-5 overflow-hidden">
        {/* Background glow effect */}
        <div className={`absolute -top-10 -right-10 w-32 h-32 rounded-full bg-gradient-to-br ${gradient} opacity-[0.07] blur-2xl group-hover:opacity-[0.15] transition-all duration-500`} />

        {/* Sparkline background */}
        {sparkline && (
          <div className="absolute bottom-0 left-0 right-0 h-12 opacity-10">
            <svg className="w-full h-full" preserveAspectRatio="none" viewBox={`0 0 ${sparkline.length} 20`}>
              <polyline
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                className={`text-teal-400`}
                points={sparkline.map((v, i) => `${i},${20 - v}`).join(' ')}
              />
            </svg>
          </div>
        )}

        <div className="relative z-10 flex items-start justify-between">
          <div className="space-y-3">
            <p className="text-[10px] uppercase tracking-[0.18em] text-slate-400 font-bold">{title}</p>
            <div className="flex items-baseline gap-1">
              <motion.span
                key={displayValue}
                className="text-3xl font-headline font-extrabold text-white"
              >
                {displayValue}
              </motion.span>
              {suffix && <span className="text-sm text-slate-400 font-semibold">{suffix}</span>}
            </div>
            {trend !== undefined && (
              <div className={`flex items-center gap-1 text-[11px] font-semibold ${
                trend > 0 ? 'text-emerald-400' : trend < 0 ? 'text-rose-400' : 'text-slate-400'
              }`}>
                <span className="material-symbols-outlined text-sm">
                  {trend > 0 ? 'trending_up' : trend < 0 ? 'trending_down' : 'trending_flat'}
                </span>
                {Math.abs(trend)}% {trendLabel || 'vs last week'}
              </div>
            )}
          </div>
          <motion.div
            whileHover={{ rotate: 15, scale: 1.1 }}
            transition={{ duration: 0.2 }}
            className={`w-12 h-12 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center shadow-lg`}
            style={{ boxShadow: `0 8px 24px rgba(0,0,0,0.2)` }}
          >
            <span className="material-symbols-outlined text-white text-xl" style={{ fontVariationSettings: "'FILL' 1" }}>
              {icon}
            </span>
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
}

export function AnimatedProgressRing({ value = 75, size = 120, strokeWidth = 8, color = '#4fdbc8', label = '' }) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5 }}
      className="relative inline-flex items-center justify-center"
    >
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.05)"
          strokeWidth={strokeWidth}
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: circumference * (1 - value / 100) }}
          transition={{ duration: 1.5, ease: 'easeOut' }}
          style={{ filter: `drop-shadow(0 0 6px ${color}40)` }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-extrabold text-white">{value}%</span>
        {label && <span className="text-[9px] text-slate-400 uppercase tracking-wider mt-0.5">{label}</span>}
      </div>
    </motion.div>
  );
}

export function LivePulseIndicator({ status = 'active', label }) {
  const colors = {
    active: 'bg-emerald-400',
    warning: 'bg-amber-400',
    error: 'bg-rose-400',
    idle: 'bg-slate-400',
  };

  return (
    <div className="flex items-center gap-2">
      <span className="relative flex h-2.5 w-2.5">
        <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${colors[status]} opacity-75`} />
        <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${colors[status]}`} />
      </span>
      {label && <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">{label}</span>}
    </div>
  );
}

export default AnimatedStatCard;
