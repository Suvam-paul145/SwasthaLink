import { motion } from "framer-motion";

const GRADIENTS = {
  teal: "from-teal-400 via-cyan-400 to-teal-300",
  purple: "from-indigo-400 via-purple-400 to-pink-400",
  sunset: "from-amber-400 via-orange-400 to-rose-400",
  ocean: "from-blue-400 via-cyan-400 to-teal-400",
  neon: "from-teal-400 via-emerald-400 to-cyan-300",
  cosmic: "from-purple-400 via-indigo-400 to-cyan-400",
};

export default function GradientText({
  children,
  gradient = "teal",
  as: Component = "span",
  animate = true,
  className = "",
  ...props
}) {
  const gradientClass = GRADIENTS[gradient] || gradient;

  const content = (
    <Component
      className={`bg-gradient-to-r ${gradientClass} bg-clip-text text-transparent ${animate ? "animate-gradient-shift bg-[length:200%_auto]" : ""} ${className}`}
      {...props}
    >
      {children}
    </Component>
  );

  if (animate) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.4, 0, 0.2, 1] }}
      >
        {content}
      </motion.div>
    );
  }

  return content;
}
