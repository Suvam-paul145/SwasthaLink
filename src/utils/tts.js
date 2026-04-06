/**
 * Text-to-Speech utility for SwasthaLink
 * Supports Bengali, Hindi, Tamil, Telugu, Marathi, and English
 */

const LANG_TAGS = {
  en: 'en-IN',
  bn: 'bn-IN',
  hi: 'hi-IN',
  ta: 'ta-IN',
  te: 'te-IN',
  mr: 'mr-IN',
};

let currentUtterance = null;

/**
 * Speak text in the specified language.
 * @param {string} text - Text to speak
 * @param {string} language - Language code ('bn', 'en', 'hi', etc.)
 * @param {function} onEnd - Callback when speech finishes
 * @returns {SpeechSynthesisUtterance|null}
 */
export function speak(text, language = 'bn', onEnd = null) {
  if (!text || !window.speechSynthesis) return null;
  stop();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = LANG_TAGS[language] || 'en-IN';
  utterance.rate = 0.9;
  utterance.pitch = 1.0;
  if (onEnd) utterance.onend = onEnd;
  utterance.onerror = () => { currentUtterance = null; };
  currentUtterance = utterance;
  window.speechSynthesis.speak(utterance);
  return utterance;
}

/**
 * Stop any in-progress speech.
 */
export function stop() {
  window.speechSynthesis.cancel();
  currentUtterance = null;
}

/**
 * Check if speech is currently playing.
 * @returns {boolean}
 */
export function isSpeaking() {
  return window.speechSynthesis.speaking;
}

/**
 * Check if TTS is supported in this browser.
 * @returns {boolean}
 */
export function isTTSSupported() {
  return 'speechSynthesis' in window;
}
