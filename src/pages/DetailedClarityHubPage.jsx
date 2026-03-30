import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

function DetailedClarityHubPage() {
  const { user } = useAuth();
  const patientName = user?.name || "Patient";
  const [isVoicePanelOpen, setIsVoicePanelOpen] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [voiceLanguage, setVoiceLanguage] = useState("Both");
  const [activeMode, setActiveMode] = useState("Care Plan");
  const [voiceTimeline, setVoiceTimeline] = useState([
    {
      id: "voice-welcome",
      speaker: "assistant",
      title: "Ready to assist",
      content: "Tap the mic to explain your treatment in simple language.",
      translation: "সহজ ভাষায় চিকিৎসা পরিকল্পনা বুঝতে মাইক আইকনে ট্যাপ করুন।"
    }
  ]);

  const assistantModes = useMemo(
    () => ["Care Plan", "Medicine", "Diet", "Emergency"],
    []
  );

  const voiceShortcuts = useMemo(
    () => [
      { icon: "medication", label: "Next dose" },
      { icon: "schedule", label: "Set reminder" },
      { icon: "local_hospital", label: "Urgent signs" },
      { icon: "translate", label: "বাংলা only" },
    ],
    []
  );

  const pushAssistantResponse = (shortcutLabel) => {
    const responses = {
      "Next dose": {
        title: "Medication update",
        content: "Insulin 10 units at 8:00 PM, BP tablet after dinner.",
        translation: "রাত ৮টায় ইনসুলিন ১০ ইউনিট, রাতের খাবারের পর BP ট্যাবলেট।"
      },
      "Set reminder": {
        title: "Reminder draft",
        content: "I can remind at 7:30 PM and 9:00 PM for medicine and sugar check.",
        translation: "ওষুধ ও সুগার চেকের জন্য ৭:৩০ PM এবং ৯:০০ PM রিমাইন্ডার সেট করা যাবে।"
      },
      "Urgent signs": {
        title: "Immediate care",
        content: "Severe chest pain, breathlessness, or sugar above 300 needs emergency support.",
        translation: "তীব্র বুক ব্যথা, শ্বাসকষ্ট বা ৩০০-এর বেশি সুগার হলে দ্রুত জরুরি সহায়তা নিন।"
      },
      "বাংলা only": {
        title: "Language switched",
        content: "Voice responses can now focus on Bengali-first instructions.",
        translation: "এখন থেকে ভয়েস নির্দেশনা বাংলা-প্রধানভাবে দেওয়া হবে।"
      },
      default: {
        title: "CareGuide",
        content: "Your care summary is ready. Say 'repeat slowly' for a calmer pace.",
        translation: "আপনার কেয়ার সারাংশ প্রস্তুত। ধীরে শুনতে চাইলে বলুন 'repeat slowly'।"
      }
    };

    const response = responses[shortcutLabel] ?? responses.default;
    setVoiceTimeline((prev) => [
      ...prev,
      {
        id: `${Date.now()}-assistant`,
        speaker: "assistant",
        title: response.title,
        content: response.content,
        translation: response.translation,
      },
    ]);
  };

  const handleShortcut = (shortcut) => {
    setVoiceTimeline((prev) => [
      ...prev,
      {
        id: `${Date.now()}-user`,
        speaker: "user",
        title: "You asked",
        content: shortcut.label,
      },
    ]);
    pushAssistantResponse(shortcut.label);
  };

  const toggleListening = () => {
    const nextListening = !isListening;
    setIsListening(nextListening);

    if (nextListening) {
      setVoiceTimeline((prev) => [
        ...prev,
        {
          id: `${Date.now()}-user-voice`,
          speaker: "user",
          title: "Voice input",
          content: "Explain my night routine in short steps.",
        },
      ]);
      window.setTimeout(() => {
        pushAssistantResponse("default");
        setIsListening(false);
      }, 1300);
    }
  };

  return (
    <div className="p-12 relative z-10 max-w-7xl mx-auto">
      {/* Header Section */}
      <header className="mb-12 flex justify-between items-start">
        <div className="space-y-4">
          <span className="text-primary font-bold tracking-widest uppercase text-xs">Clarity Hub</span>
          <div className="flex flex-col gap-0.5">
            <h2 className="text-5xl font-headline font-extrabold tracking-tight text-white leading-tight">Welcome back, {patientName}.</h2>
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

      {/* Floating Voice Assistant */}
      <div className="fixed bottom-5 right-5 sm:bottom-8 sm:right-8 z-50 flex flex-col items-end gap-4">
        <div
          className={`w-[min(420px,calc(100vw-1.5rem))] h-[min(620px,calc(100vh-7rem))] rounded-[2rem] border border-teal-300/20 bg-gradient-to-b from-[#0b1c2c]/95 via-[#10263a]/95 to-[#0a1a2a]/95 shadow-[0_24px_80px_rgba(20,184,166,0.35)] backdrop-blur-2xl overflow-hidden transition-all duration-500 ${
            isVoicePanelOpen
              ? "translate-y-0 opacity-100 scale-100 pointer-events-auto"
              : "translate-y-8 opacity-0 scale-95 pointer-events-none"
          }`}
        >
          <div className="relative h-full flex flex-col">
            <div className="absolute -top-20 -right-16 h-44 w-44 rounded-full bg-teal-300/20 blur-3xl"></div>
            <div className="absolute -bottom-24 -left-14 h-56 w-56 rounded-full bg-cyan-400/15 blur-3xl"></div>

            <header className="relative px-5 py-4 border-b border-white/10 bg-white/[0.03] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`relative w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg ${isListening ? "bg-gradient-to-br from-rose-300 to-orange-300 shadow-rose-900/40" : "bg-gradient-to-br from-teal-300 to-cyan-500 shadow-teal-900/40"}`}>
                  <span className="material-symbols-outlined text-[#08383a]" style={{ fontVariationSettings: "'FILL' 1" }}>graphic_eq</span>
                  <span className={`absolute -right-1 -bottom-1 w-3 h-3 rounded-full border-2 border-[#0c1d2a] ${isListening ? "bg-rose-400 animate-pulse" : "bg-emerald-400"}`}></span>
                </div>
                <div>
                  <p className="text-white text-sm font-bold tracking-wide">Voice Assistant</p>
                  <p className="text-teal-200/90 text-xs">Clear guidance in real time</p>
                </div>
              </div>
              <button
                onClick={() => setIsVoicePanelOpen(false)}
                className="w-9 h-9 rounded-xl bg-white/5 hover:bg-white/10 transition-colors flex items-center justify-center"
                aria-label="Close voice assistant"
              >
                <span className="material-symbols-outlined text-slate-200 text-[20px]">close</span>
              </button>
            </header>

            <div className="px-4 py-3 border-b border-white/10 bg-white/[0.02] space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-[11px] uppercase tracking-[0.18em] text-teal-200/80">Assistant Mode</p>
                <div className="flex items-center gap-1 rounded-xl bg-white/5 border border-white/10 p-1">
                  {["Both", "EN", "BN"].map((lang) => (
                    <button
                      key={lang}
                      onClick={() => setVoiceLanguage(lang)}
                      className={`px-2 py-1 rounded-lg text-[10px] font-bold tracking-wider transition-all ${voiceLanguage === lang ? "bg-teal-300 text-[#053739]" : "text-slate-300 hover:bg-white/10"}`}
                    >
                      {lang}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                {assistantModes.map((mode) => (
                  <button
                    key={mode}
                    onClick={() => setActiveMode(mode)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${activeMode === mode ? "bg-teal-400/20 border-teal-300/40 text-teal-100" : "bg-white/5 border-white/10 text-slate-300 hover:bg-white/10"}`}
                  >
                    {mode}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-2">
                {voiceShortcuts.map((shortcut) => (
                  <button
                    key={shortcut.label}
                    onClick={() => handleShortcut(shortcut)}
                    className="rounded-xl border border-white/10 bg-white/5 hover:bg-teal-400/20 hover:border-teal-300/40 transition-all px-3 py-2 flex items-center gap-2 text-left"
                  >
                    <span className="material-symbols-outlined text-teal-200 text-[18px]">{shortcut.icon}</span>
                    <span className="text-xs text-white font-medium leading-tight">{shortcut.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <section className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
              {voiceTimeline.map((entry) => (
                <div
                  key={entry.id}
                  className={`max-w-[90%] rounded-2xl px-4 py-3 shadow-lg ${entry.speaker === "assistant" ? "bg-white/10 border border-white/10 text-slate-100" : "bg-teal-500/80 text-slate-950 ml-auto"}`}
                >
                  <p className="text-[11px] uppercase tracking-[0.16em] font-semibold opacity-80 mb-1">{entry.title}</p>
                  <p className="text-sm leading-relaxed">{entry.content}</p>
                  {entry.translation && voiceLanguage !== "EN" ? (
                    <p className="text-xs mt-1 text-teal-100/90">{entry.translation}</p>
                  ) : null}
                </div>
              ))}

              {isListening ? (
                <div className="max-w-[65%] rounded-2xl px-4 py-3 bg-white/10 border border-white/10 text-slate-100">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-rose-300/90 animate-bounce"></span>
                    <span className="w-2 h-2 rounded-full bg-rose-300/90 animate-bounce [animation-delay:120ms]"></span>
                    <span className="w-2 h-2 rounded-full bg-rose-300/90 animate-bounce [animation-delay:240ms]"></span>
                  </div>
                  <p className="text-[11px] mt-2 text-rose-100/90">Listening to your voice...</p>
                </div>
              ) : null}
            </section>

            <footer className="p-4 border-t border-white/10 bg-white/[0.03]">
              <div className="grid grid-cols-3 gap-2 mb-3">
                <button className="rounded-xl bg-white/5 hover:bg-white/10 transition-colors py-2 text-xs font-semibold text-slate-200 flex items-center justify-center gap-1">
                  <span className="material-symbols-outlined text-[18px]">volume_up</span>
                  Replay
                </button>
                <button className="rounded-xl bg-white/5 hover:bg-white/10 transition-colors py-2 text-xs font-semibold text-slate-200 flex items-center justify-center gap-1">
                  <span className="material-symbols-outlined text-[18px]">summarize</span>
                  Summarize
                </button>
                <button className="rounded-xl bg-white/5 hover:bg-white/10 transition-colors py-2 text-xs font-semibold text-slate-200 flex items-center justify-center gap-1">
                  <span className="material-symbols-outlined text-[18px]">save</span>
                  Save note
                </button>
              </div>

              <button
                onClick={toggleListening}
                className={`w-full rounded-2xl px-4 py-3 font-bold tracking-wide shadow-lg transition-all duration-300 flex items-center justify-center gap-2 ${isListening ? "bg-gradient-to-r from-rose-400 to-orange-300 text-[#3b1010] shadow-rose-900/40" : "bg-gradient-to-r from-teal-300 to-cyan-400 text-[#043437] shadow-teal-900/40 hover:scale-[1.01]"}`}
              >
                <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>{isListening ? "stop_circle" : "mic"}</span>
                {isListening ? "Stop Listening" : "Start Voice Assistant"}
              </button>
            </footer>
          </div>
        </div>

        <button
          onClick={() => setIsVoicePanelOpen((prev) => !prev)}
          className="relative w-20 h-20 rounded-full bg-gradient-to-br from-teal-300 via-teal-400 to-cyan-500 text-[#043437] shadow-[0_20px_40px_rgba(20,184,166,0.4)] flex items-center justify-center hover:scale-110 active:scale-95 transition-all border-4 border-surface"
          aria-label="Toggle voice assistant"
        >
          <span className="absolute inset-0 rounded-full border-4 border-teal-200/35 animate-ping"></span>
          <span className="material-symbols-outlined text-3xl" style={{ fontVariationSettings: "'FILL' 1" }}>
            {isVoicePanelOpen ? "graphic_eq" : "record_voice_over"}
          </span>

          {!isVoicePanelOpen ? (
            <span className="absolute bottom-full right-0 mb-5 px-3 py-2 rounded-xl bg-[#173542]/95 border border-white/10 text-right shadow-lg">
              <span className="block text-xs font-bold text-white leading-tight">Voice Assistant</span>
              <span className="block text-[10px] text-teal-300 leading-tight">ভয়েস অ্যাসিস্ট্যান্ট</span>
            </span>
          ) : null}
        </button>
      </div>
    </div>
  );
}

export default DetailedClarityHubPage;
