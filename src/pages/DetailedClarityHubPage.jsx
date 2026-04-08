import { lazy, Suspense, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const AmbientLungs = lazy(() => import('../components/effects/AmbientLungs'));
import { speak, stop } from "../utils/tts";
import { startListening } from "../utils/stt";
import { LANGUAGE_LABELS } from "../utils/config";

function DetailedClarityHubPage() {
  const { user } = useAuth();
  const patientName = user?.name || "Patient";

  const [chatMessages, setChatMessages] = useState([
    {
      id: "welcome",
      sender: "assistant",
      text: "Hi! I can help with your care plan, medicines, or questions. Type or tap mic to speak.",
      subtext: "আপনার কেয়ার প্ল্যান, ওষুধ বা প্রশ্নে সাহায্য করতে পারি। টাইপ করুন বা মাইক ট্যাপ করুন।"
    },
    {
      id: "voice-welcome",
      sender: "assistant",
      text: "Ready to assist\n\nTap the mic to explain your treatment in simple language.",
      subtext: "সহজ ভাষায় চিকিৎসা পরিকল্পনা বুঝতে মাইক আইকনে ট্যাপ করুন।"
    }
  ]);
  const [chatInput, setChatInput] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [isVoicePanelOpen, setIsVoicePanelOpen] = useState(false);


  const quickActions = useMemo(
    () => [
      { icon: "medication", label: "Next dose" },
      { icon: "schedule", label: "Set reminder" },
      { icon: "restaurant", label: "Diet" },
      { icon: "warning", label: "Warning signs" }
    ],
    []
  );


  const respondToPrompt = (promptLabel) => {
    const cannedResponses = {
      "Next dose": {
        text: "Insulin 10 units at 8:00 PM, BP tablet after dinner.",
        subtext: "রাত ৮টায় ইনসুলিন ১০ ইউনিট, রাতের খাবারের পর BP ট্যাবলেট।"
      },
      "Set reminder": {
        text: "Reminders set for 7:30 PM medicine and 9:00 PM sugar check.",
        subtext: "ওষুধ ও সুগার চেকের জন্য ৭:৩০ PM এবং ৯:০০ PM রিমাইন্ডার সেট।"
      },
      "Diet": {
        text: "Low-salt meals, avoid sugary drinks, 2 glasses water before sleep.",
        subtext: "কম লবণের খাবার, মিষ্টি পানীয় এড়ান, ঘুমের আগে ২ গ্লাস পানি।"
      },
      "Warning signs": {
        text: "Sugar >300, dizziness, chest pain, breathlessness - call emergency.",
        subtext: "শর্করা >৩০০, মাথা ঘোরা, বুক ব্যথা, শ্বাসকষ্ট - জরুরি সাহায্য নিন।"
      },
      custom: {
        text: "Got it. Need short answer, Bengali explanation, or repeat?",
        subtext: "বুঝলাম। সংক্ষেপ, বাংলা ব্যাখ্যা, নাকি পুনরাবৃত্তি?"
      }
    };

    const response = cannedResponses[promptLabel] || cannedResponses.custom;
    // Typing simulation
    setIsListening(true);
    setTimeout(() => {
      setChatMessages(prev => [...prev, {
        id: `${Date.now()}-assistant`,
        sender: "assistant",
        text: response.text,
        subtext: response.subtext
      }]);
      setIsListening(false);
    }, 1200);
  };


  const handleQuickAction = (action) => {
    setChatMessages(prev => [...prev, {
      id: `${Date.now()}-user`,
      sender: "user",
      text: action.label
    }]);
    respondToPrompt(action.label);
  };


  const handleSend = () => {
    const trimmed = chatInput.trim();
    if (!trimmed) return;
    setChatMessages(prev => [...prev, {
      id: `${Date.now()}-user`,
      sender: "user",
      text: trimmed
    }]);
    setChatInput("");
    respondToPrompt("custom");
  };

  const [isSpeakingState, setIsSpeakingState] = useState(false);
  const [recognitionRef, setRecognitionRef] = useState(null);
  const [selectedLang, setSelectedLang] = useState('bn');

  const handleSpeak = () => {
    if (isSpeakingState) {
      stop();
      setIsSpeakingState(false);
    } else {
      const text = "সকালে ইনসুলিন ১০ ইউনিট নিন। রক্তচাপের ওষুধ রাতের খাবারের পর নিন। রক্তে শর্করা পরীক্ষা করুন।";
      speak(text, selectedLang, () => setIsSpeakingState(false));
      setIsSpeakingState(true);
    }
  };

  const toggleListeningReal = () => {
    if (isListening && recognitionRef) {
      recognitionRef.stop();
      setRecognitionRef(null);
      setIsListening(false);
      return;
    }
    setIsListening(true);
    const rec = startListening(
      (transcript) => {
        setChatMessages(prev => [...prev, {
          id: `${Date.now()}-user`,
          sender: "user",
          text: transcript
        }]);
        respondToPrompt("custom");
      },
      selectedLang,
      () => {
        setIsListening(false);
        setRecognitionRef(null);
      }
    );
    setRecognitionRef(rec);
  };


  return (
    <div className="p-4 sm:p-6 lg:p-12 relative z-10 max-w-7xl mx-auto">
      <Suspense fallback={null}>
        <AmbientLungs className="hidden lg:block absolute -left-4 bottom-32 w-48 h-48 opacity-20 z-0" />
      </Suspense>

      {/* Header Section */}
      <header className="mb-10 flex flex-col gap-6 lg:mb-12 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-4">
          <span className="text-primary font-bold tracking-widest uppercase text-xs">Clarity Hub</span>
          <div className="flex flex-col gap-0.5">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-headline font-extrabold tracking-tight text-white leading-tight">Welcome back, {patientName}.</h2>
            <span className="text-2xl sm:text-3xl text-teal-400/80 font-headline font-medium">আবার স্বাগতম, রাহাত।</span>
          </div>
        </div>
        <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center lg:w-auto">
          <select
            value={selectedLang}
            onChange={(e) => setSelectedLang(e.target.value)}
            className="bg-white/5 border border-white/10 text-teal-200 text-sm rounded-xl px-3 py-2 backdrop-blur-md focus:border-teal-400/60 focus:outline-none cursor-pointer"
            aria-label="Select language"
          >
            {LANGUAGE_LABELS.map((l) => (
              <option key={l.code} value={l.code} className="bg-slate-900 text-white">{l.label}</option>
            ))}
          </select>
          <div className="glass-card bg-surface-container-low/30 px-4 sm:px-6 py-4 rounded-2xl flex items-center justify-between gap-5 border border-white/5">
            <div className="text-left sm:text-right">
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
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 lg:gap-8">
        {/* Left: Today's Treatment Plan (More Prominent) */}
        <section className="xl:col-span-8 flex flex-col gap-8">
          <div className="glass-card rounded-3xl p-6 sm:p-8 lg:p-10 relative overflow-hidden group border border-white/5">
            {/* Ambient Glow Decoration */}
            <div className="absolute -top-32 -right-32 w-80 h-80 bg-primary/5 rounded-full blur-[100px] pointer-events-none"></div>
            <div className="relative z-10">
              <div className="mb-8 flex flex-col gap-4 sm:mb-10 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex flex-col gap-0.5">
                  <h3 className="text-3xl font-headline font-bold text-white">Today's Treatment Plan</h3>
                  <p className="text-lg text-outline">আপনার আজকের চিকিৎসা পরিকল্পনা</p>
                </div>
                <button onClick={handleSpeak} className={`w-16 h-16 self-start rounded-2xl ${isSpeakingState ? 'bg-red-500/20 text-red-400' : 'bg-primary/10 text-primary'} flex items-center justify-center hover:bg-primary hover:text-on-primary transition-all duration-300 shadow-xl shadow-primary/5 group/speaker relative`}>
                  {!isSpeakingState && <span className="absolute inset-0 rounded-2xl bg-primary animate-ping opacity-10 group-hover:hidden"></span>}
                  <span className="material-symbols-outlined text-3xl">{isSpeakingState ? 'stop' : 'volume_up'}</span>
                </button>
              </div>

              <div className="space-y-5">
                {/* Checklist Items with improved spacing */}
                <div className="flex flex-col items-start gap-4 p-5 sm:flex-row sm:gap-6 sm:p-6 rounded-2xl bg-white/5 hover:bg-white/[0.08] transition-all border border-white/10 cursor-pointer group/item">
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

                <div className="flex flex-col items-start gap-4 p-5 sm:flex-row sm:gap-6 sm:p-6 rounded-2xl bg-teal-900/10 border border-teal-500/20 opacity-70 transition-all cursor-pointer group/item">
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

                <div className="flex flex-col items-start gap-4 p-5 sm:flex-row sm:gap-6 sm:p-6 rounded-2xl bg-white/5 hover:bg-white/[0.08] transition-all border border-white/10 cursor-pointer group/item">
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
        <section className="xl:col-span-4 flex flex-col gap-6 lg:gap-8">
          {/* Hydration Goal (Top Staggered Widget) */}
          <div className="glass-card rounded-3xl p-6 sm:p-8 flex flex-col items-center text-center relative group border border-white/5">
            <div className="absolute top-6 right-6">
              <span className="material-symbols-outlined text-primary/40 text-3xl group-hover:scale-110 transition-transform">water_drop</span>
            </div>
            <div className="flex flex-col gap-0.5 items-center mb-8">
              <h4 className="text-lg font-headline font-bold text-white uppercase tracking-wider">Hydration Goal</h4>
              <span className="text-xs text-outline font-medium">জলের লক্ষ্য</span>
            </div>
            {/* Progress Ring */}
            <div className="relative w-36 h-36 sm:w-44 sm:h-44 mb-8">
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
            <div className="absolute bottom-0 left-0 p-6 sm:p-8 w-full flex justify-between items-end">
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

      <div className="mt-8 sm:mt-12">
        <Link 
          to="/overview" 
          className="inline-block w-full sm:w-auto text-center bg-white/5 text-slate-400 border border-white/10 py-4 px-8 rounded-full font-bold hover:bg-white/10 hover:text-white transition-all"
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
                  <span className="material-symbols-outlined text-[#08383a]" style={{ fontVariationSettings: "'FILL' 1" }}>smart_toy</span>
                  <span className={`absolute -right-1 -bottom-1 w-3 h-3 rounded-full border-2 border-[#0c1d2a] ${isListening ? "bg-rose-400 animate-pulse" : "bg-emerald-400"}`}></span>
                </div>
                <div>
                  <p className="text-white text-sm font-bold tracking-wide">Clarity Assistant</p>
                  <p className="text-teal-200/90 text-xs">Text & Voice • Bilingual</p>
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

            <div className="px-4 py-3 border-b border-white/10 bg-white/[0.02]">
              <p className="text-[11px] uppercase tracking-[0.18em] text-teal-200/80 mb-3">Quick Actions</p>
              <div className="grid grid-cols-2 gap-2">
                {quickActions.map((action) => (
                  <button
                    key={action.label}
                    onClick={() => handleQuickAction(action)}
                    className="rounded-xl border border-white/10 bg-white/5 hover:bg-teal-400/20 hover:border-teal-300/40 transition-all px-3 py-2 flex items-center gap-2 text-left"
                  >
                    <span className="material-symbols-outlined text-teal-200 text-[18px]">{action.icon}</span>
                    <span className="text-xs text-white font-medium leading-tight">{action.label}</span>
                  </button>
                ))}
              </div>
            </div>


            <section className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
              {chatMessages.map((message) => (
                <div
                  key={message.id}
                  className={`max-w-[88%] rounded-2xl px-4 py-3 shadow-lg ${
                    message.sender === "assistant"
                      ? "bg-white/10 border border-white/10 text-slate-100"
                      : "bg-teal-500/85 text-slate-950 ml-auto"
                  }`}
                >
                  <p className="text-sm leading-relaxed">{message.text}</p>
                  {message.subtext ? <p className="text-xs mt-1 text-teal-100/90">{message.subtext}</p> : null}
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
              <div className="flex items-center gap-2">
                <button className="w-11 h-11 rounded-xl bg-white/5 hover:bg-white/10 transition-all flex items-center justify-center text-slate-300" aria-label="Attach">
                  <span className="material-symbols-outlined">attach_file</span>
                </button>
                <div className="flex-1">
                  <div className="flex items-center gap-2 rounded-2xl border border-white/15 bg-[#112638]/90 px-4 py-3 focus-within:border-teal-400/50 transition-colors">
                    <textarea
                      rows="1"
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      placeholder="Type your question..."
                      className="flex-1 bg-transparent outline-none text-sm text-white placeholder-slate-400 resize-none"
                    />
                  </div>
                </div>
                <button
                  onClick={toggleListeningReal}
                  className={`w-11 h-11 rounded-xl flex items-center justify-center transition-all ${isListening ? "bg-gradient-to-r from-rose-400 to-orange-300 text-white shadow-rose-500/40" : "bg-teal-400/20 text-teal-200 hover:bg-teal-400/40"}`}
                  aria-label="Voice"
                >
                  <span className="material-symbols-outlined text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>{isListening ? "stop" : "mic"}</span>
                </button>
                <button
                  onClick={handleSend}
                  className="w-11 h-11 rounded-xl bg-gradient-to-br from-teal-300 to-cyan-400 text-[#043437] shadow-lg shadow-teal-900/40 hover:scale-105 flex items-center justify-center"
                  aria-label="Send"
                >
                  <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>send</span>
                </button>
              </div>
            </footer>

          </div>
        </div>

        <button
          onClick={() => setIsVoicePanelOpen((prev) => !prev)}
          className="relative h-16 w-16 sm:h-20 sm:w-20 rounded-full bg-gradient-to-br from-teal-300 via-teal-400 to-cyan-500 text-[#043437] shadow-[0_20px_40px_rgba(20,184,166,0.4)] flex items-center justify-center hover:scale-110 active:scale-95 transition-all border-4 border-surface"
          aria-label="Toggle voice assistant"
        >
          <span className="absolute inset-0 rounded-full border-4 border-teal-200/35 animate-ping"></span>
          <span className="material-symbols-outlined text-2xl sm:text-3xl" style={{ fontVariationSettings: "'FILL' 1" }}>
            {isVoicePanelOpen ? "chat" : "smart_toy"}
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
