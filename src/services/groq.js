// src/services/groq.js
// Service to call Groq API for patient-specific RAG chatbot answers

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';

// Get Groq API key from environment variable (Vite style)
const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY;

/**
 * Query Groq LLM for a patient-specific answer based on prescription context.
 * @param {string} question - The patient's question
 * @param {string} prescriptionContext - The prescription summary/context
 * @returns {Promise<string>} - The LLM's answer
 */
export async function getGroqChatbotAnswer(question, prescriptionContext) {
  if (!GROQ_API_KEY) throw new Error('Groq API key not set');

  const systemPrompt = `You are a helpful medical assistant. Answer the patient's question based ONLY on the following prescription context. If the answer is not present, say you don't know.\n\nPrescription context:\n${prescriptionContext}`;

  const body = {
    model: 'mixtral-8x7b-32768',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: question }
    ],
    max_tokens: 512,
    temperature: 0.2
  };

  const response = await fetch(GROQ_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${GROQ_API_KEY}`
    },
    body: JSON.stringify(body)
  });

  if (!response.ok) throw new Error('Groq API error');
  const data = await response.json();
  return data.choices?.[0]?.message?.content || 'Sorry, I could not find an answer.';
}
