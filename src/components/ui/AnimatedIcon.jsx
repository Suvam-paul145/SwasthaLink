import { motion } from "framer-motion";

const ANIMATIONS = {
  float: {
    animate: { y: [0, -6, 0] },
    transition: { duration: 3, repeat: Infinity, ease: "easeInOut" },
  },
  pulse: {
    animate: { scale: [1, 1.15, 1] },
    transition: { duration: 2, repeat: Infinity, ease: "easeInOut" },
  },
  spin: {
    animate: { rotate: 360 },
    transition: { duration: 8, repeat: Infinity, ease: "linear" },
  },
  orbit: {
    animate: { rotate: [0, 360] },
    transition: { duration: 12, repeat: Infinity, ease: "linear" },
  },
  glow: {
    animate: { opacity: [0.5, 1, 0.5], scale: [0.95, 1.05, 0.95] },
    transition: { duration: 2.5, repeat: Infinity, ease: "easeInOut" },
  },
  bounce: {
    animate: { y: [0, -10, 0] },
    transition: { duration: 1.5, repeat: Infinity, ease: "easeInOut" },
  },
};

const GLOW_COLORS = {
  teal: { bg: "bg-teal-500/10", border: "border-teal-500/20", shadow: "shadow-teal-500/20", icon: "text-teal-400" },
  purple: { bg: "bg-indigo-500/10", border: "border-indigo-500/20", shadow: "shadow-indigo-500/20", icon: "text-indigo-400" },
  cyan: { bg: "bg-cyan-500/10", border: "border-cyan-500/20", shadow: "shadow-cyan-500/20", icon: "text-cyan-400" },
  rose: { bg: "bg-rose-500/10", border: "border-rose-500/20", shadow: "shadow-rose-500/20", icon: "text-rose-400" },
  amber: { bg: "bg-amber-500/10", border: "border-amber-500/20", shadow: "shadow-amber-500/20", icon: "text-amber-400" },
  emerald: { bg: "bg-emerald-500/10", border: "border-emerald-500/20", shadow: "shadow-emerald-500/20", icon: "text-emerald-400" },
};

export default function AnimatedIcon({
  icon: Icon,
  animation = "float",
  color = "teal",
  size = 24,
  containerSize = 48,
  withGlow = true,
  className = "",
  ...props
}) {
  const anim = ANIMATIONS[animation] || ANIMATIONS.float;
  const glowStyle = GLOW_COLORS[color] || GLOW_COLORS.teal;

  return (
    <motion.div
      className={`inline-flex items-center justify-center relative ${className}`}
      style={{ width: containerSize, height: containerSize }}
      {...anim}
      {...props}
    >
      {withGlow && (
        <div
          className={`absolute inset-0 rounded-xl ${glowStyle.bg} border ${glowStyle.border} shadow-lg ${glowStyle.shadow}`}
        />
      )}
      <Icon size={size} className={`relative z-10 ${glowStyle.icon}`} />
    </motion.div>
  );
}
