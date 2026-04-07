import { useEffect, useRef, useState } from "react";

export default function CursorGlow({ color = "79, 219, 200", size = 350, opacity = 0.12, enabled = true }) {
  const glowRef = useRef(null);
  const posRef = useRef({ x: -500, y: -500 });
  const rafRef = useRef(null);

  useEffect(() => {
    if (!enabled) return;

    const handleMove = (e) => {
      posRef.current = { x: e.clientX, y: e.clientY };
      if (!rafRef.current) {
        rafRef.current = requestAnimationFrame(() => {
          if (glowRef.current) {
            glowRef.current.style.transform = `translate(${posRef.current.x - size / 2}px, ${posRef.current.y - size / 2}px)`;
          }
          rafRef.current = null;
        });
      }
    };

    const handleLeave = () => {
      if (glowRef.current) {
        glowRef.current.style.opacity = "0";
      }
    };

    const handleEnter = () => {
      if (glowRef.current) {
        glowRef.current.style.opacity = "1";
      }
    };

    window.addEventListener("mousemove", handleMove, { passive: true });
    document.addEventListener("mouseleave", handleLeave);
    document.addEventListener("mouseenter", handleEnter);

    return () => {
      window.removeEventListener("mousemove", handleMove);
      document.removeEventListener("mouseleave", handleLeave);
      document.removeEventListener("mouseenter", handleEnter);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [enabled, size]);

  if (!enabled) return null;

  return (
    <div
      ref={glowRef}
      className="fixed top-0 left-0 pointer-events-none z-[9999] transition-opacity duration-300"
      style={{
        width: size,
        height: size,
        background: `radial-gradient(circle, rgba(${color}, ${opacity}) 0%, rgba(${color}, 0.04) 40%, transparent 70%)`,
        borderRadius: "50%",
        willChange: "transform",
        mixBlendMode: "screen",
      }}
    />
  );
}
