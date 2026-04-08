import api from './api';

/**
 * Ask the backend Groq-backed patient chatbot and return the full response.
 * The Groq API key stays on the server.
 */
export async function getGroqChatbotReply(patientId, question, context) {
  if (!patientId) {
    throw new Error('Patient ID is required for patient chat');
  }

  return api.askChatbot(patientId, question, context);
}

/**
 * Convenience helper when only the answer text is needed.
 */
export async function getGroqChatbotAnswer(patientId, question, context) {
  const result = await getGroqChatbotReply(patientId, question, context);
  return result?.answer || 'Sorry, I could not find an answer.';
}
