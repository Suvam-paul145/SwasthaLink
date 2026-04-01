import { useEffect, useState } from 'react';
import MedicalHeart3D from '../components/MedicalHeart3D';
import VitalSignsChart from '../components/VitalSignsChart';
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

  return (
    <div className="min-h-screen bg-[#070e17] text-white p-6 lg:p-10 relative overflow-hidden">
      {/* Ambient glow blobs — match signup/login */}
      <div className="absolute -top-28 -right-20 w-72 h-72 bg-teal-400/10 rounded-full blur-[100px]" />
      <div className="absolute -bottom-32 -left-20 w-80 h-80 bg-cyan-400/10 rounded-full blur-[120px]" />

      <div className="max-w-7xl mx-auto space-y-10 relative z-10">
        {/* Header & Urgent Actions */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <span className="bg-teal-500/20 text-teal-300 px-3 py-1 rounded-full text-[10px] font-bold tracking-[0.2em] uppercase border border-teal-500/20">Active Care</span>
              <div className="flex items-center gap-2 text-teal-400/80 text-xs font-medium uppercase tracking-wider">
                <span className="w-2 h-2 rounded-full bg-teal-400 animate-pulse"></span>
                Live Monitoring
              </div>
            </div>
            <h1 className="text-4xl md:text-5xl font-headline font-extrabold tracking-tight text-white">Family Dashboard</h1>
            <p className="text-slate-300 text-lg max-w-xl font-light">
              Real-time recovery tracking for <span className="text-teal-300 font-semibold">{patientName}</span>.
            </p>
          </div>
          <div className="flex gap-4 w-full md:w-auto">
            <button className="flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 transition-all text-white font-semibold text-sm">
              <span className="material-symbols-outlined text-[20px]">edit_note</span> Update Log
            </button>
            <button className="flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-rose-500/90 text-white font-bold hover:shadow-[0_8px_20px_rgba(244,63,94,0.3)] transition-all text-sm">
              <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>emergency</span> Emergency
            </button>
          </div>
        </div>

        {/* 3D Isometric Timeline Section */}
        <section className="glass-card p-8 md:p-10 rounded-3xl border border-white/10 relative overflow-hidden">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-12 gap-4">
            <div className="space-y-1">
              <h3 className="font-headline text-2xl font-bold text-white">Treatment Journey</h3>
              <p className="text-slate-400 text-sm font-medium">Visualization of critical path and recovery milestones</p>
            </div>
            <div className="flex items-center gap-6 text-[10px] font-bold uppercase tracking-widest">
              <span className="flex items-center gap-2 text-slate-500"><span className="w-2.5 h-2.5 rounded-full bg-slate-700/50"></span> Past</span>
              <span className="flex items-center gap-2 text-teal-400"><span className="w-2.5 h-2.5 rounded-full bg-teal-400 shadow-[0_0_8px_rgba(45,212,191,0.6)]"></span> Present</span>
              <span className="flex items-center gap-2 text-slate-700"><span className="w-2.5 h-2.5 rounded-full bg-slate-800"></span> Future</span>
            </div>
          </div>

          <div className="relative py-12 px-4 flex justify-center items-center">
            <div className="relative w-full max-w-4xl flex flex-col justify-center">
              <div className="relative h-1.5 bg-white/5 rounded-full w-full overflow-hidden">
                <div className="absolute left-0 top-0 h-full bg-gradient-to-r from-teal-500 to-cyan-400 w-1/2 shadow-[0_0_15px_rgba(45,212,191,0.5)]"></div>
              </div>
              
              <div className="absolute inset-0 flex items-center justify-between px-4">
                {/* Past Node */}
                <div className="flex flex-col items-center gap-4">
                  <div className="w-3.5 h-3.5 rounded-full bg-[#0d2133] border-2 border-slate-600"></div>
                  <div className="text-center opacity-60">
                    <p className="text-[9px] font-bold uppercase tracking-widest text-slate-500 mb-1">MAR 12 - 20</p>
                    <p className="text-sm font-headline font-bold text-slate-400">ICU Admittance</p>
                  </div>
                </div>

                {/* Current Node */}
                <div className="flex flex-col items-center gap-4">
                  <div className="relative">
                    <div className="absolute inset-0 rounded-full bg-teal-400/20 animate-ping"></div>
                    <div className="w-7 h-7 rounded-full bg-teal-400 shadow-[0_0_15px_rgba(45,212,191,0.5)] border-4 border-[#071325]"></div>
                  </div>
                  <div className="text-center">
                    <div className="bg-teal-400/10 backdrop-blur-md border border-teal-400/20 px-5 py-1.5 rounded-full mb-2">
                      <p className="text-teal-300 font-bold text-xs">Stable & Conscious</p>
                    </div>
                    <p className="text-lg font-headline font-extrabold text-white">Active Recovery</p>
                  </div>
                </div>

                {/* Future Node */}
                <div className="flex flex-col items-center gap-4">
                  <div className="w-3.5 h-3.5 rounded-full bg-[#0d2133] border-2 border-teal-900"></div>
                  <div className="text-center">
                    <p className="text-[9px] font-bold uppercase tracking-widest text-[#1a5a5c] mb-1">EST. APRIL 05</p>
                    <p className="text-sm font-headline font-bold text-[#1a5a5c]">First Follow-up</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Grid Layout for Members & Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
          {/* Heart Rate */}
          <div className="glass-card p-8 rounded-3xl border border-white/10 space-y-6 flex flex-col justify-between">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400">Heart Rate</p>
                <h4 className="text-4xl font-headline font-extrabold text-white mt-2">72 <span className="text-lg font-normal text-slate-500">BPM</span></h4>
              </div>
              <span className="material-symbols-outlined text-rose-400 bg-rose-400/10 p-3 rounded-2xl">favorite</span>
            </div>
            <div className="h-40 w-full">
              <MedicalHeart3D bpm={72} className="h-full" />
            </div>
            <div className="flex items-center justify-between text-[10px] text-slate-500 font-bold uppercase tracking-widest pt-2 border-t border-white/5">
              <span>Resting Stable</span>
              <span className="text-teal-400">Normal Range</span>
            </div>
          </div>

          {/* Family Delivery */}
          <div className="glass-card p-8 rounded-3xl border border-white/10 flex flex-col justify-between group">
            <div>
              <div className="flex justify-between items-center mb-6">
                <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400">Status Update</p>
                <span className="material-symbols-outlined text-teal-300 bg-teal-300/10 p-2.5 rounded-xl">hub</span>
              </div>
              <div className="flex items-center gap-5 mb-6">
                <div className="relative">
                  <div className="w-14 h-14 rounded-2xl bg-teal-500/10 flex items-center justify-center border border-teal-500/20">
                    <span className="material-symbols-outlined text-3xl text-teal-400" style={{ fontVariationSettings: "'FILL' 1" }}>chat</span>
                  </div>
                  <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-teal-400 rounded-full border-[3px] border-[#071325] flex items-center justify-center text-[#071325]">
                    <span className="material-symbols-outlined text-[12px] font-bold">check</span>
                  </div>
                </div>
                <div className="space-y-0.5">
                  <p className="text-white font-bold text-sm">Log Sent to Group</p>
                  <p className="text-slate-500 text-xs">Delivered 2m ago</p>
                </div>
              </div>
              <p className="text-sm text-slate-400 leading-relaxed italic">
                "Rahman is doing fine. BPM is steady at 72. Next checkup at 2 PM."
              </p>
            </div>
            <button className="mt-8 w-full py-3 rounded-xl border border-teal-400/20 text-teal-300 font-bold text-xs hover:bg-teal-400/10 transition-all uppercase tracking-widest">
              View Conversation
            </button>
          </div>

          {/* Oxygen */}
          <div className="glass-card p-8 rounded-3xl border border-white/10 space-y-6 flex flex-col justify-between">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400">Oxygen (SpO2)</p>
                <h4 className="text-4xl font-headline font-extrabold text-white mt-2">98 <span className="text-lg font-normal text-slate-500">%</span></h4>
              </div>
              <span className="material-symbols-outlined text-cyan-300 bg-cyan-300/10 p-3 rounded-2xl">air</span>
            </div>
            <div className="space-y-4">
              <div className="relative h-3 bg-white/5 rounded-full overflow-hidden">
                <div className="absolute left-0 top-0 h-full w-[98%] bg-gradient-to-r from-teal-500 to-cyan-400 shadow-[0_0_10px_rgba(45,212,191,0.5)]"></div>
              </div>
              <div className="flex justify-between items-center text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                <span>MIN 94%</span>
                <span className="text-teal-400">EXCELLENT</span>
              </div>
            </div>
            <p className="text-[11px] text-slate-500 leading-relaxed pt-4 border-t border-white/5">
              Consistent oxygen levels indicate healthy respiratory function post-surgery.
            </p>
          </div>

          {/* Lead Caretaker */}
          <div className="glass-card p-6 rounded-3xl border border-white/10 col-span-1 md:col-span-2 flex flex-col md:flex-row gap-8 items-center">
            <div className="relative shrink-0">
              <img 
                alt="Lead physician" 
                className="w-20 h-20 rounded-2xl object-cover border-2 border-white/10 p-1" 
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuCspt_-yZkuS-C8R84FDRlFSY5D2ZWT9I3fQieW0c9G1yWWKKCse4HSH_UMrSuT1_nMLfcJmWNgkpA0CfdPZDRrQmbs4bqI2VuCr6sf2xARTH8G90CghFswO9F24ahlNzxHASbQkd26KabKQFhkX2JXcmWKxK7EMugUfcQzgX-_FV46lH6xSWmXAoq9rXo-QljOQE2ydtjjgoB4mkUj8H2iJWpU8AYAmVk7kqHwfDv2jTd3XxJ_nhQceJw7hpmI75TPS89hy8eEZA"
              />
              <div className="absolute -bottom-1 -right-1 bg-teal-400 text-[#071325] p-0.5 rounded-lg border-2 border-[#071325]">
                <span className="material-symbols-outlined text-[14px] font-bold">verified</span>
              </div>
            </div>
            <div className="flex-1 text-center md:text-left space-y-1">
              <p className="text-teal-400 font-bold text-[10px] uppercase tracking-[0.2em] mb-1">Lead Specialist</p>
              <h4 className="text-2xl font-headline font-bold text-white">Dr. Sarah Jenkins</h4>
              <p className="text-slate-400 text-sm">Cardiology Recovery Specialist</p>
              <div className="flex flex-wrap justify-center md:justify-start gap-4 mt-3">
                <div className="flex items-center gap-2 bg-white/5 px-3 py-1.5 rounded-lg border border-white/10">
                  <span className="material-symbols-outlined text-sm text-teal-400">schedule</span>
                  <span className="text-xs font-bold text-white uppercase tracking-wider">Next Visit: 2:00 PM Today</span>
                </div>
              </div>
            </div>
            <div className="flex gap-3">
               <button className="bg-white/5 hover:bg-white/10 transition-colors p-4 rounded-2xl border border-white/10 text-white group">
                <span className="material-symbols-outlined group-hover:scale-110 transition-transform">videocam</span>
              </button>
              <button className="bg-white/5 hover:bg-white/10 transition-colors p-4 rounded-2xl border border-white/10 text-white group">
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
                Simplifying complex medical jargon for clear family communication.
              </p>
            </div>
            <button className="w-full py-3.5 rounded-xl bg-teal-400 text-[#071325] font-bold text-xs uppercase tracking-widest hover:shadow-[0_8px_16px_rgba(45,212,191,0.25)] transition-all">
              Understand Vitals
            </button>
          </div>

          {/* My Prescriptions Section */}
          <div className="col-span-1 md:col-span-2 lg:col-span-3">
            <div className="glass-card p-8 rounded-3xl border border-white/10">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h3 className="font-headline text-2xl font-bold text-white">My Prescriptions</h3>
                  <p className="text-slate-400 text-sm">Approved clinical guidance</p>
                </div>
                <span className="material-symbols-outlined text-cyan-300 bg-cyan-300/10 p-3 rounded-2xl">medication</span>
              </div>

              {rxLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-2 border-teal-400 border-t-transparent" />
                  <span className="ml-3 text-sm text-slate-400 tracking-wider">Loading...</span>
                </div>
              ) : prescriptions.length === 0 ? (
                <div className="text-center py-12 space-y-3">
                  <span className="material-symbols-outlined text-4xl text-slate-700">clinical_notes</span>
                  <p className="text-slate-500 text-sm">No clinical documents found.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {prescriptions.map((rx) => {
                    const ed = rx.extracted_data || rx;
                    const meds = ed.medications || rx.medications || [];
                    return (
                      <div key={rx.prescription_id} className="bg-white/[0.03] rounded-2xl p-6 border border-white/10 hover:border-teal-300/30 transition-all group">
                        <div className="flex items-start justify-between mb-4">
                          <div>
                            <p className="text-white font-bold text-sm tracking-tight">{ed.doctor_name || rx.doctor_name || 'Medical Team'}</p>
                            <p className="text-slate-500 text-[10px] uppercase font-bold mt-0.5 tracking-wider">{ed.prescription_date || rx.prescription_date || 'Approved'}</p>
                          </div>
                          <span className="bg-teal-500/10 text-teal-300 text-[9px] font-bold px-2 py-1 rounded-md uppercase tracking-widest border border-teal-500/20">Verified</span>
                        </div>
                        {ed.diagnosis || rx.diagnosis ? (
                          <div className="mb-4">
                            <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest mb-1">Diagnosis</p>
                            <p className="text-slate-200 text-xs leading-relaxed">{ed.diagnosis || rx.diagnosis}</p>
                          </div>
                        ) : null}
                        {meds.length > 0 && (
                          <div className="space-y-2.5">
                            <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest mb-1">Medication List</p>
                            {meds.slice(0, 3).map((med, i) => (
                              <div key={i} className="flex items-center gap-3">
                                <span className="w-1.5 h-1.5 rounded-full bg-teal-400 shrink-0" />
                                <div className="text-xs">
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
                        <button className="w-full mt-6 py-2 rounded-lg border border-white/5 bg-white/5 text-[10px] text-white font-bold uppercase tracking-widest hover:bg-white/10 transition-all opacity-0 group-hover:opacity-100">
                          View Details
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Vital Signs Chart Section */}
          <div className="col-span-1 md:col-span-2 lg:col-span-3">
            <div className="glass-card rounded-3xl border border-white/10 p-2 overflow-hidden">
               <VitalSignsChart />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default FamilyDashboardPage;
