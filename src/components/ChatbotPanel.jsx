import { useState, useEffect, useRef } from 'react';
import api from '../services/api';

/**
 * ChatbotPanel — Floating chatbot for patient dashboard.
 * Uses ONLY stored patient data chunks (no hallucination).
 * Pre-loads FAQ suggestions from faq_context chunks.
 */
function ChatbotPanel({ patientId }) {
  const [isOpen, setIsOpen] = useState(false);
  const [faqs, setFaqs] = useState([]);
  const [messages, setMessages] = useState([
    { role: 'bot', text: 'Hi! I\'m your SwasthaLink health assistant. I can answer questions about your prescriptions, medications, and care instructions. Ask me anything!' }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  // Load FAQ suggestions on mount
  useEffect(() => {
    if (!patientId) return;
    const loadFaqs = async () => {
      try {
        const result = await api.getFaqSuggestions(patientId);
        setFaqs(result.items || []);
      } catch (err) {
        console.warn('Failed to load FAQ suggestions:', err.message);
      }
    };
    loadFaqs();
  }, [patientId]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleFaqClick = (faq) => {
    setMessages(prev => [
      ...prev,
      { role: 'user', text: faq.question },
      { role: 'bot', text: faq.answer || 'I don\'t have specific information about that yet. Please consult your doctor.' },
    ]);
  };

  const handleSend = async () => {
    const q = input.trim();
    if (!q || loading) return;

    setMessages(prev => [...prev, { role: 'user', text: q }]);
    setInput('');
    setLoading(true);

    try {
      // Search stored FAQs for a match
      const matchingFaq = faqs.find(f => {
        const faqWords = new Set(f.question.toLowerCase().split(/\s+/));
        const queryWords = q.toLowerCase().split(/\s+/);
        const overlap = queryWords.filter(w => w.length > 2 && faqWords.has(w)).length;
        return overlap >= 2;
      });

      if (matchingFaq) {
        setMessages(prev => [...prev, { role: 'bot', text: matchingFaq.answer }]);
      } else {
        // Try to get context from stored chunks
        try {
          const context = await api.getChatbotContext(patientId);
          const chunks = context.chunks || [];

          // Search through chunk data for relevant answers
          let bestAnswer = null;
          const queryLower = q.toLowerCase();

          for (const chunk of chunks) {
            const dataStr = JSON.stringify(chunk.data).toLowerCase();
            const queryWords = queryLower.split(/\s+/).filter(w => w.length > 2);
            const matchCount = queryWords.filter(w => dataStr.includes(w)).length;

            if (matchCount >= 2) {
              if (chunk.chunk_type === 'medication') {
                const meds = chunk.data.medications || [];
                const relevant = meds.filter(m =>
                  queryLower.includes(m.name?.toLowerCase())
                );
                if (relevant.length > 0) {
                  bestAnswer = relevant.map(m =>
                    `**${m.name}**: ${m.usage || 'As prescribed'}. Dosage: ${m.dosage || 'As directed'}. Duration: ${m.duration || 'As prescribed'}.`
                  ).join('\n\n');
                }
              } else if (chunk.chunk_type === 'explanation') {
                const details = chunk.data.details || [];
                const relevant = details.filter(d =>
                  queryLower.includes(d.medicine?.toLowerCase())
                );
                if (relevant.length > 0) {
                  bestAnswer = relevant.map(d =>
                    `**${d.medicine}**: ${d.reason}`
                  ).join('\n\n');
                }
              } else if (chunk.chunk_type === 'routine') {
                const instructions = chunk.data.instructions || [];
                if (instructions.length > 0) {
                  bestAnswer = 'Here are your care instructions:\n\n' + instructions.map((inst, i) => `${i + 1}. ${inst}`).join('\n');
                }
              }

              if (bestAnswer) break;
            }
          }

          if (bestAnswer) {
            setMessages(prev => [...prev, { role: 'bot', text: bestAnswer }]);
          } else {
            setMessages(prev => [...prev, {
              role: 'bot',
              text: 'I couldn\'t find specific information about that in your medical records. For accurate medical advice, please consult your doctor directly. You can also try asking about your specific medications or care instructions.'
            }]);
          }
        } catch {
          setMessages(prev => [...prev, {
            role: 'bot',
            text: 'I\'m having trouble accessing your medical data right now. Please try again in a moment.'
          }]);
        }
      }
    } catch {
      setMessages(prev => [...prev, {
        role: 'bot',
        text: 'Something went wrong. Please try again.'
      }]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (!patientId) return null;

  return (
    <>
      {/* Floating trigger button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 z-[60] w-14 h-14 rounded-full bg-gradient-to-br from-teal-500 to-cyan-600 text-white shadow-[0_8px_32px_rgba(45,212,191,0.4)] hover:shadow-[0_12px_40px_rgba(45,212,191,0.5)] hover:scale-110 transition-all flex items-center justify-center group"
        aria-label="Open Health Assistant"
      >
        <span className="material-symbols-outlined text-2xl group-hover:rotate-12 transition-transform" style={{ fontVariationSettings: "'FILL' 1" }}>
          {isOpen ? 'close' : 'smart_toy'}
        </span>
      </button>

      {/* Chat panel */}
      {isOpen && (
        <div className="fixed bottom-24 right-6 z-[60] w-[380px] max-h-[520px] bg-[#0a1520] border border-white/10 rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.6)] flex flex-col overflow-hidden backdrop-blur-xl animate-in slide-in-from-bottom-4 duration-300">
          {/* Header */}
          <div className="px-5 py-4 border-b border-white/10 bg-gradient-to-r from-teal-500/10 to-cyan-500/10 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-500/20 flex items-center justify-center border border-teal-500/30">
              <span className="material-symbols-outlined text-teal-300 text-xl" style={{ fontVariationSettings: "'FILL' 1" }}>smart_toy</span>
            </div>
            <div>
              <h4 className="text-white font-bold text-sm">Health Assistant</h4>
              <p className="text-teal-300 text-[10px] uppercase tracking-widest font-bold">Powered by your medical data</p>
            </div>
            <div className="ml-auto flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-[10px] text-emerald-400 font-bold">LIVE</span>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-[200px] max-h-[300px]">
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-teal-500/20 text-teal-100 rounded-br-md border border-teal-500/20'
                    : 'bg-white/[0.05] text-slate-300 rounded-bl-md border border-white/5'
                }`}>
                  {msg.text.split('\n').map((line, li) => (
                    <p key={li} className={li > 0 ? 'mt-1' : ''}>
                      {line.split('**').map((part, pi) =>
                        pi % 2 === 1 ? <strong key={pi} className="text-white">{part}</strong> : part
                      )}
                    </p>
                  ))}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-white/[0.05] px-4 py-3 rounded-2xl rounded-bl-md border border-white/5">
                  <div className="flex gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-teal-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                    <div className="w-2 h-2 rounded-full bg-teal-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                    <div className="w-2 h-2 rounded-full bg-teal-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* FAQ Suggestions */}
          {faqs.length > 0 && messages.length <= 2 && (
            <div className="px-4 py-2 border-t border-white/5">
              <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold mb-2">Quick Questions</p>
              <div className="flex flex-wrap gap-1.5">
                {faqs.slice(0, 4).map((faq, i) => (
                  <button
                    key={i}
                    onClick={() => handleFaqClick(faq)}
                    className="text-[11px] px-3 py-1.5 rounded-lg bg-white/[0.05] text-slate-300 hover:bg-teal-500/10 hover:text-teal-300 border border-white/5 hover:border-teal-500/20 transition-all truncate max-w-[180px]"
                  >
                    {faq.question}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Input */}
          <div className="px-4 py-3 border-t border-white/10 bg-white/[0.02]">
            <div className="flex gap-2 items-center">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask about your medications..."
                className="flex-1 bg-white/[0.05] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-teal-500/40 focus:ring-1 focus:ring-teal-500/20 transition-all"
              />
              <button
                onClick={handleSend}
                disabled={loading || !input.trim()}
                className="w-10 h-10 rounded-xl bg-teal-500/20 text-teal-300 hover:bg-teal-500/30 disabled:opacity-30 disabled:cursor-not-allowed transition-all flex items-center justify-center border border-teal-500/20"
              >
                <span className="material-symbols-outlined text-lg">send</span>
              </button>
            </div>
            <p className="text-[9px] text-slate-600 mt-2 text-center">
              Responses are based on your approved medical records only
            </p>
          </div>
        </div>
      )}
    </>
  );
}

export default ChatbotPanel;
