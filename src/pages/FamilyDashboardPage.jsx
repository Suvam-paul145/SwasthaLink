import MedicalHeart3D from '../components/MedicalHeart3D';
import VitalSignsChart from '../components/VitalSignsChart';

function FamilyDashboardPage() {
  return (
    <div className="p-8 relative z-10">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(79,219,200,0.15)_0%,transparent_70%)] -z-10 pointer-events-none"></div>
      <div className="max-w-7xl mx-auto space-y-12">
        {/* Header & Urgent Actions */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <span className="bg-primary/20 text-primary px-3 py-1 rounded-full text-xs font-bold tracking-wider uppercase border border-primary/20">Active Care</span>
              <div className="flex items-center gap-2 text-teal-400/80 text-sm">
                <span className="w-2 h-2 rounded-full bg-teal-400 animate-pulse"></span>
                Live Monitoring
              </div>
            </div>
            <h1 className="text-4xl md:text-5xl font-headline font-extrabold tracking-tight text-on-surface text-white">Family Dashboard</h1>
            <p className="text-slate-400 text-lg max-w-xl font-light">
              Real-time recovery tracking for <span className="text-white font-semibold">Amitav Rahman</span>. Everything is under professional care.
            </p>
          </div>
          <div className="flex gap-4 w-full md:w-auto">
            <button className="flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-4 rounded-xl border border-white/5 bg-white/5 hover:bg-white/10 transition-all text-white font-semibold">
              <span className="material-symbols-outlined">edit_note</span> Update Log
            </button>
            <button className="flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-4 rounded-xl bg-error-container text-on-error-container font-bold hover:brightness-110 transition-all shadow-lg shadow-error/10">
              <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>emergency</span> Emergency Call
            </button>
          </div>
        </div>

        {/* 3D Isometric Timeline Section */}
        <section className="glass-card p-8 md:p-12 rounded-xl border-t border-white/5 relative overflow-hidden">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-16 gap-4">
            <div className="space-y-1">
              <h3 className="font-headline text-2xl font-bold text-white">Treatment Journey</h3>
              <p className="text-slate-500 text-sm font-medium">Visualization of critical path and recovery milestones</p>
            </div>
            <div className="flex items-center gap-6 text-xs font-bold uppercase tracking-widest">
              <span className="flex items-center gap-2 text-slate-500"><span className="w-3 h-3 rounded-full bg-slate-700/50"></span> Past</span>
              <span className="flex items-center gap-2 text-primary"><span className="w-3 h-3 rounded-full bg-primary shadow-[0_0_8px_rgba(79,219,200,0.6)]"></span> Present</span>
              <span className="flex items-center gap-2 text-teal-700"><span className="w-3 h-3 rounded-full bg-teal-900"></span> Future</span>
            </div>
          </div>

          <div className="relative py-20 px-4 flex justify-center items-center h-[400px]">
            {/* Simple Spline Path Replacement */}
            <div className="relative w-full max-w-4xl h-full flex flex-col justify-center">
              <div className="relative h-2 bg-slate-800 rounded-full w-full overflow-hidden">
                <div className="absolute left-0 top-0 h-full bg-primary w-1/2 shadow-[0_0_15px_rgba(79,219,200,0.5)]"></div>
              </div>
              
              <div className="absolute inset-0 flex items-center justify-between px-4">
                {/* Past Node */}
                <div className="flex flex-col items-center gap-4">
                  <div className="w-4 h-4 rounded-full bg-slate-700 border-2 border-slate-600"></div>
                  <div className="text-center opacity-60">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1">MAR 12 - 20</p>
                    <p className="text-base font-headline font-bold text-slate-400">ICU Admittance</p>
                  </div>
                </div>

                {/* Current Node */}
                <div className="flex flex-col items-center gap-4 -translate-y-8">
                  <div className="relative">
                    <div className="absolute inset-0 rounded-full bg-primary/20 animate-ping"></div>
                    <div className="w-8 h-8 rounded-full bg-primary shadow-[0_0_15px_rgba(79,219,200,0.5)] border-4 border-surface"></div>
                  </div>
                  <div className="text-center">
                    <div className="bg-primary/20 backdrop-blur-md border border-primary/40 px-6 py-2 rounded-full mb-3">
                      <p className="text-primary font-bold text-sm">Stable & Conscious</p>
                    </div>
                    <p className="text-xl font-headline font-extrabold text-white">Active Recovery</p>
                    <p className="text-teal-400/60 text-xs font-medium uppercase tracking-tighter mt-1">Status: Improving</p>
                  </div>
                </div>

                {/* Future Node */}
                <div className="flex flex-col items-center gap-4">
                  <div className="w-4 h-4 rounded-full bg-slate-900 border-2 border-teal-900"></div>
                  <div className="text-center">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-teal-800 mb-1">EST. APRIL 05</p>
                    <p className="text-base font-headline font-bold text-teal-700">First Follow-up</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Grid Layout for Members & Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          <div className="glass-card p-8 rounded-xl border-t border-white/5 space-y-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-slate-400 font-medium">Heart Rate</p>
                <h4 className="text-4xl font-headline font-extrabold text-white">72 <span className="text-lg font-normal text-slate-500">BPM</span></h4>
              </div>
              <span className="material-symbols-outlined text-primary bg-primary/10 p-3 rounded-xl">favorite</span>
            </div>
            {/* 3D Heart Visualization */}
            <div className="h-48 w-full">
              <MedicalHeart3D bpm={72} className="h-full" />
            </div>
            <div className="flex items-center justify-between text-xs text-slate-500 font-bold uppercase tracking-widest">
              <span>Resting Stable</span>
              <span className="text-primary">Normal Range</span>
            </div>
          </div>

          <div className="glass-card p-8 rounded-xl border-t border-white/5 relative overflow-hidden group">
            <h4 className="text-xl font-headline font-bold mb-6 text-white">Family Delivery</h4>
            <div className="flex items-center gap-6">
              <div className="relative">
                <div className="w-16 h-16 rounded-2xl bg-teal-500/20 flex items-center justify-center border border-teal-500/30">
                  <span className="material-symbols-outlined text-4xl text-teal-400" style={{ fontVariationSettings: "'FILL' 1" }}>chat</span>
                </div>
                <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-teal-400 rounded-full border-4 border-surface flex items-center justify-center text-surface">
                  <span className="material-symbols-outlined text-[14px] font-bold">check</span>
                </div>
              </div>
              <div className="space-y-1">
                <p className="text-white font-bold">Log Sent to Group</p>
                <p className="text-slate-400 text-sm">Delivered 2m ago</p>
              </div>
            </div>
            <button className="mt-8 w-full py-3 rounded-lg border border-teal-400/20 text-teal-400 font-bold text-sm hover:bg-teal-400/10 transition-all uppercase tracking-widest">
              View Conversation
            </button>
          </div>

          <div className="glass-card p-8 rounded-xl border-t border-white/5 space-y-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-slate-400 font-medium">Oxygen (SpO2)</p>
                <h4 className="text-4xl font-headline font-extrabold text-white">98 <span className="text-lg font-normal text-slate-500">%</span></h4>
              </div>
              <span className="material-symbols-outlined text-teal-300 bg-teal-300/10 p-3 rounded-xl">air</span>
            </div>
            <div className="relative h-4 bg-surface-container-highest rounded-full overflow-hidden">
              <div className="absolute left-0 top-0 h-full w-[98%] bg-gradient-to-r from-teal-500 to-primary shadow-[0_0_10px_rgba(79,219,200,0.5)]"></div>
            </div>
            <div className="flex justify-between items-center text-xs font-bold text-slate-500">
              <span>MIN 94%</span>
              <span className="text-primary">EXCELLENT</span>
            </div>
          </div>

          <div className="glass-card p-8 rounded-xl border-t border-white/5 col-span-1 md:col-span-2 flex flex-col md:flex-row gap-8 items-center border border-white/5">
            <div className="relative shrink-0">
              <img 
                alt="Lead physician" 
                className="w-24 h-24 rounded-full object-cover border-4 border-surface-container-high shadow-2xl" 
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuCspt_-yZkuS-C8R84FDRlFSY5D2ZWT9I3fQieW0c9G1yWWKKCse4HSH_UMrSuT1_nMLfcJmWNgkpA0CfdPZDRrQmbs4bqI2VuCr6sf2xARTH8G90CghFswO9F24ahlNzxHASbQkd26KabKQFhkX2JXcmWKxK7EMugUfcQzgX-_FV46lH6xSWmXAoq9rXo-QljOQE2ydtjjgoB4mkUj8H2iJWpU8AYAmVk7kqHwfDv2jTd3XxJ_nhQceJw7hpmI75TPS89hy8eEZA"
              />
              <div className="absolute -bottom-2 -right-2 bg-primary text-on-primary p-1 rounded-lg">
                <span className="material-symbols-outlined text-sm font-bold">verified</span>
              </div>
            </div>
            <div className="flex-1 text-center md:text-left">
              <p className="text-primary font-bold text-sm uppercase tracking-tighter mb-1">Lead Caretaker</p>
              <h4 className="text-2xl font-headline font-bold text-white">Dr. Sarah Jenkins</h4>
              <p className="text-slate-400">Cardiology Recovery Specialist</p>
              <div className="flex flex-wrap justify-center md:justify-start gap-4 mt-4">
                <div className="flex items-center gap-2 bg-surface-container-lowest px-4 py-2 rounded-lg border border-white/5">
                  <span className="material-symbols-outlined text-sm text-teal-400">schedule</span>
                  <span className="text-sm font-medium text-white">Next Visit: 2:00 PM Today</span>
                </div>
              </div>
            </div>
            <button className="bg-surface-container-highest hover:bg-surface-variant transition-colors p-4 rounded-2xl group border border-white/5">
              <span className="material-symbols-outlined group-hover:scale-110 transition-transform text-white">videocam</span>
            </button>
          </div>

          <div className="glass-card p-8 rounded-xl border-t border-white/5 flex flex-col justify-between bg-gradient-to-br from-teal-500/10 to-transparent border border-white/5">
            <div>
              <h4 className="text-xl font-headline font-bold mb-2 text-white">Clarity Center</h4>
              <p className="text-slate-400 text-sm leading-relaxed">Simplifying complex medical jargon for the Rahman family.</p>
            </div>
            <div className="mt-8 space-y-4">
              <div className="p-4 bg-surface-container-lowest/50 rounded-lg border border-white/5 flex items-center justify-between group cursor-pointer hover:border-teal-500/30 transition-all">
                <span className="text-sm font-medium text-white">Understand ICU Vitals</span>
                <span className="material-symbols-outlined text-teal-400 group-hover:translate-x-1 transition-transform">chevron_right</span>
              </div>
            </div>
          </div>

          {/* Vital Signs Chart Section */}
          <div className="col-span-1 md:col-span-2 lg:col-span-3">
            <VitalSignsChart />
          </div>
        </div>
      </div>
    </div>
  );
}

export default FamilyDashboardPage;
