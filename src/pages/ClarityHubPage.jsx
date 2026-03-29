import { useMemo, useState } from "react";
import { Link } from "react-router-dom";

function ClarityHubPage() {
  const [isAssistantOpen, setIsAssistantOpen] = useState(false);
  const [isAssistantTyping, setIsAssistantTyping] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const [chatMessages, setChatMessages] = useState([
    {
      id: "welcome",
      sender: "assistant",
      text: "Hi Rahat, I can help with medicines, diet, warning signs, and follow-up steps.",
      subtext: "হাই রাহাত, আমি ওষুধ, খাবার, বিপদের লক্ষণ এবং ফলো-আপ বুঝিয়ে দিতে পারি।"
    },
  ]);

  const quickActions = useMemo(
    () => [
      { icon: "medication", label: "Medication plan" },
      { icon: "restaurant", label: "Diet tips" },
      { icon: "warning", label: "Danger signs" },
      { icon: "event", label: "Follow-up dates" },
    ],
    []
  );

  const respondToPrompt = (promptLabel) => {
    const cannedResponses = {
      "Medication plan": {
        text: "Next dose: insulin 10 units at 8:00 PM, then BP tablet after dinner. I can set reminders for both.",
        subtext: "পরের ডোজ: রাত ৮টায় ইনসুলিন ১০ ইউনিট, তারপর রাতের খাবারের পরে BP ট্যাবলেট। চাইলে রিমাইন্ডার সেট করে দিই।"
      },
      "Diet tips": {
        text: "Tonight, choose low-salt meals, avoid sugary drinks, and drink 2 glasses of water before sleep.",
        subtext: "আজ রাতের খাবারে কম লবণ রাখুন, মিষ্টি পানীয় এড়িয়ে চলুন, ঘুমানোর আগে ২ গ্লাস পানি পান করুন।"
      },
      "Danger signs": {
        text: "If sugar is above 300, severe dizziness, chest pain, or breathlessness appears, contact emergency care immediately.",
        subtext: "শর্করা ৩০০-এর বেশি হলে, তীব্র মাথা ঘোরা, বুক ব্যথা বা শ্বাসকষ্ট হলে দ্রুত জরুরি সেবা নিন।"
      },
      "Follow-up dates": {
        text: "Your next review is in 3 days. Bring BP/sugar logs and current medication strips.",
        subtext: "আপনার পরবর্তী রিভিউ ৩ দিনের মধ্যে। BP/শর্করার রেকর্ড এবং বর্তমান ওষুধের স্ট্রিপ সাথে আনুন।"
      },
      custom: {
        text: "I noted your question. Want a short answer, step-by-step guide, or Bengali-only explanation?",
        subtext: "আপনার প্রশ্ন নোট করা হয়েছে। সংক্ষিপ্ত উত্তর, ধাপে ধাপে গাইড, নাকি শুধু বাংলা ব্যাখ্যা চান?"
      },
    };

    const response = cannedResponses[promptLabel] ?? cannedResponses.custom;
    setIsAssistantTyping(true);
    window.setTimeout(() => {
      setChatMessages((prev) => [
        ...prev,
        {
          id: `${Date.now()}-assistant`,
          sender: "assistant",
          text: response.text,
          subtext: response.subtext,
        },
      ]);
      setIsAssistantTyping(false);
    }, 800);
  };

  const handleQuickAction = (action) => {
    setChatMessages((prev) => [
      ...prev,
      {
        id: `${Date.now()}-user`,
        sender: "user",
        text: action.label,
      },
    ]);
    respondToPrompt(action.label);
  };

  const handleSend = () => {
    const trimmed = chatInput.trim();
    if (!trimmed) return;

    setChatMessages((prev) => [
      ...prev,
      {
        id: `${Date.now()}-user`,
        sender: "user",
        text: trimmed,
      },
    ]);
    setChatInput("");
    respondToPrompt("custom");
  };

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

      {/* Floating Assistant Widget */}
      <div className="fixed bottom-5 right-5 sm:bottom-8 sm:right-8 z-50 flex flex-col items-end gap-4">
        <div
          className={`w-[min(390px,calc(100vw-1.5rem))] h-[min(590px,calc(100vh-7rem))] rounded-[2rem] border border-teal-300/25 bg-gradient-to-b from-slate-900/95 via-[#0f2230]/95 to-[#071b2a]/95 shadow-[0_20px_70px_rgba(20,184,166,0.35)] backdrop-blur-2xl overflow-hidden transition-all duration-500 ${
            isAssistantOpen
              ? "translate-y-0 opacity-100 scale-100 pointer-events-auto"
              : "translate-y-8 opacity-0 scale-95 pointer-events-none"
          }`}
        >
          <div className="relative h-full flex flex-col">
            <div className="absolute -top-16 -right-16 h-40 w-40 rounded-full bg-teal-300/20 blur-3xl"></div>
            <div className="absolute -bottom-20 -left-20 h-48 w-48 rounded-full bg-cyan-400/15 blur-3xl"></div>

            <header className="relative px-5 py-4 border-b border-white/10 bg-white/[0.03] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="relative w-11 h-11 rounded-2xl bg-gradient-to-br from-teal-300 to-cyan-500 flex items-center justify-center shadow-lg shadow-teal-900/40">
                  <span className="material-symbols-outlined text-[#08383a]" style={{ fontVariationSettings: "'FILL' 1" }}>smart_toy</span>
                  <span className="absolute -right-1 -bottom-1 w-3 h-3 rounded-full bg-emerald-400 border-2 border-[#0c1d2a]"></span>
                </div>
                <div>
                  <p className="text-white text-sm font-bold tracking-wide">CareGuide Assistant</p>
                  <p className="text-teal-200/90 text-xs">Online • Bilingual Support</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button className="w-9 h-9 rounded-xl bg-white/5 hover:bg-white/10 transition-colors flex items-center justify-center" aria-label="More actions">
                  <span className="material-symbols-outlined text-slate-200 text-[20px]">more_horiz</span>
                </button>
                <button
                  onClick={() => setIsAssistantOpen(false)}
                  className="w-9 h-9 rounded-xl bg-white/5 hover:bg-white/10 transition-colors flex items-center justify-center"
                  aria-label="Close assistant"
                >
                  <span className="material-symbols-outlined text-slate-200 text-[20px]">close</span>
                </button>
              </div>
            </header>

            <div className="relative px-4 py-3 border-b border-white/10 bg-white/[0.02]">
              <p className="text-[11px] uppercase tracking-[0.18em] text-teal-200/80 mb-2">Quick Actions</p>
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

            <section className="relative flex-1 overflow-y-auto px-4 py-4 space-y-3">
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

              {isAssistantTyping ? (
                <div className="max-w-[60%] rounded-2xl px-4 py-3 bg-white/10 border border-white/10 text-slate-100">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-teal-200/80 animate-bounce"></span>
                    <span className="w-2 h-2 rounded-full bg-teal-200/80 animate-bounce [animation-delay:100ms]"></span>
                    <span className="w-2 h-2 rounded-full bg-teal-200/80 animate-bounce [animation-delay:200ms]"></span>
                  </div>
                </div>
              ) : null}
            </section>

            <footer className="relative p-3 border-t border-white/10 bg-white/[0.03]">
              <div className="flex items-end gap-2">
                <button className="w-10 h-10 shrink-0 rounded-xl bg-white/5 hover:bg-white/10 transition-colors flex items-center justify-center" aria-label="Attach file">
                  <span className="material-symbols-outlined text-slate-200">attach_file</span>
                </button>

                <div className="flex-1 rounded-2xl border border-white/15 bg-[#112638]/90 px-3 py-2 focus-within:border-teal-300/60 transition-colors">
                  <textarea
                    rows={1}
                    value={chatInput}
                    onChange={(event) => setChatInput(event.target.value)}
                    placeholder="Ask anything about your care plan..."
                    className="w-full bg-transparent resize-none outline-none text-sm text-white placeholder:text-slate-400"
                  />
                </div>

                <button className="w-10 h-10 shrink-0 rounded-xl bg-white/5 hover:bg-white/10 transition-colors flex items-center justify-center" aria-label="Voice input">
                  <span className="material-symbols-outlined text-slate-200">mic</span>
                </button>

                <button
                  onClick={handleSend}
                  className="w-10 h-10 shrink-0 rounded-xl bg-gradient-to-br from-teal-300 to-cyan-400 text-[#043437] shadow-lg shadow-teal-800/40 hover:scale-105 active:scale-95 transition-all flex items-center justify-center"
                  aria-label="Send message"
                >
                  <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>send</span>
                </button>
              </div>
            </footer>
          </div>
        </div>

        <button
          onClick={() => setIsAssistantOpen((prev) => !prev)}
          className="relative w-20 h-20 rounded-full bg-gradient-to-br from-teal-300 via-teal-400 to-cyan-500 text-[#043437] shadow-[0_20px_40px_rgba(20,184,166,0.45)] flex items-center justify-center hover:scale-110 active:scale-95 transition-all border border-white/35"
          aria-label="Toggle care assistant"
        >
          <span className="absolute inset-0 rounded-full border-4 border-teal-200/30 animate-ping"></span>
          <span className="material-symbols-outlined text-3xl" style={{ fontVariationSettings: "'FILL' 1" }}>
            {isAssistantOpen ? "chat" : "record_voice_over"}
          </span>
        </button>
      </div>
    </div>
  );
}

export default ClarityHubPage;
