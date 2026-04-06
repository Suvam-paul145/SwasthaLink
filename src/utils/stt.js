/**
 * Speech-to-Text utility for SwasthaLink
 * Uses the Web Speech API (SpeechRecognition)
 */

const LANG_TAGS = {
  en: 'en-IN',
  bn: 'bn-IN',
  hi: 'hi-IN',
  ta: 'ta-IN',
  te: 'te-IN',
  mr: 'mr-IN',
};

/**
 * Start listening for speech and return the transcript.
 * @param {function} onResult - Callback with transcribed text
 * @param {string} language - Language code ('bn', 'en', etc.)
 * @param {function} onEnd - Callback when recognition ends
 * @returns {SpeechRecognition|null} Recognition instance (call .stop() to cancel)
 */
export function startListening(onResult, language = 'bn', onEnd = null) {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) return null;

  const recognition = new SpeechRecognition();
  recognition.lang = LANG_TAGS[language] || 'bn-IN';
  recognition.continuous = false;
  recognition.interimResults = false;

  recognition.onresult = (event) => {
    const transcript = event.results[0][0].transcript;
    if (onResult) onResult(transcript);
  };

  recognition.onerror = () => {
    if (onEnd) onEnd();
  };

  recognition.onend = () => {
    if (onEnd) onEnd();
  };

  recognition.start();
  return recognition;
}

/**
 * Check if STT is supported in this browser.
 * @returns {boolean}
 */
export function isSTTSupported() {
  return !!(window.SpeechRecognition || window.webkitSpeechRecognition);
}
