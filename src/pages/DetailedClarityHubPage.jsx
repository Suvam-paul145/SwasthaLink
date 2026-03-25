import { Link } from "react-router-dom";

function DetailedClarityHubPage() {
  return (
    <div className="p-12 relative z-10 max-w-7xl mx-auto">
      {/* Header Section */}
      <header className="mb-12 flex justify-between items-start">
        <div className="space-y-4">
          <span className="text-primary font-bold tracking-widest uppercase text-xs">Clarity Hub</span>
          <div className="flex flex-col gap-0.5">
            <h2 className="text-5xl font-headline font-extrabold tracking-tight text-white leading-tight">Welcome back, Rahat.</h2>
            <span className="text-3xl text-teal-400/80 font-headline font-medium">আবার স্বাগতম, রাহাত।</span>
          </div>
        </div>
        <div className="flex gap-4 items-center">
          <div className="glass-card bg-surface-container-low/30 px-6 py-4 rounded-2xl flex items-center gap-5 border border-white/5">
            <div className="text-right">
              <p className="text-[10px] text-outline font-bold uppercase tracking-widest mb-1">Current Temperature</p>
              <p className="text-2xl font-bold text-white">98.4<span className="text-primary ml-1">°F</span></p>
            </div>
            <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
              <span className="material-symbols-outlined text-primary text-2xl">thermostat</span>
            </div>
          </div>
        </div>
      </header>

      {/* Balanced Grid Layout */}
      <div className="grid grid-cols-12 gap-8">
        {/* Left: Today's Treatment Plan (More Prominent) */}
        <section className="col-span-12 lg:col-span-8 flex flex-col gap-8">
          <div className="glass-card rounded-3xl p-10 relative overflow-hidden group border border-white/5">
            {/* Ambient Glow Decoration */}
            <div className="absolute -top-32 -right-32 w-80 h-80 bg-primary/5 rounded-full blur-[100px] pointer-events-none"></div>
            <div className="relative z-10">
              <div className="flex justify-between items-center mb-10">
                <div className="flex flex-col gap-0.5">
                  <h3 className="text-3xl font-headline font-bold text-white">Today's Treatment Plan</h3>
                  <p className="text-lg text-outline">আপনার আজকের চিকিৎসা পরিকল্পনা</p>
                </div>
                <button className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center text-primary hover:bg-primary hover:text-on-primary transition-all duration-300 shadow-xl shadow-primary/5 group/speaker relative">
                  <span className="absolute inset-0 rounded-2xl bg-primary animate-ping opacity-10 group-hover:hidden"></span>
                  <span className="material-symbols-outlined text-3xl">volume_up</span>
                </button>
              </div>

              <div className="space-y-5">
                {/* Checklist Items with improved spacing */}
                <div className="flex items-start gap-6 p-6 rounded-2xl bg-white/5 hover:bg-white/[0.08] transition-all border border-white/10 cursor-pointer group/item">
                  <div className="w-12 h-12 rounded-full border-2 border-primary/30 flex items-center justify-center group-hover/item:border-primary transition-colors bg-surface-container-low/50 shrink-0 mt-1">
                    <span className="material-symbols-outlined text-primary text-2xl">light_mode</span>
                  </div>
                  <div className="flex-1">
                    <div className="flex flex-col gap-0.5 mb-2">
                      <p className="text-xl font-semibold text-white tracking-tight">Morning Insulin (10 Units)</p>
                      <p className="text-sm text-outline font-medium">সকালের ইনসুলিন (১০ ইউনিট)</p>
                    </div>
                    <div className="flex flex-col gap-0.5">
                      <p className="text-xs text-primary/80 font-medium italic">Take before breakfast, 30 mins prior</p>
                      <p className="text-[10px] text-primary/60">নাস্তার ৩০ মিনিট আগে নিন</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="px-3 py-1 rounded-full bg-primary/10 text-primary text-[10px] font-bold uppercase tracking-widest border border-primary/30 shadow-sm shadow-primary/5">Pending</span>
                  </div>
                </div>

                <div className="flex items-start gap-6 p-6 rounded-2xl bg-teal-900/10 border border-teal-500/20 opacity-70 transition-all cursor-pointer group/item">
                  <div className="w-12 h-12 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center shadow-lg shadow-primary/5 shrink-0 mt-1">
                    <span className="material-symbols-outlined text-primary text-2xl">medication</span>
                  </div>
                  <div className="flex-1">
                    <div className="flex flex-col gap-0.5 mb-2">
                      <p className="text-xl font-semibold text-white/70 line-through tracking-tight">Take BP Medication (Telmisartan 40mg)</p>
                      <p className="text-sm text-outline/70 line-through font-medium">রক্তচাপের ওষুধ নিন (টেলমিসার্টন ৪০ মি.গ্রা.)</p>
                    </div>
                    <div className="flex flex-col gap-0.5">
                      <p className="text-xs text-white/40 font-medium italic">Take with water, do not crush</p>
                      <p className="text-[10px] text-white/30">জল দিয়ে খান, গুঁড়ো করবেন না</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="px-3 py-1 rounded-full bg-surface-container-highest/50 text-outline text-[10px] font-bold uppercase tracking-widest border border-white/5">Completed</span>
                  </div>
                </div>

                <div className="flex items-start gap-6 p-6 rounded-2xl bg-white/5 hover:bg-white/[0.08] transition-all border border-white/10 cursor-pointer group/item">
                  <div className="w-12 h-12 rounded-full border-2 border-tertiary/30 flex items-center justify-center group-hover/item:border-tertiary transition-colors bg-surface-container-low/50 shrink-0 mt-1">
                    <span className="material-symbols-outlined text-tertiary text-2xl">water_drop</span>
                  </div>
                  <div className="flex-1">
                    <div className="flex flex-col gap-0.5 mb-2">
                      <p className="text-xl font-semibold text-white tracking-tight">Check Blood Sugar level</p>
                      <p className="text-sm text-outline font-medium">রক্তে শর্করার মাত্রা পরীক্ষা করুন</p>
                    </div>
                    <div className="flex flex-col gap-0.5">
                      <p className="text-xs text-tertiary/80 font-medium italic">Use the lancet on the side of the finger</p>
                      <p className="text-[10px] text-tertiary/60">আঙুলের পাশে ল্যানসেট ব্যবহার করুন</p>
                    </div>
                  </div>
                  <div className="text-right flex flex-col gap-0.5 items-end">
                    <span className="px-3 py-1 rounded-full bg-tertiary/10 text-tertiary text-[10px] font-bold uppercase tracking-widest border border-tertiary/30">Due soon</span>
                    <span className="text-[10px] text-outline font-medium opacity-60 mt-1">in 20 minutes</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Right: Staggered Widgets (Hydration & Heart) */}
        <section className="col-span-12 lg:col-span-4 flex flex-col gap-8">
          {/* Hydration Goal (Top Staggered Widget) */}
          <div className="glass-card rounded-3xl p-8 flex flex-col items-center text-center relative group border border-white/5">
            <div className="absolute top-6 right-6">
              <span className="material-symbols-outlined text-primary/40 text-3xl group-hover:scale-110 transition-transform">water_drop</span>
            </div>
            <div className="flex flex-col gap-0.5 items-center mb-8">
              <h4 className="text-lg font-headline font-bold text-white uppercase tracking-wider">Hydration Goal</h4>
              <span className="text-xs text-outline font-medium">জলের লক্ষ্য</span>
            </div>
            {/* Progress Ring */}
            <div className="relative w-44 h-44 mb-8">
              <svg className="w-full h-full" viewBox="0 0 100 100">
                <circle className="text-white/5 stroke-current" cx="50" cy="50" fill="transparent" r="42" strokeWidth="6"></circle>
                <circle className="text-primary stroke-current progress-ring-circle" cx="50" cy="50" fill="transparent" r="42" strokeLinecap="round" strokeWidth="6" style={{ strokeDasharray: 264, strokeDashoffset: 66 }}></circle>
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-4xl font-headline font-extrabold text-white">75%</span>
                <span className="text-[10px] text-outline font-bold uppercase tracking-[0.2em]">Full</span>
              </div>
            </div>
            <div className="flex flex-col gap-0.5 items-center">
              <p className="text-2xl font-bold text-white">1.5L <span className="text-outline font-normal mx-1">/</span> 2.0L</p>
              <p className="text-sm text-outline">১.৫ লিটার / ২.০ লিটার</p>
            </div>
          </div>

          {/* Heart Health (Bottom Integrated Visual) */}
          <div className="glass-card rounded-3xl aspect-[4/3] lg:aspect-auto lg:flex-1 overflow-hidden relative group border border-white/5">
            <img
              alt="3D medical visualization"
              className="w-full h-full object-cover mix-blend-overlay opacity-40 group-hover:scale-105 transition-transform duration-[2000ms]"
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuClK59_hS_YbbUuf97KP5orhLY-Rmz41mF1dNy9MsQiGqJOipO3kXlFlWs4Xz_RD0n5s69NU-LCbcMXpdYYjOd0fVUGcFfMhpZQHfmPzNtMoJsWb_IVUPENYe61vulNMWIsPPbOgfuKJvKvD9PrJLjARhJ5z8Zgj2ZZhUJed0O6gSBEumX81HyCWu-y3aKrXqiKllWvgHflb2l5x4VWh5JJLx5-mPualR9dFmAmq3pDg7Bx14biFlzygePk7e04v7IgmEVNrylyCg"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-surface via-surface/40 to-transparent"></div>
            <div className="absolute bottom-0 left-0 p-8 w-full flex justify-between items-end">
              <div className="flex flex-col gap-0.5">
                <p className="text-primary font-bold text-[10px] tracking-[0.3em] uppercase mb-2">Heart Health</p>
                <h5 className="text-white text-xl font-headline font-bold">Rhythm: Sinus</h5>
                <p className="text-sm text-outline">ছন্দ: স্বাভাবিক</p>
              </div>
              <div className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-on-primary transition-all duration-300">
                <span className="material-symbols-outlined text-xl">monitor_heart</span>
              </div>
            </div>
          </div>
        </section>
      </div>

      <div className="mt-12">
        <Link 
          to="/overview" 
          className="bg-white/5 text-slate-400 border border-white/10 py-4 px-8 rounded-full font-bold hover:bg-white/10 hover:text-white transition-all"
        >
          Back to Clarity Overview
        </Link>
      </div>

      {/* Floating Assistant Action */}
      <button className="fixed bottom-12 right-12 w-20 h-20 bg-primary text-on-primary rounded-full shadow-[0_20px_40px_rgba(20,184,166,0.3)] flex items-center justify-center hover:scale-110 active:scale-95 transition-all z-50 group border-4 border-surface">
        <div className="absolute inset-0 rounded-full border-4 border-primary/40 animate-ping"></div>
        <span className="material-symbols-outlined text-3xl" style={{ fontVariationSettings: "'FILL' 1" }}>record_voice_over</span>
        {/* Tooltip (Bilingual) */}
        <div className="absolute bottom-full right-0 mb-6 opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 transition-all pointer-events-none">
          <div className="glass-card px-4 py-2 rounded-xl whitespace-nowrap flex flex-col gap-0.5 items-end">
            <span className="text-xs font-bold text-white">Voice Assistant</span>
            <span className="text-[10px] text-teal-400">ভয়েস অ্যাসিস্ট্যান্ট</span>
          </div>
        </div>
      </button>
    </div>
  );
}

export default DetailedClarityHubPage;
