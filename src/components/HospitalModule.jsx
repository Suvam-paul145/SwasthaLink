import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const HOSPITAL_FEATURES = [
  { id: 'bed-tracking', icon: 'bed', label: 'Bed Tracking', description: 'Real-time bed availability' },
  { id: 'opd-queue', icon: 'queue', label: 'OPD Queue', description: 'Live outpatient queue status' },
  { id: 'lab-results', icon: 'biotech', label: 'Lab Results', description: 'Access laboratory reports' },
  { id: 'pharmacy', icon: 'local_pharmacy', label: 'Pharmacy', description: 'Medicine availability & orders' },
  { id: 'appointments', icon: 'calendar_month', label: 'Appointments', description: 'Schedule & manage visits' },
  { id: 'emergency', icon: 'emergency', label: 'Emergency', description: 'Emergency contacts & info' },
];

function HospitalModule({ enabled = true, onToggle }) {
  const [expandedFeature, setExpandedFeature] = useState(null);

  if (!enabled) {
    return (
      <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.015] p-6 text-center">
        <span className="material-symbols-outlined text-3xl text-slate-600 mb-2 block">local_hospital</span>
        <p className="text-sm text-slate-400">Hospital Module Disabled</p>
        <p className="text-[10px] text-slate-500 mt-1">Enable this in settings to access hospital services</p>
        {onToggle && (
          <button
            onClick={() => onToggle(true)}
            className="mt-3 px-4 py-2 rounded-xl bg-teal-500/10 border border-teal-400/20 text-xs text-teal-300 font-semibold hover:bg-teal-500/20 transition-all"
          >
            Enable Hospital Module
          </button>
        )}
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="rounded-2xl border border-white/10 bg-white/[0.03] overflow-hidden"
    >
      <div className="px-5 py-4 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-rose-400 to-pink-500 flex items-center justify-center">
            <span className="material-symbols-outlined text-white text-sm">local_hospital</span>
          </div>
          <div>
            <p className="text-sm font-bold text-white">Hospital Services</p>
            <p className="text-[10px] text-slate-400">Quick access to hospital facilities</p>
          </div>
        </div>
        {onToggle && (
          <button
            onClick={() => onToggle(false)}
            className="text-[10px] text-slate-400 hover:text-slate-300 transition-colors px-2 py-1 rounded-lg hover:bg-white/5"
          >
            Hide
          </button>
        )}
      </div>

      <div className="p-4 grid grid-cols-2 sm:grid-cols-3 gap-3">
        {HOSPITAL_FEATURES.map((feature, index) => (
          <motion.button
            key={feature.id}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.05, duration: 0.3 }}
            onClick={() => setExpandedFeature(expandedFeature === feature.id ? null : feature.id)}
            className={`relative p-4 rounded-xl border text-left transition-all group ${
              expandedFeature === feature.id
                ? 'bg-teal-500/10 border-teal-400/30 shadow-[0_0_20px_rgba(45,212,191,0.1)]'
                : 'bg-white/[0.02] border-white/5 hover:bg-white/[0.05] hover:border-white/10'
            }`}
          >
            <span className={`material-symbols-outlined text-xl mb-2 block transition-colors ${
              expandedFeature === feature.id ? 'text-teal-300' : 'text-slate-400 group-hover:text-teal-300'
            }`}>
              {feature.icon}
            </span>
            <p className="text-xs font-semibold text-white">{feature.label}</p>
            <AnimatePresence>
              {expandedFeature === feature.id && (
                <motion.p
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="text-[10px] text-slate-400 mt-1"
                >
                  {feature.description}
                </motion.p>
              )}
            </AnimatePresence>
          </motion.button>
        ))}
      </div>
    </motion.div>
  );
}

export default HospitalModule;
