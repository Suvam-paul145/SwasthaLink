import { useRef, useCallback, useState } from "react";
import { motion } from "framer-motion";

export default function GlassCard({
  children,
  className = "",
  tilt = true,
  glow = true,
  glowColor = "79, 219, 200",
  hoverScale = 1.02,
  borderGradient = false,
  onClick,
  ...props
}) {
  const cardRef = useRef(null);
  const [transform, setTransform] = useState("");
  const [glowPos, setGlowPos] = useState({ x: 50, y: 50 });
  const rafRef = useRef(null);

  const handleMouseMove = useCallback(
    (e) => {
      if (!tilt || !cardRef.current) return;
      if (rafRef.current) return;

      rafRef.current = requestAnimationFrame(() => {
        const rect = cardRef.current?.getBoundingClientRect();
        if (!rect) { rafRef.current = null; return; }
        const x = (e.clientX - rect.left) / rect.width;
        const y = (e.clientY - rect.top) / rect.height;
        const tiltX = (y - 0.5) * -8;
        const tiltY = (x - 0.5) * 8;

        setTransform(`perspective(800px) rotateX(${tiltX}deg) rotateY(${tiltY}deg)`);
        setGlowPos({ x: x * 100, y: y * 100 });
        rafRef.current = null;
      });
    },
    [tilt]
  );

  const handleMouseLeave = useCallback(() => {
    setTransform("");
    setGlowPos({ x: 50, y: 50 });
  }, []);

  return (
    <motion.div
      ref={cardRef}
      className={`
        relative rounded-2xl overflow-hidden
        bg-[#071325]/85 backdrop-blur-xl
        ${borderGradient ? "" : "border border-white/[0.1]"}
        transition-transform duration-200 ease-out
        ${onClick ? "cursor-pointer" : ""}
        ${className}
      `}
      style={{ transform: transform || undefined }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      whileHover={{ scale: hoverScale }}
      onClick={onClick}
      {...props}
    >
      {/* Border gradient overlay */}
      {borderGradient && (
        <div
          className="absolute inset-0 rounded-2xl pointer-events-none"
          style={{
            padding: 1,
            background: "linear-gradient(135deg, rgba(79,219,200,0.3), rgba(129,140,248,0.2), rgba(79,219,200,0.1))",
            WebkitMask: "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)",
            WebkitMaskComposite: "xor",
            maskComposite: "exclude",
          }}
        />
      )}

      {/* Hover glow follow */}
      {glow && (
        <div
          className="absolute inset-0 rounded-2xl pointer-events-none opacity-0 hover-parent-glow transition-opacity duration-300"
          style={{
            background: `radial-gradient(circle at ${glowPos.x}% ${glowPos.y}%, rgba(${glowColor}, 0.12) 0%, transparent 60%)`,
          }}
        />
      )}

      {/* Content */}
      <div className="relative z-10">{children}</div>
    </motion.div>
  );
}
