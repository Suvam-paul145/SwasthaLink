import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import ChatbotPanel from '../components/ChatbotPanel';

function FamilyDashboardPage() {
  const { user } = useAuth();
  const patientName = user?.name || 'Patient';
  const patientId = user?.id || user?.email || '';

  // Prescriptions state
  const [prescriptions, setPrescriptions] = useState([]);
  const [rxLoading, setRxLoading] = useState(true);
  const [selectedRx, setSelectedRx] = useState(null);

  // Chunks state
  const [medChunks, setMedChunks] = useState([]);
  const [routineChunks, setRoutineChunks] = useState([]);
  const [explanationChunks, setExplanationChunks] = useState([]);
  const [chunksLoading, setChunksLoading] = useState(true);

  // Active section tab
  const [activeSection, setActiveSection] = useState('overview');

  // ------- Fetch prescriptions -------
  useEffect(() => {
    if (!patientId) { setRxLoading(false); return; }
    let isMounted = true;

    const fetchPrescriptions = async (isInitial = false) => {
      if (isInitial && isMounted) setRxLoading(true);
      try {
        const result = await api.getPatientPrescriptions(patientId);
        if (isMounted) setPrescriptions(result.items || []);
      } catch (err) {
        console.warn('Failed to load prescriptions:', err.message);
      } finally {
        if (isInitial && isMounted) setRxLoading(false);
      }
    };

    fetchPrescriptions(true);
    const intervalId = setInterval(() => fetchPrescriptions(false), 10000);
    return () => { isMounted = false; clearInterval(intervalId); };
  }, [patientId]);

  // ------- Fetch chunks -------
  useEffect(() => {
    if (!patientId) { setChunksLoading(false); return; }
    let isMounted = true;

    const fetchChunks = async () => {
      setChunksLoading(true);
      try {
        const [medResult, routineResult, explResult] = await Promise.all([
          api.getPatientChunksByType(patientId, 'medication').catch(() => ({ items: [] })),
          api.getPatientChunksByType(patientId, 'routine').catch(() => ({ items: [] })),
          api.getPatientChunksByType(patientId, 'explanation').catch(() => ({ items: [] })),
        ]);
        if (isMounted) {
          setMedChunks(medResult.items || []);
          setRoutineChunks(routineResult.items || []);
          setExplanationChunks(explResult.items || []);
        }
      } catch (err) {
        console.warn('Failed to load chunks:', err.message);
      } finally {
        if (isMounted) setChunksLoading(false);
      }
    };

    fetchChunks();
    return () => { isMounted = false; };
  }, [patientId]);

  // ------- Derived data -------
  const latestRx = prescriptions[0];
  const insights = latestRx?.extracted_data?.patient_insights || latestRx?.patient_insights;
  const extracted = latestRx?.extracted_data || latestRx || {};

  // Flatten medication data from chunks
  const allMedications = medChunks.flatMap(c => c.data?.medications || []);
  const allInstructions = routineChunks.flatMap(c => c.data?.instructions || []);
  const allExplanations = explanationChunks.flatMap(c => c.data?.details || []);

  // Recovery timeline from medication durations
  const recoveryItems = allMedications
    .filter(m => m.duration && m.duration !== 'As prescribed')
    .map(m => ({
      name: m.name,
      duration: m.duration,
      dosage: m.dosage,
    }));

  // Section tabs
  const sections = [
    { id: 'overview', label: 'Overview', icon: 'dashboard' },
    { id: 'medications', label: 'Medications', icon: 'medication', count: allMedications.length },
    { id: 'routine', label: 'Daily Routine', icon: 'schedule', count: allInstructions.length },
    { id: 'recovery', label: 'Recovery', icon: 'trending_up', count: recoveryItems.length },
    { id: 'explanations', label: 'Why This Medicine', icon: 'help', count: allExplanations.length },
    { id: 'documents', label: 'Documents', icon: 'folder_supervised', count: prescriptions.length },
  ];

  return (
    <div className="min-h-screen bg-[#070e17] text-white p-6 lg:p-10 relative overflow-hidden pb-32">
      {/* Ambient glow */}
      <div className="absolute -top-28 -right-20 w-72 h-72 bg-teal-400/10 rounded-full blur-[100px]" />
      <div className="absolute -bottom-32 -left-20 w-80 h-80 bg-cyan-400/10 rounded-full blur-[120px]" />

      <div className="max-w-7xl mx-auto space-y-8 relative z-10">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <span className="bg-teal-500/20 text-teal-300 px-3 py-1 rounded-full text-[10px] font-bold tracking-[0.2em] uppercase border border-teal-500/20">AI Clinical Insights</span>
              <div className="flex items-center gap-2 text-primary text-xs font-medium uppercase tracking-wider">
                <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                Dynamic Profile
              </div>
            </div>
            <h1 className="text-4xl md:text-5xl font-headline font-extrabold tracking-tight text-white">Family Dashboard</h1>
            <p className="text-slate-300 text-lg max-w-xl font-light">
              AI-generated clinical insights and care tracking for <span className="text-teal-300 font-semibold">{patientName}</span>.
            </p>
          </div>
          <div className="flex gap-4 w-full md:w-auto">
            <button className="flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-error/90 text-white font-bold hover:shadow-[0_8px_20px_rgba(255,84,73,0.3)] transition-all text-sm">
              <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>emergency</span> Emergency Contact
            </button>
          </div>
        </div>

        {/* Section Tabs */}
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          {sections.map((sec) => (
            <button
              key={sec.id}
              onClick={() => setActiveSection(sec.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider whitespace-nowrap transition-all border ${
                activeSection === sec.id
                  ? 'bg-teal-500/20 text-teal-300 border-teal-500/30 shadow-[0_4px_12px_rgba(45,212,191,0.15)]'
                  : 'bg-white/[0.03] text-slate-400 border-white/5 hover:bg-white/[0.06] hover:text-white'
              }`}
            >
              <span className="material-symbols-outlined text-[16px]">{sec.icon}</span>
              {sec.label}
              {sec.count > 0 && (
                <span className={`ml-1 px-1.5 py-0.5 rounded-md text-[10px] font-bold ${
                  activeSection === sec.id ? 'bg-teal-500/30 text-teal-200' : 'bg-white/10 text-slate-500'
                }`}>{sec.count}</span>
              )}
            </button>
          ))}
        </div>

        {/* ====================== OVERVIEW SECTION ====================== */}
        {activeSection === 'overview' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
            {/* Clinical Status */}
            <div className="glass-card p-8 rounded-3xl border border-white/10 space-y-6 flex flex-col justify-between relative overflow-hidden group">
              <div className="absolute right-[-20px] top-[-20px] w-32 h-32 bg-primary opacity-10 rounded-full blur-3xl group-hover:opacity-20 transition-all" />
              <div className="flex justify-between items-start relative z-10">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400">Clinical Status</p>
                  <h4 className="text-2xl font-headline font-extrabold text-white mt-2">Current Condition</h4>
                </div>
                <span className="material-symbols-outlined text-primary bg-primary/10 p-3 rounded-2xl">monitoring</span>
              </div>
              <div className="flex-1 relative z-10">
                {rxLoading ? (
                  <div className="animate-pulse flex flex-col gap-2 mt-4">
                    <div className="h-4 bg-white/10 rounded w-3/4" />
                    <div className="h-4 bg-white/10 rounded w-full" />
                    <div className="h-4 bg-white/10 rounded w-5/6" />
                  </div>
                ) : insights?.current_condition_summary ? (
                  <p className="text-sm text-slate-300 leading-relaxed font-medium mt-4">{insights.current_condition_summary}</p>
                ) : (
                  <p className="text-sm text-slate-500 italic mt-4">Waiting for physician document processing to generate clinical status.</p>
                )}
              </div>
              <div className="flex items-center justify-between text-[10px] text-slate-500 font-bold uppercase tracking-widest pt-4 border-t border-white/5 relative z-10">
                <span>AI Generated</span>
                <span className="text-primary">Auto-Updated</span>
              </div>
            </div>

            {/* Critical Instructions */}
            <div className="glass-card p-8 rounded-3xl border border-white/10 flex flex-col justify-between group relative overflow-hidden">
              <div className="absolute right-[-20px] top-[-20px] w-32 h-32 bg-amber-500 opacity-10 rounded-full blur-3xl group-hover:opacity-20 transition-all" />
              <div className="relative z-10 flex flex-col h-full">
                <div className="flex justify-between items-center mb-6">
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400">Important</p>
                    <h4 className="text-2xl font-headline font-extrabold text-white mt-2">Critical Instructions</h4>
                  </div>
                  <span className="material-symbols-outlined text-amber-400 bg-amber-400/10 p-2.5 rounded-xl">priority_high</span>
                </div>
                <div className="flex-1 overflow-y-auto pr-2">
                  {rxLoading ? (
                    <div className="animate-pulse space-y-3">
                      <div className="flex items-center gap-3"><div className="w-8 h-8 rounded-lg bg-white/10 shrink-0" /><div className="h-3 bg-white/10 rounded w-full" /></div>
                      <div className="flex items-center gap-3"><div className="w-8 h-8 rounded-lg bg-white/10 shrink-0" /><div className="h-3 bg-white/10 rounded w-5/6" /></div>
                    </div>
                  ) : insights?.critical_instructions?.length > 0 ? (
                    <ul className="space-y-4">
                      {insights.critical_instructions.map((inst, idx) => (
                        <li key={idx} className="flex gap-4">
                          <div className="w-8 h-8 shrink-0 rounded-lg bg-amber-500/10 flex items-center justify-center border border-amber-500/20 text-amber-400 font-headline font-bold text-xs">{idx + 1}</div>
                          <p className="text-sm text-slate-300 leading-snug">{inst}</p>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-slate-500 italic">No critical instructions extracted.</p>
                  )}
                </div>
              </div>
            </div>

            {/* Lifestyle Changes */}
            <div className="glass-card p-8 rounded-3xl border border-white/10 space-y-6 flex flex-col justify-between relative overflow-hidden group">
              <div className="absolute right-[-20px] top-[-20px] w-32 h-32 bg-cyan-500 opacity-10 rounded-full blur-3xl group-hover:opacity-20 transition-all" />
              <div className="flex justify-between items-start relative z-10">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400">Care Plan</p>
                  <h4 className="text-2xl font-headline font-extrabold text-white mt-2">Lifestyle Changes</h4>
                </div>
                <span className="material-symbols-outlined text-cyan-300 bg-cyan-300/10 p-3 rounded-2xl">self_improvement</span>
              </div>
              <div className="flex-1 relative z-10 overflow-y-auto pr-2">
                {rxLoading ? (
                  <div className="animate-pulse space-y-3 mt-4">
                    <div className="h-3 bg-white/10 rounded w-full" />
                    <div className="h-3 bg-white/10 rounded w-5/6" />
                  </div>
                ) : insights?.lifestyle_changes?.length > 0 ? (
                  <ul className="space-y-3 mt-2">
                    {insights.lifestyle_changes.map((change, idx) => (
                      <li key={idx} className="flex items-start gap-3">
                        <span className="material-symbols-outlined text-cyan-400 text-sm mt-0.5" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                        <span className="text-sm text-slate-300">{change}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-slate-500 italic mt-4">No specific lifestyle changes recommended.</p>
                )}
              </div>
            </div>

            {/* Doctor Info */}
            <div className="glass-card py-6 px-8 rounded-3xl border border-white/10 col-span-1 md:col-span-2 flex flex-col md:flex-row gap-8 items-center bg-white/[0.01]">
              <div className="relative shrink-0">
                <div className="w-20 h-20 rounded-2xl bg-surface-container flex items-center justify-center border-2 border-primary/20 p-1 relative overflow-hidden">
                  <span className="material-symbols-outlined text-4xl text-primary">stethoscope</span>
                </div>
                <div className="absolute -bottom-1 -right-1 bg-primary text-[#071325] p-0.5 rounded-lg border-2 border-[#071325]">
                  <span className="material-symbols-outlined text-[14px] font-bold">verified</span>
                </div>
              </div>
              <div className="flex-1 text-center md:text-left space-y-1">
                <p className="text-primary font-bold text-[10px] uppercase tracking-[0.2em] mb-1">Lead Physician</p>
                <h4 className="text-2xl font-headline font-bold text-white">
                  {extracted?.doctor_name ? `Dr. ${extracted.doctor_name}` : 'Pending Doctor Assignment'}
                </h4>
                <p className="text-slate-400 text-sm">{extracted?.diagnosis || 'Diagnosis Pending'}</p>
                <div className="flex flex-wrap justify-center md:justify-start gap-4 mt-3">
                  {insights?.follow_up_required && (
                    <div className="flex items-center gap-2 bg-primary/10 px-3 py-1.5 rounded-lg border border-primary/20">
                      <span className="material-symbols-outlined text-sm text-primary">event_available</span>
                      <span className="text-xs font-bold text-white uppercase tracking-wider">
                        Follow-up: {insights.follow_up_date || 'Recommended'}
                      </span>
                    </div>
                  )}
                </div>
              </div>
              <div className="flex gap-3 mt-4 md:mt-0">
                <button className="bg-white/5 hover:bg-white/10 transition-colors p-4 rounded-2xl border border-white/10 text-white group flex items-center justify-center" aria-label="Book Appointment">
                  <span className="material-symbols-outlined group-hover:scale-110 transition-transform">calendar_month</span>
                </button>
                <button className="bg-white/5 hover:bg-white/10 transition-colors p-4 rounded-2xl border border-white/10 text-white group flex items-center justify-center" aria-label="Message Doctor">
                  <span className="material-symbols-outlined group-hover:scale-110 transition-transform">chat</span>
                </button>
              </div>
            </div>

            {/* Clarity Center */}
            <div className="glass-card p-8 rounded-3xl border border-teal-500/20 bg-gradient-to-br from-teal-500/5 to-transparent flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-center mb-4">
                  <h4 className="text-xl font-headline font-extrabold text-white">Clarity Center</h4>
                  <span className="material-symbols-outlined text-teal-300">auto_awesome</span>
                </div>
                <p className="text-slate-400 text-sm leading-relaxed mb-6">
                  AI translation of complex medical jargon for clear family communication and translation.
                </p>
              </div>
              <a href="/clarity-hub" className="block text-center w-full py-3.5 rounded-xl bg-teal-400 text-[#071325] font-bold text-xs uppercase tracking-widest hover:shadow-[0_8px_16px_rgba(45,212,191,0.25)] transition-all">
                Go To Clarity Center
              </a>
            </div>
          </div>
        )}

        {/* ====================== MEDICATIONS SECTION ====================== */}
        {activeSection === 'medications' && (
          <div className="space-y-6">
            <div className="flex items-center gap-3 mb-2">
              <span className="material-symbols-outlined text-teal-300 text-2xl">medication</span>
              <div>
                <h2 className="text-2xl font-headline font-bold text-white">Medications</h2>
                <p className="text-sm text-slate-400">Your complete medication schedule and dosage details</p>
              </div>
            </div>

            {chunksLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[1, 2, 3].map(i => (
                  <div key={i} className="glass-card p-6 rounded-2xl border border-white/10 animate-pulse">
                    <div className="h-5 bg-white/10 rounded w-2/3 mb-4" />
                    <div className="h-3 bg-white/10 rounded w-full mb-2" />
                    <div className="h-3 bg-white/10 rounded w-4/5" />
                  </div>
                ))}
              </div>
            ) : allMedications.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {allMedications.map((med, i) => (
                  <div key={i} className="glass-card p-6 rounded-2xl border border-white/10 hover:border-teal-500/30 transition-all group relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-teal-500 opacity-5 rounded-full blur-2xl group-hover:opacity-10 transition-all" />
                    <div className="relative z-10">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-teal-500/10 flex items-center justify-center border border-teal-500/20">
                            <span className="material-symbols-outlined text-teal-300 text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>pill</span>
                          </div>
                          <div>
                            <h4 className="text-white font-bold text-sm">{med.name}</h4>
                            {med.form && <p className="text-[10px] text-slate-500 uppercase tracking-wider">{med.form}</p>}
                          </div>
                        </div>
                      </div>

                      <div className="space-y-3">
                        <div className="flex items-center gap-3 text-xs">
                          <span className="material-symbols-outlined text-cyan-400 text-[16px]">schedule</span>
                          <div>
                            <p className="text-[10px] text-slate-500 uppercase tracking-wider">Dosage</p>
                            <p className="text-slate-200 font-medium">{med.dosage}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 text-xs">
                          <span className="material-symbols-outlined text-amber-400 text-[16px]">calendar_today</span>
                          <div>
                            <p className="text-[10px] text-slate-500 uppercase tracking-wider">Duration</p>
                            <p className="text-slate-200 font-medium">{med.duration}</p>
                          </div>
                        </div>
                        <div className="flex items-start gap-3 text-xs">
                          <span className="material-symbols-outlined text-emerald-400 text-[16px]">info</span>
                          <div>
                            <p className="text-[10px] text-slate-500 uppercase tracking-wider">Usage</p>
                            <p className="text-slate-200 font-medium">{med.usage}</p>
                          </div>
                        </div>
                        {med.warnings && (
                          <div className="mt-2 p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs text-amber-200/90 flex items-start gap-2">
                            <span className="material-symbols-outlined text-amber-400 text-[14px] mt-0.5" style={{ fontVariationSettings: "'FILL' 1" }}>warning</span>
                            {med.warnings}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="glass-card p-12 rounded-2xl border border-white/10 text-center">
                <span className="material-symbols-outlined text-5xl text-slate-700 mb-4">medication</span>
                <h4 className="font-bold text-white text-lg mb-2">No Medication Data</h4>
                <p className="text-slate-500 text-sm">Medication details will appear after your doctor submits and admin approves your prescription.</p>
              </div>
            )}
          </div>
        )}

        {/* ====================== DAILY ROUTINE SECTION ====================== */}
        {activeSection === 'routine' && (
          <div className="space-y-6">
            <div className="flex items-center gap-3 mb-2">
              <span className="material-symbols-outlined text-cyan-300 text-2xl">schedule</span>
              <div>
                <h2 className="text-2xl font-headline font-bold text-white">Daily Routine</h2>
                <p className="text-sm text-slate-400">Step-by-step care instructions for your daily health routine</p>
              </div>
            </div>

            {chunksLoading ? (
              <div className="space-y-3">
                {[1, 2, 3, 4].map(i => (
                  <div key={i} className="glass-card p-4 rounded-xl border border-white/10 animate-pulse flex items-center gap-4">
                    <div className="w-10 h-10 rounded-lg bg-white/10 shrink-0" />
                    <div className="h-3 bg-white/10 rounded w-full" />
                  </div>
                ))}
              </div>
            ) : allInstructions.length > 0 ? (
              <div className="space-y-3">
                {allInstructions.map((inst, i) => (
                  <div key={i} className="glass-card p-5 rounded-xl border border-white/10 hover:border-cyan-500/30 transition-all flex items-start gap-4 group">
                    <div className="w-10 h-10 shrink-0 rounded-xl bg-cyan-500/10 flex items-center justify-center border border-cyan-500/20 text-cyan-300 font-headline font-bold text-sm group-hover:bg-cyan-500/20 transition-all">
                      {i + 1}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm text-slate-200 leading-relaxed">{inst}</p>
                    </div>
                    <span className="material-symbols-outlined text-cyan-500/30 group-hover:text-cyan-400/60 transition-colors text-[20px]">check_circle</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="glass-card p-12 rounded-2xl border border-white/10 text-center">
                <span className="material-symbols-outlined text-5xl text-slate-700 mb-4">schedule</span>
                <h4 className="font-bold text-white text-lg mb-2">No Routine Data</h4>
                <p className="text-slate-500 text-sm">Your daily care routine will be generated after prescription approval.</p>
              </div>
            )}
          </div>
        )}

        {/* ====================== RECOVERY TIMELINE SECTION ====================== */}
        {activeSection === 'recovery' && (
          <div className="space-y-6">
            <div className="flex items-center gap-3 mb-2">
              <span className="material-symbols-outlined text-emerald-300 text-2xl">trending_up</span>
              <div>
                <h2 className="text-2xl font-headline font-bold text-white">Recovery Timeline</h2>
                <p className="text-sm text-slate-400">Visual progress of your treatment durations</p>
              </div>
            </div>

            {chunksLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map(i => (
                  <div key={i} className="glass-card p-6 rounded-2xl border border-white/10 animate-pulse">
                    <div className="h-4 bg-white/10 rounded w-1/3 mb-4" />
                    <div className="h-6 bg-white/10 rounded w-full" />
                  </div>
                ))}
              </div>
            ) : recoveryItems.length > 0 ? (
              <div className="space-y-4">
                {recoveryItems.map((item, i) => {
                  // Parse duration for visual bar
                  const durationMatch = item.duration?.match(/(\d+)/);
                  const days = durationMatch ? parseInt(durationMatch[1]) : 7;
                  const maxDays = Math.max(...recoveryItems.map(r => {
                    const m = r.duration?.match(/(\d+)/);
                    return m ? parseInt(m[1]) : 7;
                  }));
                  const pct = Math.min((days / maxDays) * 100, 100);
                  const colors = ['from-teal-500 to-cyan-500', 'from-cyan-500 to-blue-500', 'from-emerald-500 to-teal-500', 'from-amber-500 to-orange-500', 'from-purple-500 to-pink-500'];

                  return (
                    <div key={i} className="glass-card p-6 rounded-2xl border border-white/10 hover:border-emerald-500/30 transition-all">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
                            <span className="material-symbols-outlined text-emerald-300 text-[16px]" style={{ fontVariationSettings: "'FILL' 1" }}>pill</span>
                          </div>
                          <div>
                            <h4 className="text-white font-bold text-sm">{item.name}</h4>
                            <p className="text-[10px] text-slate-500">{item.dosage}</p>
                          </div>
                        </div>
                        <span className="text-xs font-bold text-emerald-300 bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/20">{item.duration}</span>
                      </div>
                      {/* Progress bar */}
                      <div className="h-3 bg-white/5 rounded-full overflow-hidden border border-white/5">
                        <div
                          className={`h-full rounded-full bg-gradient-to-r ${colors[i % colors.length]} transition-all duration-1000 ease-out`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="glass-card p-12 rounded-2xl border border-white/10 text-center">
                <span className="material-symbols-outlined text-5xl text-slate-700 mb-4">trending_up</span>
                <h4 className="font-bold text-white text-lg mb-2">No Recovery Data</h4>
                <p className="text-slate-500 text-sm">Recovery timeline will be generated from your medication durations.</p>
              </div>
            )}
          </div>
        )}

        {/* ====================== EXPLANATIONS SECTION ====================== */}
        {activeSection === 'explanations' && (
          <div className="space-y-6">
            <div className="flex items-center gap-3 mb-2">
              <span className="material-symbols-outlined text-purple-300 text-2xl">help</span>
              <div>
                <h2 className="text-2xl font-headline font-bold text-white">Why This Medicine?</h2>
                <p className="text-sm text-slate-400">Understanding the reason behind each prescribed medication</p>
              </div>
            </div>

            {chunksLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map(i => (
                  <div key={i} className="glass-card p-6 rounded-2xl border border-white/10 animate-pulse">
                    <div className="h-4 bg-white/10 rounded w-1/4 mb-3" />
                    <div className="h-3 bg-white/10 rounded w-full mb-2" />
                    <div className="h-3 bg-white/10 rounded w-5/6" />
                  </div>
                ))}
              </div>
            ) : allExplanations.length > 0 ? (
              <div className="space-y-4">
                {allExplanations.map((detail, i) => (
                  <div key={i} className="glass-card p-6 rounded-2xl border border-white/10 hover:border-purple-500/30 transition-all group">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 shrink-0 rounded-xl bg-purple-500/10 flex items-center justify-center border border-purple-500/20 group-hover:bg-purple-500/20 transition-all">
                        <span className="material-symbols-outlined text-purple-300" style={{ fontVariationSettings: "'FILL' 1" }}>medication</span>
                      </div>
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-3">
                          <h4 className="text-white font-bold">{detail.medicine}</h4>
                          {detail.strength && <span className="text-[10px] text-teal-300 bg-teal-500/10 px-2 py-0.5 rounded-md border border-teal-500/20">{detail.strength}</span>}
                        </div>
                        <div className="bg-white/[0.03] p-3 rounded-xl border border-white/5">
                          <p className="text-[10px] text-slate-500 uppercase tracking-widest mb-1 font-bold">Why Prescribed</p>
                          <p className="text-sm text-slate-300 leading-relaxed">{detail.reason}</p>
                        </div>
                        {detail.what_it_does && (
                          <div className="bg-white/[0.02] p-3 rounded-xl border border-white/5">
                            <p className="text-[10px] text-cyan-400 uppercase tracking-widest mb-1 font-bold">How It Works</p>
                            <p className="text-sm text-slate-300 leading-relaxed">{detail.what_it_does}</p>
                          </div>
                        )}
                        {detail.caution && (
                          <div className="bg-amber-500/5 p-3 rounded-xl border border-amber-500/10">
                            <p className="text-[10px] text-amber-400 uppercase tracking-widest mb-1 font-bold flex items-center gap-1">
                              <span className="material-symbols-outlined text-[12px]">warning</span> Caution
                            </p>
                            <p className="text-sm text-amber-200/80">{detail.caution}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="glass-card p-12 rounded-2xl border border-white/10 text-center">
                <span className="material-symbols-outlined text-5xl text-slate-700 mb-4">help</span>
                <h4 className="font-bold text-white text-lg mb-2">No Explanations Available</h4>
                <p className="text-slate-500 text-sm">Medicine explanations will appear after your prescription is approved.</p>
              </div>
            )}
          </div>
        )}

        {/* ====================== DOCUMENTS SECTION ====================== */}
        {activeSection === 'documents' && (
          <div className="space-y-6">
            <div className="flex items-center gap-3 mb-2">
              <span className="material-symbols-outlined text-primary text-2xl">folder_supervised</span>
              <div>
                <h2 className="text-2xl font-headline font-bold text-white">Clinical Documents</h2>
                <p className="text-sm text-slate-400">All approved medical reports and prescriptions</p>
              </div>
            </div>

            <div className="glass-card p-6 md:p-8 rounded-3xl border border-white/10 min-h-[300px]">
              {rxLoading ? (
                <div className="flex flex-col items-center justify-center py-12 gap-4">
                  <div className="animate-spin rounded-full h-8 w-8 border-2 border-teal-400 border-t-transparent" />
                  <span className="text-sm text-slate-400 tracking-wider">Retrieving documents...</span>
                </div>
              ) : prescriptions.length === 0 ? (
                <div className="text-center py-12 space-y-3">
                  <span className="material-symbols-outlined text-5xl text-slate-700 block mb-4">clinical_notes</span>
                  <h4 className="font-bold text-white text-lg">No Documents Available</h4>
                  <p className="text-slate-500 text-sm">Your physician has not yet published any clinical documents to your dashboard.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {prescriptions.map((rx) => {
                    const ed = rx.extracted_data || rx;
                    const meds = ed.medications || rx.medications || [];
                    const type = rx.report_type || 'prescription';

                    return (
                      <div key={rx.prescription_id} className="bg-white/[0.03] rounded-2xl p-6 border border-white/10 hover:border-teal-300/30 hover:bg-white/[0.05] transition-all group flex flex-col h-full">
                        <div className="flex items-start justify-between mb-4">
                          <div>
                            <p className="text-white font-bold text-sm tracking-tight">{ed.doctor_name ? `Dr. ${ed.doctor_name}` : 'Medical Team'}</p>
                            <p className="text-slate-500 text-[10px] uppercase font-bold mt-0.5 tracking-wider">{new Date(rx.created_at || ed.prescription_date).toLocaleDateString()}</p>
                          </div>
                          <span className="bg-teal-500/10 text-teal-300 text-[9px] font-bold px-2 py-1 rounded-md uppercase tracking-widest border border-teal-500/20">{type}</span>
                        </div>

                        <div className="flex-1">
                          {(ed.diagnosis || rx.diagnosis) && (
                            <div className="mb-4">
                              <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest mb-1">Primary Diagnosis</p>
                              <p className="text-slate-200 text-xs leading-relaxed line-clamp-2">{ed.diagnosis || rx.diagnosis}</p>
                            </div>
                          )}
                          {meds.length > 0 && (
                            <div className="space-y-2.5">
                              <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest mb-1">Medication Summary</p>
                              {meds.slice(0, 3).map((med, j) => (
                                <div key={j} className="flex items-center gap-3">
                                  <span className="w-1.5 h-1.5 rounded-full bg-teal-400 shrink-0" />
                                  <div className="text-xs truncate">
                                    <span className="text-white font-bold">{med.name}</span>
                                    {med.frequency && <span className="text-teal-400 ml-2 font-medium">{med.frequency}</span>}
                                  </div>
                                </div>
                              ))}
                              {meds.length > 3 && <p className="text-[10px] text-slate-600 font-bold ml-4">+ {meds.length - 3} more items</p>}
                            </div>
                          )}
                        </div>

                        <button onClick={() => setSelectedRx(rx)} className="w-full mt-6 py-2 rounded-lg border border-white/5 bg-white/5 text-[10px] text-white font-bold uppercase tracking-widest hover:bg-white/10 transition-all">
                          View Full Details
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Slide-over Modal */}
      {selectedRx && (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/60 backdrop-blur-sm">
          <div className="w-full max-w-md h-full bg-[#0a1520] border-l border-white/10 shadow-2xl flex flex-col slide-in-right">
            <div className="px-6 py-4 border-b border-white/10 flex justify-between items-center bg-white/[0.02]">
              <h3 className="text-lg font-headline font-bold text-white flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">description</span>
                Clinical Document Details
              </h3>
              <button onClick={() => setSelectedRx(null)} className="text-slate-400 hover:text-white transition-colors">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {(() => {
                const ed = selectedRx.extracted_data || selectedRx;
                const meds = ed.medications || selectedRx.medications || [];
                const tests = ed.tests || selectedRx.tests || [];
                const pi = ed.patient_insights || selectedRx.patient_insights || {};

                return (
                  <>
                    <div className="glass-card p-4 rounded-2xl border border-white/5">
                      <p className="text-[10px] uppercase tracking-widest text-slate-500 mb-1">Provider Information</p>
                      <p className="text-sm font-bold text-white">{ed.doctor_name ? `Dr. ${ed.doctor_name}` : 'Unknown Provider'}</p>
                      <p className="text-xs text-slate-400">Date: {new Date(selectedRx.created_at || ed.prescription_date).toLocaleDateString()}</p>
                      {ed.diagnosis && (
                        <div className="mt-3 bg-white/[0.02] p-3 rounded-lg border border-white/5">
                          <span className="text-[10px] uppercase text-primary font-bold">Diagnosis</span>
                          <p className="text-sm text-white mt-1">{ed.diagnosis}</p>
                        </div>
                      )}
                    </div>
                    {meds.length > 0 && (
                      <div>
                        <h4 className="text-xs font-bold text-slate-300 uppercase tracking-widest mb-3 flex items-center gap-2">
                          <span className="material-symbols-outlined text-[16px] text-teal-400">medication</span>
                          Medications ({meds.length})
                        </h4>
                        <div className="space-y-3">
                          {meds.map((m, j) => (
                            <div key={j} className="bg-white/[0.03] p-4 rounded-xl border border-white/5">
                              <p className="font-bold text-white text-sm">{m.name} <span className="text-teal-400 ml-1 font-normal">{m.strength}</span></p>
                              <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-slate-400">
                                {m.frequency && <div>Frequency: <span className="text-slate-200">{m.frequency}</span></div>}
                                {m.duration && <div>Duration: <span className="text-slate-200">{m.duration}</span></div>}
                                {m.form && <div>Form: <span className="text-slate-200">{m.form}</span></div>}
                              </div>
                              {m.instructions && <div className="mt-2 text-xs text-amber-200/80 italic w-full">Note: {m.instructions}</div>}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {tests.length > 0 && (
                      <div>
                        <h4 className="text-xs font-bold text-slate-300 uppercase tracking-widest mb-3 flex items-center gap-2">
                          <span className="material-symbols-outlined text-[16px] text-cyan-400">biotech</span>
                          Recommended Tests
                        </h4>
                        <ul className="space-y-2">
                          {tests.map((t, j) => (
                            <li key={j} className="bg-white/[0.03] p-3 rounded-xl border border-white/5 text-sm text-white flex justify-between items-center">
                              <span>{t.name}</span>
                              {t.status && <span className="text-[10px] uppercase bg-cyan-500/20 text-cyan-300 px-2 py-0.5 rounded-md">{t.status}</span>}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {ed.notes && (
                      <div className="bg-amber-500/10 border border-amber-500/20 p-4 rounded-2xl">
                        <p className="text-[10px] uppercase tracking-widest text-amber-400 mb-1 font-bold">Doctor Notes</p>
                        <p className="text-sm text-amber-100/90 leading-relaxed">{ed.notes}</p>
                      </div>
                    )}
                    {pi.current_condition_summary && (
                      <div className="border border-teal-500/20 p-4 rounded-2xl bg-gradient-to-br from-teal-500/5 to-transparent">
                        <p className="text-[10px] uppercase tracking-widest text-teal-400 mb-1 font-bold flex items-center gap-1">
                          <span className="material-symbols-outlined text-[12px]">auto_awesome</span>
                          AI Insights
                        </p>
                        <p className="text-xs text-slate-300 mt-2">{pi.current_condition_summary}</p>
                        {pi.lifestyle_changes?.length > 0 && (
                          <div className="mt-3 pt-3 border-t border-teal-500/20">
                            <p className="text-[10px] uppercase text-slate-400 mb-2">Recommended Actions</p>
                            <ul className="list-disc pl-4 text-xs text-slate-300 space-y-1">
                              {pi.lifestyle_changes.map((c, j) => <li key={j}>{c}</li>)}
                            </ul>
                          </div>
                        )}
                      </div>
                    )}
                  </>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {/* Chatbot Panel */}
      <ChatbotPanel patientId={patientId} />
    </div>
  );
}

export default FamilyDashboardPage;
