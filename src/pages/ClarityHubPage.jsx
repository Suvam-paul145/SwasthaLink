import { Link } from "react-router-dom";

function ClarityHubPage() {
  return (
    <div className="p-12 relative z-10">
      {/* Header Section */}
      <header className="mb-16 flex justify-between items-end">
        <div className="space-y-4">
          <span className="text-primary font-bold tracking-widest uppercase text-xs">Clarity Hub</span>
          <h2 className="text-5xl font-headline font-extrabold tracking-tight text-white leading-tight">
            Welcome back, Rahat.<br />
            <span className="text-teal-400/80 font-normal">আবার স্বাগতম, রাহাত।</span>
          </h2>
        </div>
        <div className="flex gap-4 items-center">
          <div className="bg-surface-container-low p-4 rounded-xl flex items-center gap-4 border border-white/5">
            <div className="text-right">
              <p className="text-xs text-outline font-medium uppercase tracking-wider">Current Temperature</p>
              <p className="text-xl font-bold text-white">98.4 °F</p>
            </div>
            <span className="material-symbols-outlined text-primary text-3xl">thermostat</span>
          </div>
        </div>
      </header>

      {/* Bento Grid Layout */}
      <div className="grid grid-cols-12 gap-8 items-start">
        {/* Central Clarity Glass Card */}
        <section className="col-span-8 glass-card rounded-xl p-10 relative overflow-hidden group">
          <div className="absolute -top-24 -right-24 w-64 h-64 bg-primary/10 rounded-full blur-3xl group-hover:bg-primary/20 transition-all duration-700"></div>
          <div className="relative z-10">
            <div className="flex justify-between items-start mb-12">
              <div>
                <h3 className="text-2xl font-headline font-bold text-white mb-2">Today's Treatment Plan</h3>
                <p className="text-outline text-lg">আপনার আজকের চিকিৎসা পরিকল্পনা</p>
              </div>
              <button className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center text-primary hover:bg-primary hover:text-on-primary transition-all duration-300 shadow-xl shadow-primary/5 group/speaker relative">
                <span className="absolute inset-0 rounded-full bg-primary animate-ping opacity-20 group-hover:hidden"></span>
                <span className="material-symbols-outlined text-2xl">volume_up</span>
              </button>
            </div>

            <div className="space-y-6">
              {/* Checklist Items */}
              <div className="flex items-center gap-6 p-6 rounded-lg bg-white/5 hover:bg-white/10 transition-colors group/item cursor-pointer">
                <div className="w-10 h-10 rounded-full border-2 border-primary/40 flex items-center justify-center group-hover/item:border-primary transition-colors">
                  <span className="material-symbols-outlined text-primary scale-0 group-hover/item:scale-100 transition-transform">check</span>
                </div>
                <div className="flex-1">
                  <p className="text-xl font-medium text-white mb-1">Morning Insulin (10 Units)</p>
                  <p className="text-sm text-outline">সকালের ইনসুলিন (১০ ইউনিট)</p>
                </div>
                <div className="text-right">
                  <span className="px-3 py-1 rounded-full bg-primary-container/20 text-primary-fixed text-xs font-bold uppercase tracking-widest">Pending</span>
                </div>
              </div>

              <div className="flex items-center gap-6 p-6 rounded-lg bg-white/5 hover:bg-white/10 transition-colors group/item cursor-pointer">
                <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center">
                  <span className="material-symbols-outlined text-on-primary" style={{ fontVariationSettings: "'wght' 700" }}>check</span>
                </div>
                <div className="flex-1">
                  <p className="text-xl font-medium text-white/50 line-through mb-1">Take BP Medication (Telmisartan 40mg)</p>
                  <p className="text-sm text-outline/50 line-through">রক্তচাপের ওষুধ নিন (টেলমিসার্টন ৪০ মি.গ্রা.)</p>
                </div>
                <div className="text-right">
                  <span className="px-3 py-1 rounded-full bg-surface-container-highest text-outline text-xs font-bold uppercase tracking-widest">Completed</span>
                </div>
              </div>

              <div className="flex items-center gap-6 p-6 rounded-lg bg-white/5 hover:bg-white/10 transition-colors group/item cursor-pointer">
                <div className="w-10 h-10 rounded-full border-2 border-primary/40 flex items-center justify-center"></div>
                <div className="flex-1">
                  <p className="text-xl font-medium text-white mb-1">Check Blood Sugar level</p>
                  <p className="text-sm text-outline">রক্তে শর্করার মাত্রা পরীক্ষা করুন</p>
                </div>
                <div className="text-right flex flex-col items-end">
                  <span className="px-3 py-1 rounded-full bg-tertiary-container/20 text-tertiary text-xs font-bold uppercase tracking-widest mb-1">Due soon</span>
                  <span className="text-[10px] text-outline opacity-60">in 20 minutes</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Goals and Vitals Sidebar */}
        <section className="col-span-4 space-y-8">
          {/* Today's Goal Section */}
          <div className="bg-surface-container-low rounded-xl p-8 border border-white/5 flex flex-col items-center text-center relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4">
              <span className="material-symbols-outlined text-primary/30 text-4xl">water_drop</span>
            </div>
            <h4 className="text-lg font-headline font-bold text-white mb-8">Hydration Goal</h4>
            {/* Progress Ring */}
            <div className="relative w-48 h-48 mb-8">
              <svg className="w-full h-full" viewBox="0 0 100 100">
                <circle className="text-surface-container-highest stroke-current" cx="50" cy="50" fill="transparent" r="42" strokeWidth="8"></circle>
                <circle className="text-primary stroke-current progress-ring-circle" cx="50" cy="50" fill="transparent" r="42" strokeLinecap="round" strokeWidth="8" style={{ strokeDasharray: 264, strokeDashoffset: 66 }}></circle>
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-4xl font-headline font-extrabold text-white">75%</span>
                <span className="text-xs text-outline uppercase tracking-widest">Completed</span>
              </div>
            </div>
            <div className="space-y-2">
              <p className="text-white font-medium text-xl">1.5L / 2.0L</p>
              <p className="text-outline text-sm">১.৫ লিটার / ২.০ লিটার</p>
            </div>
          </div>

          {/* Spline/Medical Visual Placeholder */}
          <div className="bg-surface-container rounded-xl aspect-square overflow-hidden relative group border border-white/5">
            <img
              alt="3D medical visualization"
              className="w-full h-full object-cover mix-blend-overlay opacity-60 group-hover:scale-110 transition-transform duration-1000"
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuClK59_hS_YbbUuf97KP5orhLY-Rmz41mF1dNy9MsQiGqJOipO3kXlFlWs4Xz_RD0n5s69NU-LCbcMXpdYYjOd0fVUGcFfMhpZQHfmPzNtMoJsWb_IVUPENYe61vulNMWIsPPbOgfuKJvKvD9PrJLjARhJ5z8Zgj2ZZhUJed0O6gSBEumX81HyCWu-y3aKrXqiKllWvgHflb2l5x4VWh5JJLx5-mPualR9dFmAmq3pDg7Bx14biFlzygePk7e04v7IgmEVNrylyCg"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-surface to-transparent"></div>
            <div className="absolute bottom-0 left-0 p-8">
              <p className="text-primary font-bold text-sm tracking-widest uppercase mb-1">Heart Health</p>
              <p className="text-white text-lg font-headline">Rhythm: Sinus</p>
            </div>
          </div>
        </section>
      </div>

      <div className="mt-12 flex justify-end">
        <Link 
          to="/clarity-hub" 
          className="bg-primary/10 text-primary border border-primary/20 py-4 px-8 rounded-full font-bold hover:bg-primary hover:text-on-primary transition-all shadow-xl shadow-primary/5"
        >
          Open Detailed Clarity Center
        </Link>
      </div>

      {/* Contextual TTS Floating Button */}
      <button className="fixed bottom-12 right-12 w-20 h-20 bg-primary-container/80 backdrop-blur-xl text-on-primary-container rounded-full shadow-[0_20px_40px_rgba(20,184,166,0.4)] flex items-center justify-center hover:scale-110 active:scale-95 transition-all z-50 border border-primary/20 group">
        <div className="absolute inset-0 rounded-full border-4 border-primary/20 animate-ping"></div>
        <span className="material-symbols-outlined text-3xl" style={{ fontVariationSettings: "'FILL' 1" }}>record_voice_over</span>
      </button>
    </div>
  );
}

export default ClarityHubPage;
