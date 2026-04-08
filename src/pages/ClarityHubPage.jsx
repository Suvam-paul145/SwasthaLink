import { lazy, Suspense, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const AmbientDNA = lazy(() => import('../components/effects/AmbientDNA'));
import { getGroqChatbotReply } from "../services/groq";
import { speak, stop } from "../utils/tts";
import { LANGUAGE_LABELS } from "../utils/config";
import { isDemoPatient, getMockPrescriptions, getMockAllChunks } from "../utils/mockData";

// -- Bengali digit converter
const toBn = (n) => String(n).replace(/[0-9]/g, (d) => '০১২৩৪৫৬৭৮৯'[d]);

// -- Detect Bengali script
const hasBengali = (text) => /[\u0980-\u09FF]/.test(text);

// -- Medication time slots
const SLOTS = [
  { key: 'morning', label: 'Morning', bn: 'সকাল', icon: '🌅', hours: [6, 12] },
  { key: 'evening', label: 'Evening', bn: 'সন্ধ্যা', icon: '🌆', hours: [16, 20] },
  { key: 'night', label: 'Night', bn: 'রাত', icon: '🌙', hours: [20, 24] },
];

function getMedsBySlot(medications) {
  const result = {};
  for (const s of SLOTS) result[s.key] = medications.filter((m) => m.schedule?.[s.key]);
  return result;
}

// -- Local chatbot answer builder for demo patients (works offline, bilingual)
function buildDemoAnswer(question, chunks, prescriptions) {
  const q = question.toLowerCase();
  const bn = hasBengali(question);
  const meds = chunks?.medication?.[0]?.data?.medications || [];
  const routine = chunks?.routine?.[0]?.data?.steps || [];
  const faqs = chunks?.faq_context?.[0]?.data?.faqs || [];
  const explanations = chunks?.explanation?.[0]?.data?.explanations || [];
  const insights = prescriptions?.[0]?.extracted_data?.patient_insights;

  // 1. FAQ keyword match
  for (const faq of faqs) {
    const words = (faq.q || '').toLowerCase().split(/\s+/).filter((w) => w.length > 3);
    if (words.filter((w) => q.includes(w)).length >= 2) {
      return { text: faq.a, subtext: bn ? `প্রশ্ন: ${faq.q}` : null };
    }
  }

  // 2. Medication / ওষুধ
  const medKw = ['medicine','medication','ওষুধ','মেডিসিন','ট্যাবলেট','drug','pill','dose','খেতে','ওষুধগুলো','medication plan'];
  if (medKw.some((k) => q.includes(k))) {
    const bySlot = getMedsBySlot(meds);
    let text = '📋 Today\'s Medication Schedule:\n\n';
    let sub = '📋 আজকের ওষুধের তালিকা:\n\n';
    for (const s of SLOTS) {
      const sm = bySlot[s.key];
      if (!sm.length) continue;
      text += `${s.icon} ${s.label}:\n`;
      sub += `${s.icon} ${s.bn}:\n`;
      for (const m of sm) {
        text += `  • ${m.name} ${m.strength} — ${m.purpose}\n`;
        sub += `  • ${m.name} ${m.strength} — ${m.purpose}\n`;
      }
      text += '\n'; sub += '\n';
    }
    const asNeeded = meds.filter((m) => !Object.values(m.schedule || {}).some(Boolean));
    if (asNeeded.length) {
      text += '💊 As needed:\n'; sub += '💊 প্রয়োজনে:\n';
      for (const m of asNeeded) {
        text += `  • ${m.name} ${m.strength} — ${m.purpose}\n`;
        sub += `  • ${m.name} ${m.strength} — ${m.purpose}\n`;
      }
    }
    return { text: text.trim(), subtext: sub.trim() };
  }

  // 3. Routine / schedule / কখন
  const routKw = ['routine','schedule','কখন','সময়','timetable','when','daily','plan','দিন','রুটিন'];
  if (routKw.some((k) => q.includes(k))) {
    let text = '🕐 Your Daily Routine:\n\n';
    for (const s of routine) {
      const p = s.priority === 'critical' ? '🔴' : s.priority === 'high' ? '🟡' : '⚪';
      text += `${p} ${s.time} — ${s.activity}\n`;
    }
    return { text: text.trim(), subtext: bn ? '🕐 আপনার দৈনিক রুটিন উপরে দেওয়া হলো।' : null };
  }

  // 4. Diet / খাবার
  const dietKw = ['diet','food','eat','খাবার','ভাত','মিষ্টি','ডায়েট','rice','sugar','sweets','diet tips'];
  if (dietKw.some((k) => q.includes(k))) {
    const dd = insights?.dos_and_donts;
    if (dd) {
      let text = '🥗 Diet & Lifestyle Guidelines:\n\n✅ Do\'s:\n';
      (dd.do || dd.dos || []).forEach((d, i) => { text += `${i + 1}. ${d}\n`; });
      text += '\n❌ Don\'ts:\n';
      (dd.dont || dd.donts || []).forEach((d, i) => { text += `${i + 1}. ${d}\n`; });
      return { text: text.trim(), subtext: bn ? '🥗 আপনার খাবার ও জীবনযাত্রার নির্দেশনা উপরে দেওয়া হলো।' : null };
    }
  }

  // 5. Danger / warning / বিপদ
  const dangerKw = ['danger','warning','emergency','বিপদ','জরুরি','ইমার্জেন্সি','hospital','danger signs'];
  if (dangerKw.some((k) => q.includes(k))) {
    return {
      text: '🚨 Emergency Warning Signs:\n\n• BP above 180/110 mmHg\n• Blood sugar above 400 mg/dL or below 60 mg/dL\n• Chest pain or tightness\n• Sudden severe headache\n• Weakness on one side of body\n• Difficulty speaking\n• Fainting or loss of consciousness\n\n⚠️ Go to the nearest ER immediately if any of these occur.',
      subtext: '🚨 জরুরি সতর্কতা:\n\n• রক্তচাপ ১৮০/১১০ এর উপরে\n• সুগার ৪০০ এর উপরে বা ৬০ এর নিচে\n• বুকে ব্যথা\n• হঠাৎ তীব্র মাথাব্যথা\n• এক পাশে দুর্বলতা\n• কথা বলতে অসুবিধা\n• অজ্ঞান হওয়া\n\n⚠️ এর যেকোনো একটি হলে এখনই জরুরি বিভাগে যান।',
    };
  }

  // 6. Follow-up
  const fuKw = ['follow-up','followup','follow up','appointment','ফলো-আপ','চেকআপ','next visit','follow-up dates'];
  if (fuKw.some((k) => q.includes(k))) {
    return {
      text: '📅 Follow-up Schedule:\n\n1. BP review — 1 week\n2. Blood Sugar (FBS + PPBS) — 1 week\n3. HbA1c recheck — 3 months\n4. Kidney function (Creatinine, eGFR) — 1 month\n5. Eye check-up (Fundoscopy) — within 1 month\n6. ECG repeat — 1 month\n\n⚠️ Immediate review if BP > 180/110 or sugar > 400.',
      subtext: bn ? '📅 ফলো-আপ সূচি:\n\n১. রক্তচাপ — ১ সপ্তাহ\n২. রক্তে শর্করা — ১ সপ্তাহ\n৩. HbA1c — ৩ মাস\n৪. কিডনি পরীক্ষা — ১ মাস\n৫. চোখ পরীক্ষা — ১ মাস\n৬. ECG — ১ মাস' : null,
    };
  }

  // 7. Explanation topic match
  for (const exp of explanations) {
    const tw = exp.topic.toLowerCase().split(/\s+/).filter((w) => w.length > 3);
    if (tw.filter((w) => q.includes(w)).length >= 2) {
      return { text: `📖 ${exp.topic}\n\n${exp.explanation}`, subtext: bn ? `📖 ${exp.topic}` : null };
    }
  }

  // 8. Specific medication name lookup
  for (const m of meds) {
    if (q.includes(m.name.toLowerCase())) {
      const guide = insights?.medication_guide?.find((g) => g.name?.toLowerCase().includes(m.name.toLowerCase()));
      let text = `💊 ${m.name} ${m.strength} (${m.form})\n\nPurpose: ${m.purpose}\nFrequency: ${m.frequency}\nInstructions: ${m.instructions}\n⚠️ Warning: ${m.warnings}`;
      if (guide) text += `\n\n📝 Simple guide:\n• What: ${guide.what}\n• Why: ${guide.why}\n• When: ${guide.when}\n• ⚠️ Caution: ${guide.caution}`;
      return { text, subtext: bn ? `💊 ${m.name} — ${m.purpose}` : null };
    }
  }

  // 9. Health summary
  if (['health','summary','condition','diagnosis','স্বাস্থ্য','রোগ','অবস্থা'].some((k) => q.includes(k))) {
    if (insights?.health_summary) return { text: insights.health_summary, subtext: bn ? 'আপনার স্বাস্থ্য সারসংক্ষেপ।' : null };
  }

  // 10. Fallback — overview + suggestions
  const bySlot = getMedsBySlot(meds);
  let text = 'I can help with your care plan! Here\'s a quick overview:\n\n';
  for (const s of SLOTS) {
    const sm = bySlot[s.key];
    if (sm.length) text += `${s.icon} ${s.label}: ${sm.map((m) => `${m.name} ${m.strength}`).join(', ')}\n`;
  }
  text += '\n💡 Try asking:\n• "What medicine should I take?"\n• "Can I eat rice?"\n• "When should I go to ER?"\n• "Tell me about Metformin"';
  return {
    text,
    subtext: bn
      ? 'আমি আপনার চিকিৎসা বুঝতে সাহায্য করতে পারি! জিজ্ঞাসা করুন:\n• "আমার কি ওষুধ খেতে হবে?"\n• "ভাত খেতে পারব?"\n• "কখন হাসপাতালে যেতে হবে?"'
      : null,
  };
}

function ClarityHubPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const patientId = user?.user_id || user?.id || user?.email || "";
  const isDemo = isDemoPatient(user?.email);
  const mockChunks = useMemo(() => isDemo ? getMockAllChunks() : null, [isDemo]);
  const mockRx = useMemo(() => isDemo ? getMockPrescriptions() : null, [isDemo]);
  const [isAssistantOpen, setIsAssistantOpen] = useState(false);
  const [isAssistantTyping, setIsAssistantTyping] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const [chatMessages, setChatMessages] = useState([
    {
      id: "welcome",
      sender: "assistant",
      text: "Hi, I can help with medicines, diet, warning signs, and follow-up steps. Ask anything about your prescription.",
      subtext: "হাই, আমি ওষুধ, খাবার, বিপদের লক্ষণ এবং ফলো-আপ বুঝিয়ে দিতে পারি। প্রেসক্রিপশন নিয়ে যেকোনো কিছু জিজ্ঞাসা করুন।"
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

  const rolePanels = useMemo(
    () => {
      const allPanels = [
        {
          id: "doctor",
          title: "Doctor Panel",
          subtitle: "Upload and extract prescriptions",
          route: "/doctor-panel",
          icon: "stethoscope",
        },
        {
          id: "admin",
          title: "Admin Panel",
          subtitle: "Review extracted prescriptions",
          route: "/admin-panel",
          icon: "admin_panel_settings",
        },
        {
          id: "patient",
          title: "Patient Panel",
          subtitle: "View patient dashboard",
          route: "/family-dashboard",
          icon: "personal_injury",
        },
      ];
      return allPanels.filter(p => !user?.role || p.id === user.role);
    },
    [user?.role]
  );

  // Handles both quick actions and freeform questions — uses local data for demo patients
  const respondToPrompt = async (promptLabel, customText = null) => {
    setIsAssistantTyping(true);
    const question = customText || promptLabel;
    let answer = { text: '', subtext: null };
    if (isDemo && mockChunks) {
      // Offline intelligent answer from mock data — natural typing delay
      await new Promise((r) => setTimeout(r, 400 + Math.random() * 600));
      answer = buildDemoAnswer(question, mockChunks, mockRx);
    } else {
      try {
        const result = await getGroqChatbotReply(patientId, question);
        answer = { text: result?.answer || 'Sorry, I could not find an answer.', subtext: null };
      } catch {
        answer = { text: 'Sorry, there was an error contacting the assistant.', subtext: null };
      }
    }
    setChatMessages((prev) => [
      ...prev,
      {
        id: `${Date.now()}-assistant`,
        sender: "assistant",
        text: answer.text,
        ...(answer.subtext ? { subtext: answer.subtext } : {}),
      },
    ]);
    setIsAssistantTyping(false);
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
    respondToPrompt("custom", trimmed);
  };

  const [isSpeakingState, setIsSpeakingState] = useState(false);
  const [selectedLang, setSelectedLang] = useState('bn');

  // Build dynamic treatment items from mock medication data
  const treatmentItems = useMemo(() => {
    const meds = mockChunks?.medication?.[0]?.data?.medications;
    if (!meds) return [];
    const hour = new Date().getHours();
    const items = [];
    const bySlot = getMedsBySlot(meds);
    for (const slot of SLOTS) {
      const slotMeds = bySlot[slot.key];
      if (!slotMeds.length) continue;
      const [startH, endH] = slot.hours;
      let status = 'pending', statusLabel = 'Pending', statusStyle = 'bg-primary-container/20 text-primary-fixed';
      let timeNote = null;
      if (hour >= endH) {
        status = 'completed'; statusLabel = 'Completed';
        statusStyle = 'bg-surface-container-highest text-outline';
      } else if (hour >= startH) {
        status = 'due'; statusLabel = 'Due now';
        statusStyle = 'bg-tertiary-container/20 text-tertiary';
        const minsLeft = (endH - hour) * 60 - new Date().getMinutes();
        if (minsLeft > 30) timeNote = `within ${Math.floor(minsLeft / 60)}h ${minsLeft % 60}m`;
        else if (minsLeft > 0) timeNote = `in ${minsLeft} minutes`;
      }
      for (const m of slotMeds) {
        items.push({
          id: `${slot.key}-${m.name}`, name: `${m.name} ${m.strength}`,
          purpose: m.purpose, slot: slot.label, slotBn: slot.bn,
          slotIcon: slot.icon, status, statusLabel, statusStyle, timeNote, form: m.form,
        });
      }
    }
    // As-needed meds
    const asNeeded = meds.filter((m) => !Object.values(m.schedule || {}).some(Boolean));
    for (const m of asNeeded) {
      items.push({
        id: `prn-${m.name}`, name: `${m.name} ${m.strength}`,
        purpose: m.purpose, slot: 'As needed', slotBn: 'প্রয়োজনে',
        slotIcon: '💊', status: 'prn', statusLabel: 'As needed',
        statusStyle: 'bg-blue-500/20 text-blue-300', timeNote: m.instructions, form: m.form,
      });
    }
    return items;
  }, [mockChunks]);

  const handleSpeak = () => {
    if (isSpeakingState) {
      stop();
      setIsSpeakingState(false);
    } else {
      // Dynamic speech from actual treatment items
      let text;
      if (selectedLang === 'bn' || selectedLang === 'hi') {
        text = treatmentItems
          .filter((t) => t.status !== 'completed')
          .map((t) => `${t.slotBn}: ${t.name}, ${t.purpose}`)
          .join('। ') || 'আজকের সব ওষুধ সম্পন্ন হয়েছে।';
      } else {
        text = treatmentItems
          .filter((t) => t.status !== 'completed')
          .map((t) => `${t.slot}: ${t.name}, ${t.purpose}`)
          .join('. ') || 'All medications for today are completed.';
      }
      speak(text, selectedLang, () => setIsSpeakingState(false));
      setIsSpeakingState(true);
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-12 relative z-10">
      <Suspense fallback={null}>
        <AmbientDNA className="hidden lg:block absolute right-0 top-16 w-44 h-64 opacity-25 z-0" />
      </Suspense>

      {/* Header Section */}
      <header className="mb-10 flex flex-col gap-6 lg:mb-16 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-4">
          <span className="text-teal-400 font-bold tracking-widest uppercase text-xs">Clarity Hub</span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-headline font-extrabold tracking-tight text-white leading-tight">
            Welcome, {user?.name || 'User'}.<br />
            <span className="text-2xl sm:text-3xl lg:text-[inherit] text-teal-400/80 font-normal">স্বাগতম, {user?.name || 'ব্যবহারকারী'}।</span>
          </h2>
        </div>
        <div className="flex w-full flex-col items-stretch gap-3 sm:flex-row sm:items-center lg:w-auto">
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
          <div className="bg-white/5 p-4 rounded-xl flex items-center justify-between gap-4 border border-white/5 backdrop-blur-md">
            <div className="text-left sm:text-right">
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Role Access</p>
              <p className="text-xl font-bold text-teal-300">{user?.role?.toUpperCase() || 'GUEST'}</p>
            </div>
            <span className="material-symbols-outlined text-teal-400 text-3xl">verified_user</span>
          </div>
        </div>
      </header>

      <section className="mb-10 glass-card rounded-2xl border border-white/10 p-4 lg:p-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <p className="text-[11px] uppercase tracking-[0.2em] text-teal-200">Management</p>
            <p className="text-sm text-slate-300 mt-1">Access your dedicated administrative or clinical dashboard.</p>
          </div>
          <div className="flex gap-3 w-full lg:w-auto overflow-x-auto pb-2 lg:pb-0">
            {rolePanels.map((panel) => (
              <button
                key={panel.id}
                onClick={() => navigate(panel.route)}
                className="w-full sm:w-auto min-w-[14rem] rounded-xl border border-white/15 bg-white/[0.04] hover:bg-teal-400/20 hover:border-teal-300/40 transition-all px-4 py-3 text-left"
              >
                <div className="flex items-center gap-2 text-teal-200">
                  <span className="material-symbols-outlined text-[20px]">{panel.icon}</span>
                  <span className="text-sm font-bold text-white">{panel.title}</span>
                </div>
                <p className="text-xs text-slate-400 mt-1">{panel.subtitle}</p>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Bento Grid Layout */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 lg:gap-8 items-start">
        {/* Central Clarity Glass Card */}
        <section className="xl:col-span-8 glass-card rounded-xl p-6 sm:p-8 lg:p-10 relative overflow-hidden group">
          <div className="absolute -top-24 -right-24 w-64 h-64 bg-primary/10 rounded-full blur-3xl group-hover:bg-primary/20 transition-all duration-700"></div>
          <div className="relative z-10">
            <div className="mb-8 flex flex-col gap-4 sm:mb-12 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h3 className="text-2xl font-headline font-bold text-white mb-2">Today's Treatment Plan</h3>
                <p className="text-outline text-lg">আপনার আজকের চিকিৎসা পরিকল্পনা</p>
              </div>
              <button onClick={handleSpeak} className={`w-14 h-14 self-start rounded-full ${isSpeakingState ? 'bg-red-500/20 text-red-400' : 'bg-primary/10 text-primary'} flex items-center justify-center hover:bg-primary hover:text-on-primary transition-all duration-300 shadow-xl shadow-primary/5 group/speaker relative`}>
                {!isSpeakingState && <span className="absolute inset-0 rounded-full bg-primary animate-ping opacity-20 group-hover:hidden"></span>}
                <span className="material-symbols-outlined text-2xl">{isSpeakingState ? 'stop' : 'volume_up'}</span>
              </button>
            </div>

            <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2">
              {treatmentItems.length > 0 ? treatmentItems.map((item) => (
                <div key={item.id} className={`flex flex-col items-start gap-4 p-5 rounded-lg bg-white/5 hover:bg-white/10 transition-all group/item cursor-pointer sm:flex-row sm:items-center sm:gap-5 ${item.status === 'due' ? 'border-l-2 border-l-teal-400' : ''}`}>
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                    item.status === 'completed' ? 'bg-primary' : 'border-2 border-primary/40 group-hover/item:border-primary transition-colors'
                  }`}>
                    {item.status === 'completed' ? (
                      <span className="material-symbols-outlined text-on-primary" style={{ fontVariationSettings: "'wght' 700" }}>check</span>
                    ) : item.form === 'Injection' ? (
                      <span className="material-symbols-outlined text-primary text-[18px]">vaccines</span>
                    ) : (
                      <span className="material-symbols-outlined text-primary scale-0 group-hover/item:scale-100 transition-transform">check</span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="text-xs text-teal-300/70">{item.slotIcon} {item.slot}</span>
                    <p className={`text-lg font-medium mt-0.5 ${item.status === 'completed' ? 'text-white/50 line-through' : 'text-white'}`}>{item.name}</p>
                    <p className={`text-sm ${item.status === 'completed' ? 'text-outline/50' : 'text-outline'}`}>{item.purpose}</p>
                  </div>
                  <div className="flex w-full flex-col items-start text-left sm:w-auto sm:items-end sm:text-right shrink-0">
                    <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-widest ${item.statusStyle}`}>{item.statusLabel}</span>
                    {item.timeNote && <span className="text-[10px] text-outline opacity-60 mt-1">{item.timeNote}</span>}
                  </div>
                </div>
              )) : (
                <div className="text-center py-12 text-outline">
                  <span className="material-symbols-outlined text-4xl mb-2 block text-primary/40">medication</span>
                  <p>No medication data available.</p>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Goals and Vitals Sidebar */}
        <section className="xl:col-span-4 space-y-6 lg:space-y-8">
          {/* Today's Goal Section */}
          <div className="bg-surface-container-low rounded-xl p-6 sm:p-8 border border-white/5 flex flex-col items-center text-center relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4">
              <span className="material-symbols-outlined text-primary/30 text-4xl">water_drop</span>
            </div>
            <h4 className="text-lg font-headline font-bold text-white mb-8">Hydration Goal</h4>
            {/* Progress Ring */}
            <div className="relative w-40 h-40 sm:w-48 sm:h-48 mb-8">
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

      <div className="mt-8 flex justify-center sm:mt-12 sm:justify-end">
        <Link 
          to="/clarity-hub" 
          className="w-full sm:w-auto text-center bg-primary/10 text-primary border border-primary/20 py-4 px-8 rounded-full font-bold hover:bg-primary hover:text-on-primary transition-all shadow-xl shadow-primary/5"
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
                  <p className="text-white text-sm font-bold tracking-wide">Clarity Assistant</p>
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
                  <p className="text-sm leading-relaxed whitespace-pre-line">{message.text}</p>
                  {message.subtext ? <p className="text-xs mt-1 text-teal-100/90 whitespace-pre-line">{message.subtext}</p> : null}
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
                    onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                    placeholder="Ask anything about your care plan..."
                    className="w-full bg-transparent resize-none outline-none text-sm text-white placeholder:text-slate-400"
                  />
                </div>



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
          className="relative h-16 w-16 sm:h-20 sm:w-20 rounded-full bg-gradient-to-br from-teal-300 via-teal-400 to-cyan-500 text-[#043437] shadow-[0_20px_40px_rgba(20,184,166,0.45)] flex items-center justify-center hover:scale-110 active:scale-95 transition-all border border-white/35"
          aria-label="Toggle clarity assistant"
        >
          <span className="absolute inset-0 rounded-full border-4 border-teal-200/30 animate-ping"></span>
          <span className="material-symbols-outlined text-2xl sm:text-3xl" style={{ fontVariationSettings: "'FILL' 1" }}>chat</span>
        </button>
      </div>
    </div>
  );
}

export default ClarityHubPage;

