import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

export default function LoadingScreen({ minDuration = 1800 }) {
  const [isLoading, setIsLoading] = useState(true);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const start = Date.now();
    const interval = setInterval(() => {
      setProgress((p) => {
        if (p >= 100) {
          clearInterval(interval);
          return 100;
        }
        return p + Math.random() * 15 + 5;
      });
    }, 120);

    const timer = setTimeout(() => {
      clearInterval(interval);
      setProgress(100);
      setTimeout(() => setIsLoading(false), 400);
    }, minDuration);

    return () => {
      clearInterval(interval);
      clearTimeout(timer);
    };
  }, [minDuration]);

  return (
    <AnimatePresence>
      {isLoading && (
        <motion.div
          className="fixed inset-0 z-[99999] flex flex-col items-center justify-center"
          style={{ background: "linear-gradient(135deg, #050d1a 0%, #071325 40%, #0a1628 100%)" }}
          exit={{ opacity: 0, scale: 1.05 }}
          transition={{ duration: 0.6, ease: [0.4, 0, 0.2, 1] }}
        >
          {/* Background pulse rings */}
          <div className="absolute inset-0 flex items-center justify-center overflow-hidden">
            {[1, 2, 3].map((i) => (
              <motion.div
                key={i}
                className="absolute rounded-full border border-teal-500/10"
                style={{ width: i * 250, height: i * 250 }}
                animate={{
                  scale: [1, 1.3, 1],
                  opacity: [0.3, 0.05, 0.3],
                }}
                transition={{
                  duration: 3,
                  delay: i * 0.5,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
              />
            ))}
          </div>

          {/* Logo & spinner */}
          <div className="relative z-10 flex flex-col items-center gap-6">
            {/* Animated DNA helix icon */}
            <motion.div
              className="relative"
              animate={{ rotateY: 360 }}
              transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
            >
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-teal-400 to-cyan-500 flex items-center justify-center shadow-lg shadow-teal-500/30">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M2 15c6.667-6 13.333 0 20-6" />
                  <path d="M9 22c1.798-1.998 2.518-3.995 2.807-5.993" />
                  <path d="M15 2c-1.798 1.998-2.518 3.995-2.807 5.993" />
                  <path d="M2 9c6.667 6 13.333 0 20 6" />
                </svg>
              </div>
              <motion.div
                className="absolute -inset-2 rounded-2xl border-2 border-teal-400/30"
                animate={{ scale: [1, 1.15, 1], opacity: [0.5, 0, 0.5] }}
                transition={{ duration: 2, repeat: Infinity }}
              />
            </motion.div>

            {/* Brand name */}
            <motion.div
              className="text-center"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <h1 className="text-2xl font-bold bg-gradient-to-r from-teal-400 via-cyan-400 to-teal-300 bg-clip-text text-transparent">
                SwasthaLink
              </h1>
              <p className="text-xs text-slate-500 mt-1 tracking-widest uppercase">AI Health Companion</p>
            </motion.div>

            {/* Progress bar */}
            <div className="w-48 h-1 bg-slate-800 rounded-full overflow-hidden mt-2">
              <motion.div
                className="h-full rounded-full"
                style={{
                  background: "linear-gradient(90deg, #4fdbc8, #818cf8, #4fdbc8)",
                  backgroundSize: "200% 100%",
                }}
                animate={{
                  width: `${Math.min(progress, 100)}%`,
                  backgroundPosition: ["0% 0%", "200% 0%"],
                }}
                transition={{
                  width: { duration: 0.3 },
                  backgroundPosition: { duration: 2, repeat: Infinity, ease: "linear" },
                }}
              />
            </div>

            {/* Loading text */}
            <motion.p
              className="text-xs text-slate-600"
              animate={{ opacity: [0.4, 1, 0.4] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            >
              Initializing neural systems…
            </motion.p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
