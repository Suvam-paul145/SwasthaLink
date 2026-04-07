import { useState, useEffect } from "react";
import { motion } from "framer-motion";

export default function ScrollProgress({ color = "#4fdbc8", height = 3 }) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      setProgress(docHeight > 0 ? (scrollTop / docHeight) * 100 : 0);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div className="fixed top-0 left-0 w-full z-[9998]" style={{ height }}>
      <motion.div
        className="h-full origin-left"
        style={{
          background: `linear-gradient(90deg, ${color}, #818cf8, ${color})`,
          backgroundSize: "200% 100%",
          width: `${progress}%`,
          boxShadow: `0 0 10px ${color}80, 0 0 20px ${color}40`,
        }}
        animate={{ backgroundPosition: ["0% 0%", "200% 0%"] }}
        transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
      />
    </div>
  );
}
