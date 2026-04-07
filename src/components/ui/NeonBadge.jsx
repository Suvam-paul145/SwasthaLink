import { motion } from "framer-motion";

const BADGE_STYLES = {
  teal: {
    bg: "bg-teal-500/10",
    border: "border-teal-500/30",
    text: "text-teal-300",
    glow: "shadow-[0_0_8px_rgba(79,219,200,0.3)]",
    dot: "bg-teal-400",
  },
  purple: {
    bg: "bg-indigo-500/10",
    border: "border-indigo-500/30",
    text: "text-indigo-300",
    glow: "shadow-[0_0_8px_rgba(129,140,248,0.3)]",
    dot: "bg-indigo-400",
  },
  cyan: {
    bg: "bg-cyan-500/10",
    border: "border-cyan-500/30",
    text: "text-cyan-300",
    glow: "shadow-[0_0_8px_rgba(34,211,238,0.3)]",
    dot: "bg-cyan-400",
  },
  rose: {
    bg: "bg-rose-500/10",
    border: "border-rose-500/30",
    text: "text-rose-300",
    glow: "shadow-[0_0_8px_rgba(244,63,94,0.3)]",
    dot: "bg-rose-400",
  },
  amber: {
    bg: "bg-amber-500/10",
    border: "border-amber-500/30",
    text: "text-amber-300",
    glow: "shadow-[0_0_8px_rgba(245,158,11,0.3)]",
    dot: "bg-amber-400",
  },
  emerald: {
    bg: "bg-emerald-500/10",
    border: "border-emerald-500/30",
    text: "text-emerald-300",
    glow: "shadow-[0_0_8px_rgba(52,211,153,0.3)]",
    dot: "bg-emerald-400",
  },
};

export default function NeonBadge({
  children,
  color = "teal",
  icon: Icon,
  dot = false,
  pulse = false,
  size = "md",
  className = "",
  ...props
}) {
  const style = BADGE_STYLES[color] || BADGE_STYLES.teal;
  const sizeClass = size === "sm" ? "px-2 py-0.5 text-[10px]" : size === "lg" ? "px-4 py-1.5 text-sm" : "px-3 py-1 text-xs";

  return (
    <motion.span
      className={`
        inline-flex items-center gap-1.5 rounded-full font-medium
        border backdrop-blur-sm
        ${style.bg} ${style.border} ${style.text} ${style.glow}
        ${sizeClass} ${className}
      `}
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: "spring", stiffness: 400, damping: 20 }}
      {...props}
    >
      {dot && (
        <span className="relative flex h-2 w-2">
          {pulse && (
            <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${style.dot} opacity-75`} />
          )}
          <span className={`relative inline-flex rounded-full h-2 w-2 ${style.dot}`} />
        </span>
      )}
      {Icon && <Icon size={size === "sm" ? 10 : size === "lg" ? 16 : 12} />}
      {children}
    </motion.span>
  );
}
