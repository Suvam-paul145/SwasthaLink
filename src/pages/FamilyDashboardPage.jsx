import { useEffect, useState } from 'react';
import MedicalHeart3D from '../components/MedicalHeart3D';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

function FamilyDashboardPage() {
  const { user } = useAuth();
  const patientName = user?.name || 'Patient';
  const patientId = user?.id || user?.email || '';

  // Fetch approved prescriptions for this patient
  const [prescriptions, setPrescriptions] = useState([]);
  const [rxLoading, setRxLoading] = useState(true);

  useEffect(() => {
    if (!patientId) { setRxLoading(false); return; }
    (async () => {
      setRxLoading(true);
      try {
        const result = await api.getPatientPrescriptions(patientId);
        setPrescriptions(result.items || []);
      } catch (err) {
        console.warn('Failed to load prescriptions:', err.message);
      } finally {
        setRxLoading(false);
      }
    })();
  }, [patientId]);

  const latestRx = prescriptions[0];
  const insights = latestRx?.patient_insights;
  const extracted = latestRx?.extracted_data || latestRx || {};

  return (
    <div className="min-h-screen bg-[#070e17] text-white p-6 lg:p-10 relative overflow-hidden pb-32">
      {/* Ambient glow blobs — match signup/login */}
      <div className="absolute -top-28 -right-20 w-72 h-72 bg-teal-400/10 rounded-full blur-[100px]" />
      <div className="absolute -bottom-32 -left-20 w-80 h-80 bg-cyan-400/10 rounded-full blur-[120px]" />

      <div className="max-w-7xl mx-auto space-y-10 relative z-10">
        {/* Header & Urgent Actions */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <span className="bg-teal-500/20 text-teal-300 px-3 py-1 rounded-full text-[10px] font-bold tracking-[0.2em] uppercase border border-teal-500/20">AI Clinical Insights</span>
              <div className="flex items-center gap-2 text-primary text-xs font-medium uppercase tracking-wider">
                <span className="w-2 h-2 rounded-full bg-primary animate-pulse"></span>
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

        {/* Dynamic Insights Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
          
          {/* Insight 1: Current Condition / AI Summary */}
          <div className="glass-card p-8 rounded-3xl border border-white/10 space-y-6 flex flex-col justify-between relative overflow-hidden group">
            <div className="absolute right-[-20px] top-[-20px] w-32 h-32 bg-primary opacity-10 rounded-full blur-3xl group-hover:opacity-20 transition-all"></div>
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
                  <div className="h-4 bg-white/10 rounded w-3/4"></div>
                  <div className="h-4 bg-white/10 rounded w-full"></div>
                  <div className="h-4 bg-white/10 rounded w-5/6"></div>
                </div>
              ) : insights?.current_condition_summary ? (
                <p className="text-sm text-slate-300 leading-relaxed font-medium mt-4">
                  {insights.current_condition_summary}
                </p>
              ) : (
                <p className="text-sm text-slate-500 italic mt-4">Waiting for physician document processing to generate clinical status.</p>
              )}
            </div>
            <div className="flex items-center justify-between text-[10px] text-slate-500 font-bold uppercase tracking-widest pt-4 border-t border-white/5 relative z-10">
              <span>AI Generated</span>
              <span className="text-primary">Auto-Updated</span>
            </div>
          </div>

          {/* Insight 2: Critical Instructions */}
          <div className="glass-card p-8 rounded-3xl border border-white/10 flex flex-col justify-between group relative overflow-hidden">
             <div className="absolute right-[-20px] top-[-20px] w-32 h-32 bg-amber-500 opacity-10 rounded-full blur-3xl group-hover:opacity-20 transition-all"></div>
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
                    <div className="flex items-center gap-3"><div className="w-8 h-8 rounded-lg bg-white/10 shrink-0"></div><div className="h-3 bg-white/10 rounded w-full"></div></div>
                    <div className="flex items-center gap-3"><div className="w-8 h-8 rounded-lg bg-white/10 shrink-0"></div><div className="h-3 bg-white/10 rounded w-5/6"></div></div>
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

          {/* Insight 3: Lifestyle Changes & Next Steps */}
          <div className="glass-card p-8 rounded-3xl border border-white/10 space-y-6 flex flex-col justify-between relative overflow-hidden group">
            <div className="absolute right-[-20px] top-[-20px] w-32 h-32 bg-cyan-500 opacity-10 rounded-full blur-3xl group-hover:opacity-20 transition-all"></div>
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
                    <div className="h-3 bg-white/10 rounded w-full"></div>
                    <div className="h-3 bg-white/10 rounded w-5/6"></div>
                    <div className="h-3 bg-white/10 rounded w-4/6"></div>
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

          {/* Caretaker / Doctor Info & Follow-up */}
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

          {/* Clarity Center Link */}
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

          {/* My Documents Header */}
          <div className="col-span-1 md:col-span-2 lg:col-span-3 mt-6">
            <h2 className="text-2xl font-headline font-bold text-white mb-2 flex items-center gap-3">
              <span className="material-symbols-outlined text-primary">folder_supervised</span>
              Clinical Documents
            </h2>
            <p className="text-sm text-slate-400 mb-6">All approved medical reports and prescriptions</p>
          </div>

          {/* My Prescriptions Mapping */}
          <div className="col-span-1 md:col-span-2 lg:col-span-3 -mt-6">
            {/* The rest is dynamically mapped prescriptions */}
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
                          {ed.diagnosis || rx.diagnosis ? (
                            <div className="mb-4">
                              <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest mb-1">Primary Diagnosis</p>
                              <p className="text-slate-200 text-xs leading-relaxed line-clamp-2">{ed.diagnosis || rx.diagnosis}</p>
                            </div>
                          ) : null}
                          
                          {meds.length > 0 && (
                            <div className="space-y-2.5">
                              <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest mb-1">Medication Summary</p>
                              {meds.slice(0, 3).map((med, i) => (
                                <div key={i} className="flex items-center gap-3">
                                  <span className="w-1.5 h-1.5 rounded-full bg-teal-400 shrink-0" />
                                  <div className="text-xs truncate">
                                    <span className="text-white font-bold">{med.name}</span>
                                    {med.frequency && <span className="text-teal-400 ml-2 font-medium">{med.frequency}</span>}
                                  </div>
                                </div>
                              ))}
                              {meds.length > 3 && (
                                <p className="text-[10px] text-slate-600 font-bold ml-4">+ {meds.length - 3} more items</p>
                              )}
                            </div>
                          )}
                        </div>
                        
                        <button className="w-full mt-6 py-2 rounded-lg border border-white/5 bg-white/5 text-[10px] text-white font-bold uppercase tracking-widest hover:bg-white/10 transition-all">
                          View Full Details
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
          
        </div>
      </div>
    </div>
  );
}

export default FamilyDashboardPage;
