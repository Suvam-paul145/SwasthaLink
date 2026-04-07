import { useRef, useCallback } from "react";
import { motion } from "framer-motion";

const VARIANTS = {
  primary: {
    bg: "bg-gradient-to-r from-teal-500 to-cyan-500",
    glow: "shadow-teal-500/25",
    ripple: "bg-white/30",
    text: "text-white",
    border: "",
  },
  secondary: {
    bg: "bg-white/5",
    glow: "shadow-teal-500/10",
    ripple: "bg-teal-400/20",
    text: "text-teal-300",
    border: "border border-teal-500/30",
  },
  ghost: {
    bg: "bg-transparent",
    glow: "",
    ripple: "bg-teal-400/10",
    text: "text-teal-400",
    border: "border border-transparent hover:border-teal-500/20",
  },
  danger: {
    bg: "bg-gradient-to-r from-rose-500 to-pink-500",
    glow: "shadow-rose-500/25",
    ripple: "bg-white/30",
    text: "text-white",
    border: "",
  },
  neon: {
    bg: "bg-transparent",
    glow: "shadow-[0_0_15px_rgba(79,219,200,0.3)]",
    ripple: "bg-teal-400/20",
    text: "text-teal-300",
    border: "border border-teal-400/60",
  },
};

const SIZES = {
  sm: "px-3 py-1.5 text-xs gap-1.5 rounded-lg",
  md: "px-5 py-2.5 text-sm gap-2 rounded-xl",
  lg: "px-7 py-3.5 text-base gap-2.5 rounded-xl",
};

export default function GlowButton({
  children,
  variant = "primary",
  size = "md",
  icon: Icon,
  iconRight: IconRight,
  className = "",
  disabled = false,
  loading = false,
  onClick,
  ...props
}) {
  const btnRef = useRef(null);

  const handleClick = useCallback(
    (e) => {
      if (disabled || loading) return;

      // Ripple effect
      const btn = btnRef.current;
      if (btn) {
        const rect = btn.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const ripple = document.createElement("span");
        const size = Math.max(rect.width, rect.height) * 2;
        ripple.style.cssText = `
          position:absolute;width:${size}px;height:${size}px;
          left:${x - size / 2}px;top:${y - size / 2}px;
          border-radius:50%;transform:scale(0);
          animation:glow-btn-ripple 0.6s ease-out forwards;
          pointer-events:none;
        `;
        ripple.className = VARIANTS[variant].ripple;
        btn.appendChild(ripple);
        setTimeout(() => ripple.remove(), 600);
      }

      onClick?.(e);
    },
    [disabled, loading, onClick, variant]
  );

  const v = VARIANTS[variant];
  const s = SIZES[size];

  return (
    <motion.button
      ref={btnRef}
      className={`
        relative overflow-hidden inline-flex items-center justify-center font-medium
        transition-all duration-300 cursor-pointer select-none
        ${v.bg} ${v.text} ${v.border} ${v.glow && `shadow-lg ${v.glow}`}
        ${s}
        ${disabled || loading ? "opacity-50 cursor-not-allowed" : "hover:shadow-xl hover:brightness-110 active:scale-[0.97]"}
        ${className}
      `}
      whileHover={!disabled && !loading ? { scale: 1.02, y: -1 } : {}}
      whileTap={!disabled && !loading ? { scale: 0.97 } : {}}
      onClick={handleClick}
      disabled={disabled || loading}
      {...props}
    >
      {loading && (
        <motion.span
          className="w-4 h-4 border-2 border-current border-t-transparent rounded-full"
          animate={{ rotate: 360 }}
          transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
        />
      )}
      {!loading && Icon && <Icon size={size === "sm" ? 14 : size === "lg" ? 20 : 16} />}
      <span>{children}</span>
      {!loading && IconRight && <IconRight size={size === "sm" ? 14 : size === "lg" ? 20 : 16} />}
    </motion.button>
  );
}
