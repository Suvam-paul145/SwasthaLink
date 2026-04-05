import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { getGroqChatbotReply } from '../services/groq';

const ChatbotPanel = () => {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    { role: 'bot', text: 'Hi! I can answer questions about your prescriptions. All answers come from your approved medical records only.' }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [faqs, setFaqs] = useState([]);
  const messagesEndRef = useRef(null);
  const patientId = user?.user_id || user?.id || user?.email || '';

  useEffect(() => {
    if (isOpen && patientId) {
      api.getFaqSuggestions(patientId)
        .then(res => setFaqs(res.items || []))
        .catch(() => setFaqs([]));
    }
  }, [isOpen, patientId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (question) => {
    const q = question || input.trim();
    if (!q || loading) return;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: q }]);
    setLoading(true);
    try {
      const result = await getGroqChatbotReply(patientId, q);
      setMessages(prev => [...prev, {
        role: 'bot',
        text: result.answer || 'Sorry, I could not find an answer.',
        source: result.source,
        confidence: result.confidence,
      }]);
    } catch {
      setMessages(prev => [...prev, { role: 'bot', text: 'Something went wrong. Please try again.' }]);
    }
    setLoading(false);
  };

  return (
    <>
      {/* Floating Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          position: 'fixed', bottom: '28px', right: '28px', zIndex: 1000,
          width: '60px', height: '60px', borderRadius: '50%',
          background: 'linear-gradient(135deg, #0d9488, #0f766e)',
          border: 'none', cursor: 'pointer', boxShadow: '0 6px 24px rgba(13,148,136,.45)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'transform .2s', color: '#fff', fontSize: '26px',
        }}
        onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.1)'}
        onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
        id="chatbot-toggle"
      >
        {isOpen ? '✕' : '💬'}
      </button>

      {/* Chat Panel */}
      {isOpen && (
        <div style={{
          position: 'fixed', bottom: '100px', right: '24px', zIndex: 999,
          width: '380px', maxHeight: '520px', borderRadius: '18px',
          background: 'rgba(15,23,42,.92)', backdropFilter: 'blur(20px)',
          border: '1px solid rgba(13,148,136,.3)', boxShadow: '0 12px 48px rgba(0,0,0,.5)',
          display: 'flex', flexDirection: 'column', overflow: 'hidden',
          animation: 'slideUp .3s ease-out',
        }}>
          {/* Header */}
          <div style={{
            padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,.08)',
            background: 'linear-gradient(135deg, rgba(13,148,136,.2), rgba(15,23,42,.4))',
          }}>
            <div style={{ fontSize: '15px', fontWeight: 600, color: '#e2e8f0', letterSpacing: '.02em' }}>
              🤖 SwasthaLink Assistant
            </div>
            <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>
              Responses based on your approved medical records only
            </div>
          </div>

          {/* Messages */}
          <div style={{
            flex: 1, overflowY: 'auto', padding: '14px 16px',
            display: 'flex', flexDirection: 'column', gap: '10px',
            maxHeight: '300px',
          }}>
            {messages.map((msg, i) => (
              <div key={i} style={{
                alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
                maxWidth: '85%', padding: '10px 14px', borderRadius: '14px',
                fontSize: '13px', lineHeight: 1.5,
                background: msg.role === 'user'
                  ? 'linear-gradient(135deg, #0d9488, #0f766e)'
                  : 'rgba(255,255,255,.07)',
                color: msg.role === 'user' ? '#fff' : '#e2e8f0',
                border: msg.role === 'user' ? 'none' : '1px solid rgba(255,255,255,.06)',
              }}>
                {msg.text}
                {msg.source && msg.source !== 'none' && (
                  <div style={{ fontSize: '10px', color: '#94a3b8', marginTop: '4px' }}>
                    Source: {msg.source}
                  </div>
                )}
              </div>
            ))}
            {loading && (
              <div style={{
                alignSelf: 'flex-start', padding: '10px 14px', borderRadius: '14px',
                background: 'rgba(255,255,255,.07)', color: '#94a3b8', fontSize: '13px',
              }}>
                Searching your records...
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* FAQ Suggestions */}
          {faqs.length > 0 && messages.length <= 2 && (
            <div style={{
              padding: '8px 14px', borderTop: '1px solid rgba(255,255,255,.06)',
              display: 'flex', flexWrap: 'wrap', gap: '6px',
            }}>
              {faqs.slice(0, 3).map((faq, i) => (
                <button key={i} onClick={() => handleSend(faq.question)} style={{
                  padding: '4px 10px', borderRadius: '12px', fontSize: '11px',
                  background: 'rgba(13,148,136,.15)', color: '#5eead4',
                  border: '1px solid rgba(13,148,136,.25)', cursor: 'pointer',
                  transition: 'background .2s',
                }}>
                  {faq.question.length > 35 ? faq.question.slice(0, 35) + '...' : faq.question}
                </button>
              ))}
            </div>
          )}

          {/* Input */}
          <div style={{
            padding: '12px 14px', borderTop: '1px solid rgba(255,255,255,.08)',
            display: 'flex', gap: '8px',
          }}>
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSend()}
              placeholder="Ask about your medications..."
              style={{
                flex: 1, padding: '10px 14px', borderRadius: '12px',
                background: 'rgba(255,255,255,.06)', border: '1px solid rgba(255,255,255,.1)',
                color: '#e2e8f0', fontSize: '13px', outline: 'none',
              }}
              id="chatbot-input"
            />
            <button onClick={() => handleSend()} disabled={loading} style={{
              padding: '8px 16px', borderRadius: '12px',
              background: loading ? 'rgba(255,255,255,.05)' : 'linear-gradient(135deg, #0d9488, #0f766e)',
              border: 'none', color: '#fff', cursor: loading ? 'not-allowed' : 'pointer',
              fontSize: '14px', fontWeight: 600,
            }} id="chatbot-send">
              ➤
            </button>
          </div>
        </div>
      )}

      <style>{`
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </>
  );
};

export default ChatbotPanel;
