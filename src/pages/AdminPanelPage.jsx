import MedicalHeart3D from '../components/MedicalHeart3D';
import DNA3DHelix from '../components/DNA3DHelix';
import FloatingMedicalCube from '../components/FloatingMedicalCube';
import VitalSignsChart from '../components/VitalSignsChart';
import ComprehensionScoreChart from '../components/ComprehensionScoreChart';
import ProcessingStatusDoughnut from '../components/ProcessingStatusDoughnut';
import ReadmissionRiskChart from '../components/ReadmissionRiskChart';

function AdminPanelPage() {
  return (
    <div className="relative min-h-screen">
      {/* Topbar Navigation */}
      <header className="fixed top-0 right-0 left-72 z-30 flex justify-between items-center px-8 h-20 bg-slate-950/40 backdrop-blur-xl border-b border-white/5 shadow-[0_20px_40px_-5px_rgba(31,42,61,0.06)]">
        <div className="flex items-center gap-8">
          <h2 className="text-teal-400 font-bold tracking-tighter text-2xl font-headline">Dashboard</h2>
          <nav className="hidden md:flex gap-6 items-center">
            <a className="text-slate-400 hover:text-teal-200 transition-colors font-headline tracking-wide uppercase text-sm" href="#">Dashboard</a>
            <a className="text-teal-400 border-b-2 border-teal-400 pb-1 font-headline tracking-wide uppercase text-sm" href="#">Patients</a>
            <a className="text-slate-400 hover:text-teal-200 transition-colors font-headline tracking-wide uppercase text-sm" href="#">Reports</a>
            <a className="text-slate-400 hover:text-teal-200 transition-colors font-headline tracking-wide uppercase text-sm" href="#">Messages</a>
          </nav>
        </div>
        <div className="flex items-center gap-4">
          <div className="relative group">
            <input 
              className="bg-surface-container-highest border-none rounded-full px-6 py-2 text-sm w-64 focus:ring-2 focus:ring-primary transition-all text-on-surface" 
              placeholder="Search patients..." 
              type="text"
            />
            <span className="material-symbols-outlined absolute right-4 top-2 text-slate-400 text-sm">search</span>
          </div>
          <button className="p-2 hover:bg-white/5 rounded-full transition-all text-slate-400">
            <span className="material-symbols-outlined">notifications</span>
          </button>
          <button className="p-2 hover:bg-white/5 rounded-full transition-all text-slate-400">
            <span className="material-symbols-outlined">translate</span>
          </button>
          <img 
            alt="Doctor profile" 
            className="w-10 h-10 rounded-full border border-teal-400/30" 
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuDwM0cW-D52oN2c7XGlXm7aeiqS2SjdXilTmlkCLeJ67TyeurvI1LWyMjS9kh2wpQ7Oa5KTSdCob1sT6cAyWdA6DZOWt4YLXzJl7rFeYhTqezWIgGSyPm5gQhB3Yz36oR55laa1KrN0EGl4683YKm6iw3BymQB2ULV-wpY3BFOaeXiqHn-MdpRHZ8Ww5AZ3nP5ILIVaFKfHBPVgTSOAmMLtTmHre3Mp9k2y-xb7OIhekp-27VPOWTymDMCX-GC3rXetXCeEQMWKRA"
          />
        </div>
      </header>

      {/* Main Content Area */}
      <main className="p-8 pt-28">
        <div className="grid grid-cols-12 gap-6">
          {/* Key Metrics */}
          <div className="col-span-12 lg:col-span-3 glass-card p-6 rounded-xl flex flex-col justify-between h-48 group hover:border-primary/40 transition-all">
            <div>
              <span className="text-xs uppercase tracking-[0.2em] text-slate-400 font-bold">Readmission Risk</span>
              <h3 className="text-4xl font-headline font-extrabold text-error mt-2">12.4%</h3>
            </div>
            <div className="w-full bg-surface-container-highest h-2 rounded-full overflow-hidden mt-4">
              <div className="bg-error h-full" style={{ width: '12.4%' }}></div>
            </div>
            <p className="text-[10px] text-slate-500 mt-2 flex items-center gap-1">
              <span className="material-symbols-outlined text-xs">trending_down</span> 2.1% decrease from last week
            </p>
          </div>

          <div className="col-span-12 lg:col-span-3 glass-card p-6 rounded-xl flex flex-col justify-between h-48 group hover:border-primary/40 transition-all">
            <div>
              <span className="text-xs uppercase tracking-[0.2em] text-slate-400 font-bold">Comprehension Score</span>
              <h3 className="text-4xl font-headline font-extrabold text-primary mt-2">88.5</h3>
            </div>
            <div className="flex items-end gap-1 h-12 mt-4">
              <div className="bg-primary/20 w-full h-1/2 rounded-sm"></div>
              <div className="bg-primary/40 w-full h-2/3 rounded-sm"></div>
              <div className="bg-primary/60 w-full h-1/2 rounded-sm"></div>
              <div className="bg-primary/80 w-full h-full rounded-sm"></div>
              <div className="bg-primary w-full h-5/6 rounded-sm"></div>
            </div>
            <p className="text-[10px] text-slate-500 mt-2">Target benchmark: 85.0</p>
          </div>

          {/* 3D Floating Cube for AI Stats */}
          <div className="col-span-12 lg:col-span-6 glass-card rounded-xl h-48 relative overflow-hidden border border-white/5">
            <FloatingMedicalCube value="99.2%" label="AI Accuracy" className="h-full" />
            <div className="absolute top-4 right-6 flex gap-2 z-10">
              <span className="w-2 h-2 rounded-full bg-primary animate-pulse"></span>
              <span className="text-[10px] text-primary uppercase font-bold tracking-widest">Systems Nominal</span>
            </div>
          </div>

          {/* Patient List Sidebar */}
          <div className="col-span-12 lg:col-span-4 glass-card rounded-xl overflow-hidden flex flex-col max-h-[700px] border border-white/5">
            <div className="p-6 border-b border-white/5">
              <h3 className="text-lg font-headline font-bold text-white">Pending Reviews</h3>
              <p className="text-sm text-slate-400">14 patients awaiting output approval</p>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              <div className="p-4 rounded-xl bg-primary/10 border border-primary/30 cursor-pointer">
                <div className="flex justify-between items-start mb-2">
                  <span className="text-sm font-bold text-white">Rahim Ahmed</span>
                  <span className="text-[10px] px-2 py-0.5 bg-primary text-on-primary rounded-full uppercase font-bold">Reviewing</span>
                </div>
                <div className="flex items-center gap-2 text-[10px] text-slate-400">
                  <span className="material-symbols-outlined text-xs">calendar_today</span> 14 Oct, 2023
                  <span className="w-1 h-1 rounded-full bg-slate-600"></span>
                  ID: #AB-9042
                </div>
              </div>
              <div className="p-4 rounded-xl bg-surface-container-low hover:bg-surface-container-high transition-colors cursor-pointer group border border-white/5">
                <div className="flex justify-between items-start mb-2">
                  <span className="text-sm font-bold text-slate-200 group-hover:text-primary transition-colors">Fatima Begum</span>
                  <span className="text-[10px] px-2 py-0.5 bg-secondary-container text-secondary rounded-full uppercase font-bold">Summary Ready</span>
                </div>
                <div className="flex items-center gap-2 text-[10px] text-slate-400">
                  <span className="material-symbols-outlined text-xs">calendar_today</span> 14 Oct, 2023
                  <span className="w-1 h-1 rounded-full bg-slate-600"></span>
                  ID: #AB-9043
                </div>
              </div>
              {/* More items can be added here */}
            </div>
          </div>

          {/* Editor View */}
          <div className="col-span-12 lg:col-span-8 space-y-6">
            <div className="glass-card p-2 rounded-full flex justify-between items-center px-6 border border-white/5">
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-primary">analytics</span>
                <span className="text-sm font-bold text-white uppercase tracking-wider">Analysis Mode</span>
              </div>
              <div className="flex items-center bg-surface-container-highest p-1 rounded-full gap-1 shadow-inner">
                <button className="px-6 py-2 rounded-full text-xs font-bold transition-all text-slate-400 hover:text-white uppercase tracking-tighter">Raw Medical PDF</button>
                <button className="px-6 py-2 rounded-full text-xs font-bold transition-all bg-primary text-on-primary shadow-lg uppercase tracking-tighter ring-2 ring-primary/20">MedBodh Simplified</button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 h-[550px]">
              <div className="glass-card rounded-xl flex flex-col overflow-hidden border border-white/5">
                <div className="p-4 bg-white/5 flex justify-between items-center border-b border-white/5">
                  <span className="text-[10px] uppercase font-bold tracking-widest text-slate-400">Clinical Jargon (OCR)</span>
                  <span className="material-symbols-outlined text-sm text-slate-400">terminal</span>
                </div>
                <div className="p-6 flex-1 overflow-y-auto font-mono text-sm leading-relaxed text-slate-300">
                  <p className="mb-4">DIAGNOSIS: <span className="text-white">Ischemic Cardiomyopathy w/ Left Ventricular Ejection Fraction (LVEF) at 35%</span>.</p>
                  <p className="mb-4">PROCEDURE: Immediate Percutaneous Coronary Intervention (PCI) via right radial access. Stenting of proximal LAD segment with Drug-Eluting Stent (DES).</p>
                  <p className="mb-4">PHARMACOLOGICAL REGIMEN: Initiate Dual Antiplatelet Therapy (DAPT) with Clopidogrel 75mg QD and Aspirin 81mg QD.</p>
                </div>
              </div>

              <div className="glass-card rounded-xl flex flex-col overflow-hidden border border-teal-500/30">
                <div className="p-4 bg-primary/5 flex justify-between items-center border-b border-primary/10">
                  <span className="text-[10px] uppercase font-bold tracking-widest text-primary">Bengali Translation (MedBodh)</span>
                  <span className="material-symbols-outlined text-sm text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>auto_awesome</span>
                </div>
                <div className="p-6 flex-1 overflow-y-auto space-y-6">
                  <div className="space-y-2">
                    <label className="text-[10px] text-slate-400 uppercase font-bold">Diagnosis Translation</label>
                    <div className="bg-surface-container-highest p-3 rounded-lg border border-white/5 font-body text-lg leading-relaxed">
                      আপনার হৃদযন্ত্রের পেশী কিছুটা দুর্বল হয়ে পড়েছে (ইসকেমিক কার্ডিওমায়োপ্যাথি)। হৃদপিণ্ডের পাম্প করার ক্ষমতা এখন ৩৫%।
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] text-slate-400 uppercase font-bold">Procedure Explanation</label>
                    <textarea 
                      className="w-full bg-surface-container-highest p-3 rounded-lg border border-white/5 font-body text-lg leading-relaxed focus:ring-2 focus:ring-primary h-24 transition-all resize-none"
                      defaultValue="হাতের কব্জির রক্তনালী দিয়ে একটি সরু টিউব ঢুকিয়ে আপনার হার্টের বন্ধ নালীটি একটি 'স্টেন্ট' (ছোট্ট রিং) দিয়ে খুলে দেওয়া হয়েছে।"
                    />
                  </div>
                </div>
                <div className="p-4 border-t border-white/5 flex gap-3">
                  <button className="flex-1 py-3 bg-primary text-on-primary font-bold rounded-xl flex items-center justify-center gap-2 hover:shadow-[0_0_20px_rgba(79,219,200,0.3)] transition-all">
                    <span className="material-symbols-outlined text-lg">check_circle</span>
                    Approve & Send
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Analytics Charts Section */}
          <div className="col-span-12">
            <h2 className="text-2xl font-headline font-bold text-white mb-6 flex items-center gap-3">
              <span className="material-symbols-outlined text-primary">query_stats</span>
              Analytics Dashboard
            </h2>
          </div>

          {/* Charts Grid */}
          <div className="col-span-12 lg:col-span-8">
            <ReadmissionRiskChart />
          </div>

          <div className="col-span-12 lg:col-span-4">
            <ProcessingStatusDoughnut />
          </div>

          <div className="col-span-12 lg:col-span-6">
            <ComprehensionScoreChart />
          </div>

          <div className="col-span-12 lg:col-span-6">
            <VitalSignsChart />
          </div>

          {/* 3D DNA Helix Section */}
          <div className="col-span-12 lg:col-span-6 glass-card rounded-xl border border-white/5 overflow-hidden">
            <div className="p-6 border-b border-white/5">
              <h3 className="text-xl font-headline font-bold text-white">Medical Data Structure</h3>
              <p className="text-slate-400 text-sm mt-1">Visual representation of data flow</p>
            </div>
            <DNA3DHelix className="h-96" />
          </div>

          {/* 3D Heart Monitor */}
          <div className="col-span-12 lg:col-span-6 glass-card rounded-xl border border-white/5 overflow-hidden">
            <div className="p-6 border-b border-white/5">
              <h3 className="text-xl font-headline font-bold text-white">Real-time Heart Monitor</h3>
              <p className="text-slate-400 text-sm mt-1">3D visualization of cardiac activity</p>
            </div>
            <MedicalHeart3D bpm={72} className="h-96" />
          </div>

          <div className="col-span-12 glass-card p-8 rounded-xl flex items-center justify-between border border-white/5">
            <div className="flex items-center gap-12">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-primary-container/20 flex items-center justify-center text-primary">
                  <span className="material-symbols-outlined">bolt</span>
                </div>
                <div>
                  <span className="block text-2xl font-extrabold text-white">2,410</span>
                  <span className="text-xs text-slate-400 uppercase font-bold">Reports Processed Today</span>
                </div>
              </div>
            </div>
            <div className="flex -space-x-3">
              {[1, 2, 3].map(i => (
                <img 
                  key={i}
                  alt={`Staff ${i}`} 
                  className="w-10 h-10 rounded-full border-2 border-background ring-2 ring-primary/20" 
                  src={`https://lh3.googleusercontent.com/aida-public/AB6AXuAtEhaHqb3z85wf27KJpuJdJGHwb1vbMoc_ixgE1NqRJcX-JkNKBJYsAZPevq8Zg4tVl16FfbSFzXzoSEeOs-XZBeoHIc2IAGlbDNYDcjyCf4ZN7NdJHP6os3vcqkSh5w8sWD9ePYX-B3qylk4mzJhFXgx3NTqFPNiaoziiWwyyH_UunuWaH-S8oJBC_1rr-2tmcD4Yrq-z5NDTim1Luk9FjeItGH2UTMCPCNfe7y3wCNRrdnKUlCsB8AnXvcDu066jA2P7AaEpZA`}
                />
              ))}
              <div className="w-10 h-10 rounded-full bg-surface-container-highest border-2 border-background ring-2 ring-primary/20 flex items-center justify-center text-[10px] font-bold text-slate-400">+12</div>
            </div>
          </div>
        </div>
      </main>

      {/* Floating Action for Quick Upload */}
      <button className="fixed bottom-8 right-8 w-16 h-16 bg-gradient-to-tr from-primary to-primary-container text-on-primary rounded-full shadow-2xl flex items-center justify-center group hover:scale-110 active:scale-95 transition-all duration-300 z-50">
        <span className="material-symbols-outlined text-3xl group-hover:rotate-90 transition-transform">add</span>
      </button>
    </div>
  );
}

export default AdminPanelPage;
