import { motion } from "framer-motion";

export default function DataFlowIndicator({
  direction = "horizontal",
  color = "#4fdbc8",
  width = "100%",
  speed = 2,
  className = "",
}) {
  const isHorizontal = direction === "horizontal";

  return (
    <div
      className={`relative overflow-hidden ${className}`}
      style={{
        width: isHorizontal ? width : 2,
        height: isHorizontal ? 2 : width,
      }}
    >
      {/* Base line */}
      <div
        className="absolute inset-0"
        style={{ background: `${color}15` }}
      />

      {/* Scanning pulse */}
      <motion.div
        className="absolute"
        style={{
          width: isHorizontal ? "30%" : "100%",
          height: isHorizontal ? "100%" : "30%",
          background: isHorizontal
            ? `linear-gradient(90deg, transparent, ${color}, transparent)`
            : `linear-gradient(180deg, transparent, ${color}, transparent)`,
          [isHorizontal ? "top" : "left"]: 0,
        }}
        animate={{
          [isHorizontal ? "left" : "top"]: ["-30%", "100%"],
        }}
        transition={{
          duration: speed,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />

      {/* Dots */}
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          className="absolute rounded-full"
          style={{
            width: 4,
            height: 4,
            background: color,
            boxShadow: `0 0 6px ${color}`,
            top: isHorizontal ? -1 : undefined,
            left: isHorizontal ? undefined : -1,
          }}
          animate={{
            [isHorizontal ? "left" : "top"]: ["-5%", "105%"],
            opacity: [0, 1, 1, 0],
          }}
          transition={{
            duration: speed * 1.5,
            delay: i * (speed / 3),
            repeat: Infinity,
            ease: "linear",
          }}
        />
      ))}
    </div>
  );
}
