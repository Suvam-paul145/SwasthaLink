# SwasthaLink — Remaining Features Roadmap

> **Generated:** April 7, 2026  
> **Branch:** `testing` · **Codebase Completeness:** ~85%  
> **Stack:** FastAPI · Cerebras/Groq/Qwen LLM · React 18 + Vite 5 · Supabase · Twilio · AWS S3  
> **Goal:** Techfest-winning demo with maximum impact in the Advanced Healthcare domain

---

## Quick Status Summary

### Already Implemented (Do NOT Rebuild)

| Feature | Status |
|---------|--------|
| Discharge simplification (Cerebras/Groq/Qwen LLM chain) | ✅ Done |
| Bilingual English + Bengali output | ✅ Done |
| MCQ quiz + adaptive re-explanation | ✅ Done |
| OCR upload (PDF/JPG/PNG via Gemini + LlamaCloud + OpenCV) | ✅ Done |
| WhatsApp delivery via Twilio + Day 3/7 follow-ups | ✅ Done |
| Prescription RAG pipeline (extract + approve/reject) | ✅ Done |
| Role-aware simplification (patient/caregiver/elderly) | ✅ Done |
| Risk scoring (0-100 scale) + RiskGauge component | ✅ Done |
| Drug interaction checker | ✅ Done |
| Chatbot/AI assistant (grounded to patient context) | ✅ Done |
| Family dashboard (prescriptions, discharge history, PID linking) | ✅ Done |
| Doctor dashboard (upload, extraction queue, daily summary) | ✅ Done |
| Admin panel (prescription approval, audit trail) | ✅ Done |
| Authentication (login/signup/OTP/password reset/JWT) | ✅ Done |
| Share links (token-based public access, expiring) | ✅ Done |
| Patient data chunking + FAQ suggestions | ✅ Done |
| 3D visualizations (heart, DNA helix, medical cube) | ✅ Done |
| Chart.js analytics (vitals, risk, comprehension, doughnut) | ✅ Done |
| S3 file storage with presigned URLs | ✅ Done |
| Rate limiting + rate alerts | ✅ Done |
| CI/CD (GitHub Actions: lint, test, build, deploy) | ✅ Done |
| Docker support (frontend + backend) | ✅ Done |
| Render + Vercel deployment | ✅ Done |
| CORS hardening (EXTRA_CORS_ORIGINS + FRONTEND_URL) | ✅ Done |
| Session history + analytics endpoint | ✅ Done |

### Not Yet Implemented

| Feature | Impact | Effort | Priority |
|---------|--------|--------|----------|
| Bengali Text-to-Speech (read-aloud) | 🔥 Very High | 2-3 hrs | P0 |
| Camera capture (snap discharge paper) | 🔥 Very High | 3-4 hrs | P0 |
| QR code sharing for caregivers | 🔴 High | 2 hrs | P1 |
| PWA offline support | 🔴 High | 2-3 hrs | P1 |
| Multi-language expansion (Hindi, Tamil, Telugu) | 🔴 High | 1-2 hrs | P1 |
| Supabase Realtime doctor notifications | 🟡 Medium | 2-3 hrs | P2 |
| Emergency medical QR card (printable) | 🟡 Medium | 1-2 hrs | P2 |
| Speech-to-Text input | 🟡 Medium | 2 hrs | P2 |
| Mobile responsiveness (3D lazy-load) | 🟡 Medium | 2-3 hrs | P2 |
| Loading state polish (step-by-step messages) | 🟢 Low | 1 hr | P3 |

---

## P0 — Demo Killers (Build These First)

> These are the features the Claude chat specifically identified as **highest effort-to-wow ratio** for winning the techfest. Without these, the demo story is incomplete.

---

### Feature 1: Bengali Text-to-Speech Read-Aloud

**Why this wins:** "A patient who can't read doesn't care about your teal UI — but if you press a button and the phone speaks their instructions in conversational Bengali, you've solved the actual problem." The speaker buttons already exist in the UI but do nothing.

**Impact:** Completes the core narrative loop — illiterate patient presses one button, hears their discharge instructions in Bengali.

**Files to modify:**
- `src/pages/ClarityHubPage.jsx` — Wire the existing speaker button
- `src/pages/DetailedClarityHubPage.jsx` — Wire the existing speaker button
- `src/components/ChatbotPanel.jsx` — Add TTS to chatbot responses (optional)
- New: `src/utils/tts.js` — Shared TTS utility

**Implementation:**

1. Create `src/utils/tts.js`:
```javascript
const LANG_TAGS = {
  en: 'en-IN',
  bn: 'bn-IN',
  hi: 'hi-IN',
  ta: 'ta-IN',
  te: 'te-IN',
  mr: 'mr-IN',
};

let currentUtterance = null;

export function speak(text, language = 'bn') {
  stop(); // cancel any in-progress speech
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = LANG_TAGS[language] || 'en-IN';
  utterance.rate = 0.9;
  utterance.pitch = 1.0;
  currentUtterance = utterance;
  window.speechSynthesis.speak(utterance);
  return utterance; // caller can attach onend/onerror
}

export function stop() {
  window.speechSynthesis.cancel();
  currentUtterance = null;
}

export function isSpeaking() {
  return window.speechSynthesis.speaking;
}
```

2. In `ClarityHubPage.jsx` and `DetailedClarityHubPage.jsx`, import and wire:
```javascript
import { speak, stop, isSpeaking } from '../utils/tts';

// On speaker button click:
const handleSpeak = () => {
  if (isSpeaking()) {
    stop();
  } else {
    // Use Bengali text from the processed result
    const bengaliText = result?.simplified_bengali || result?.simplified_text || '';
    speak(bengaliText, 'bn');
  }
};
```

3. Add visual feedback — toggle the speaker icon to a stop icon while speaking.

**Pass test:**
- Process a discharge summary with Bengali output
- Click speaker button → Bengali text is read aloud
- Click again → speech stops
- Works on Chrome Android with `lang='bn-IN'`

**Estimated effort:** 2 hours

---

### Feature 2: Camera Capture (Snap Discharge Paper)

**Why this wins:** "Your entire demo becomes: 'I point my phone at this hospital discharge paper, and in 10 seconds it speaks the instructions back in Bengali.' That's a jaw-dropper." Currently, the OCR flow requires file upload — no camera access.

**Impact:** Transforms the demo from "paste text" to "point phone at paper". Judges won't type a long summary.

**Files to modify:**
- New: `src/components/CameraCapture.jsx` — Camera component with capture
- `src/pages/ClarityHubPage.jsx` — Add camera trigger button alongside file upload
- `src/services/api.js` — Ensure FormData upload works (already supported)

**Implementation:**

1. Create `src/components/CameraCapture.jsx`:
```jsx
import { useRef, useState, useCallback } from 'react';

export default function CameraCapture({ onCapture, onClose }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [stream, setStream] = useState(null);
  const [captured, setCaptured] = useState(null);

  const startCamera = useCallback(async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } }
      });
      videoRef.current.srcObject = mediaStream;
      setStream(mediaStream);
    } catch (err) {
      console.error('Camera access denied:', err);
    }
  }, []);

  const capture = () => {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d').drawImage(video, 0, 0);
    canvas.toBlob((blob) => {
      setCaptured(blob);
      // Stop camera after capture
      stream?.getTracks().forEach(t => t.stop());
    }, 'image/jpeg', 0.92);
  };

  const confirm = () => {
    if (captured) onCapture(captured);
  };

  const retake = () => {
    setCaptured(null);
    startCamera();
  };

  // Auto-start camera on mount
  useState(() => { startCamera(); }, []);

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col">
      {!captured ? (
        <>
          <video ref={videoRef} autoPlay playsInline className="flex-1 object-cover" />
          <div className="p-4 flex justify-center gap-4">
            <button onClick={capture} className="w-16 h-16 rounded-full bg-white border-4 border-gray-300" />
            <button onClick={onClose} className="px-4 py-2 text-white">Cancel</button>
          </div>
        </>
      ) : (
        <>
          <canvas ref={canvasRef} className="flex-1 object-contain" />
          <div className="p-4 flex justify-center gap-4">
            <button onClick={retake} className="px-6 py-2 bg-gray-700 text-white rounded-lg">Retake</button>
            <button onClick={confirm} className="px-6 py-2 bg-primary text-white rounded-lg">Use Photo</button>
            <button onClick={onClose} className="px-4 py-2 text-white">Cancel</button>
          </div>
        </>
      )}
    </div>
  );
}
```

2. In `ClarityHubPage.jsx`, add camera button and handler:
```jsx
import CameraCapture from '../components/CameraCapture';

const [showCamera, setShowCamera] = useState(false);

const handleCameraCapture = async (blob) => {
  setShowCamera(false);
  const formData = new FormData();
  formData.append('file', blob, 'discharge_capture.jpg');
  // Call the existing /api/upload OCR endpoint
  const ocrResult = await api.uploadFile(formData);
  if (ocrResult?.extracted_text) {
    setDischargeText(ocrResult.extracted_text);
  }
};

// In JSX, add a camera button next to the file upload:
<button onClick={() => setShowCamera(true)} className="...">
  📷 Scan Document
</button>

{showCamera && (
  <CameraCapture
    onCapture={handleCameraCapture}
    onClose={() => setShowCamera(false)}
  />
)}
```

3. The backend `/api/upload` endpoint already handles image OCR — no backend changes needed.

**Pass test:**
- Click "Scan Document" → camera opens (rear-facing)
- Point at a discharge paper → tap capture → preview shows
- Tap "Use Photo" → OCR extracts text into the input field
- Works on Chrome Android

**Estimated effort:** 3 hours

---

## P1 — High-Value Demo Features

> These complete the competitive story. Build after P0.

---

### Feature 3: QR Code Sharing for Caregivers

**Why this wins:** "The family caregiver dashboard with a QR-shareable link makes judges say 'this could actually be deployed.' It shows you've thought beyond the individual patient to the caregiving ecosystem."

**Current state:** Share tokens and `/api/share/{token}` already exist in the backend. Frontend family dashboard exists. The ONLY missing piece is QR code generation.

**Files to modify:**
- `package.json` — Add `qrcode.react` dependency
- New: `src/components/ShareQRModal.jsx` — QR modal component
- `src/pages/FamilyDashboardPage.jsx` — Add "Share with family" button

**Implementation:**

1. Install: `npm install qrcode.react`

2. Create `src/components/ShareQRModal.jsx`:
```jsx
import { QRCodeSVG } from 'qrcode.react';

export default function ShareQRModal({ shareUrl, onClose }) {
  const copyLink = () => {
    navigator.clipboard.writeText(shareUrl);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
      <div className="bg-surface rounded-2xl p-6 max-w-sm w-full text-center">
        <h3 className="text-lg font-semibold mb-4">Share with Family</h3>
        <div className="bg-white p-4 rounded-xl inline-block mb-4">
          <QRCodeSVG value={shareUrl} size={200} />
        </div>
        <p className="text-sm text-muted mb-4">
          Scan this QR code or share the link — no login required
        </p>
        <div className="flex gap-2">
          <button onClick={copyLink} className="flex-1 px-4 py-2 bg-primary text-white rounded-lg">
            Copy Link
          </button>
          <button onClick={onClose} className="flex-1 px-4 py-2 bg-gray-700 text-white rounded-lg">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
```

3. In the appropriate page (after discharge processing), show the "Share with family" button and render the QR modal using the existing share token from the API response.

**Pass test:**
- Process a discharge → "Share with family" button appears
- Click → QR code renders with the share URL
- Scan QR on another phone → caregiver view loads with medication info (no login)
- "Copy Link" copies to clipboard

**Estimated effort:** 2 hours

---

### Feature 4: PWA Offline Support

**Why this wins:** Installable on Android home screens. Patients in low-connectivity rural areas can still read their last simplified summary offline. Massive narrative payoff for the "Advanced Healthcare" domain.

**Files to modify:**
- `vite.config.js` — Add VitePWA plugin
- New: `public/icon-192.png`, `public/icon-512.png` — App icons
- `src/main.jsx` or new hook — Install prompt + offline caching

**Implementation:**

1. Install: `npm install -D vite-plugin-pwa`

2. Update `vite.config.js`:
```javascript
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
      },
      manifest: {
        name: 'SwasthaLink',
        short_name: 'SwasthaLink',
        description: 'Discharge summary simplified in your language',
        theme_color: '#0a0e1a',
        background_color: '#0a0e1a',
        display: 'standalone',
        start_url: '/',
        icons: [
          { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
        ],
      },
    }),
  ],
});
```

3. Cache last processed result in `localStorage` after every successful `/api/process` call. Show offline banner when loaded from cache.

4. Add an "Install App" button using the `beforeinstallprompt` event.

**Pass test:**
- Chrome Android → "Add to Home Screen" prompt appears
- Process a discharge → turn off WiFi → open installed app → last summary visible with offline banner
- Lighthouse PWA score >= 90

**Estimated effort:** 2-3 hours

---

### Feature 5: Multi-Language Expansion (Hindi, Tamil, Telugu, Marathi)

**Why this wins:** Extends from Bengali to 5+ Indian languages with minimal effort. The LLM prompt already supports bilingual output — this is mostly a frontend dropdown + prompt parameter change.

**Files to modify:**
- `src/pages/ClarityHubPage.jsx` — Replace language toggle with dropdown
- `backend/ai/prompts.py` — Add language name mapping
- `src/utils/tts.js` — Already supports language tags (from Feature 1)

**Implementation:**

1. Add to `backend/ai/prompts.py`:
```python
LANGUAGE_NAMES = {
    "en": "English",
    "bn": "Bengali",
    "hi": "Hindi",
    "ta": "Tamil",
    "te": "Telugu",
    "mr": "Marathi",
}
```
Update the simplification prompt to use `LANGUAGE_NAMES.get(language, "Bengali")`.

2. In `ClarityHubPage.jsx`, replace the binary language toggle with a `<select>`:
```jsx
<select value={language} onChange={e => setLanguage(e.target.value)}>
  <option value="en">English only</option>
  <option value="bn">English + Bengali</option>
  <option value="hi">English + Hindi</option>
  <option value="ta">English + Tamil</option>
  <option value="te">English + Telugu</option>
  <option value="mr">English + Marathi</option>
</select>
```

3. TTS language mapping already handled in `src/utils/tts.js` from Feature 1.

**Pass test:**
- Select Hindi → output appears in Hindi alongside English
- TTS reads in Hindi (`hi-IN` voice)
- API rejects unsupported language codes with 422

**Estimated effort:** 1-2 hours

---

## P2 — Differentiation Features

> These separate you from competitors. Build if time allows.

---

### Feature 6: Supabase Realtime Doctor Notifications

**Why this wins:** Live bell icon on doctor dashboard — when a patient fails a quiz, doctor gets notified in real-time without refreshing. Shows you understand the caregiving feedback loop.

**Files to modify:**
- `src/components/AppShell.jsx` — Add notification bell to doctor nav
- New: `src/components/NotificationBell.jsx` — Bell with real-time badge
- `src/services/supabase.js` — Supabase Realtime client

**Implementation:**
- Use `@supabase/supabase-js` Realtime channel subscribed to `postgres_changes` on `discharge_results` table filtered by `doctor_id`.
- Show red badge count on bell icon; dropdown lists patients needing follow-up.
- Enable Realtime in Supabase dashboard for the table.

**Pass test:** Patient fails quiz in one tab → doctor bell increments in another tab within 3 seconds.

**Estimated effort:** 2-3 hours

---

### Feature 7: Emergency Medical QR Card (Printable)

**Why this wins:** Demo showstopper. A printable credit-card-sized emergency card with QR encoding blood type, allergies, current medications, emergency contact. Scannable by a paramedic.

**Files to modify:**
- New: `src/components/EmergencyQRCard.jsx`
- Patient portal page — Add "Generate Emergency Card" button

**Implementation:**
- Encode patient data as JSON in a QR code.
- Printable card layout (300px wide, bordered, medical cross icon).
- "Print Card" button opens browser print dialog.
- Uses `qrcode.react` (already installed from Feature 3).

**Pass test:** Generate card → print → scan QR on phone → JSON data readable.

**Estimated effort:** 1-2 hours

---

### Feature 8: Speech-to-Text Input

**Why this wins:** Patients or doctors can dictate discharge summaries instead of typing. Critical for illiterate patients asking the chatbot questions.

**Files to modify:**
- New: `src/utils/stt.js` — Shared STT utility
- `src/pages/ClarityHubPage.jsx` — Wire mic button
- `src/components/ChatbotPanel.jsx` — Wire mic button for voice queries

**Implementation:**
```javascript
// src/utils/stt.js
export function startListening(onResult, language = 'bn-IN') {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) return null;
  const recognition = new SpeechRecognition();
  recognition.lang = language;
  recognition.continuous = false;
  recognition.interimResults = false;
  recognition.onresult = (event) => {
    onResult(event.results[0][0].transcript);
  };
  recognition.start();
  return recognition;
}
```

**Pass test:** Tap mic → speak → text appears in input field. Works in Bengali and English.

**Estimated effort:** 2 hours

---

### Feature 9: Mobile Responsiveness (3D Lazy-Load)

**Why this wins:** Three.js heart + DNA helix crash low-end Android phones. Lazy-loading them on capable devices only prevents demo embarrassment.

**Files to modify:**
- `src/components/MedicalHeart3D.jsx` — Wrap in lazy check
- `src/components/DNA3DHelix.jsx` — Wrap in lazy check
- `src/components/FloatingMedicalCube.jsx` — Wrap in lazy check

**Implementation:**
```javascript
// At the top of each 3D component:
const isMobile = window.innerWidth < 768;
const isLowEnd = navigator.hardwareConcurrency < 4;
if (isMobile || isLowEnd) return <FallbackStaticImage />;
```

Also use `React.lazy()` + `Suspense` for code-splitting the Three.js bundle.

**Pass test:** Open on 4-year-old Android phone → no crash, static fallback shown. Desktop → full 3D renders.

**Estimated effort:** 2-3 hours

---

## P3 — Polish

> Only if all above are done.

---

### Feature 10: Loading State Polish (Step-by-Step Messages)

**Why this wins:** Prevents judges from thinking the app is stuck during the 5-10s LLM processing time.

**Implementation:** Cycle through animated messages:
- 0–2s: "Reading discharge summary..."
- 2–5s: "Extracting medications..."
- 5–8s: "Simplifying into Bengali..."
- 8s+: "Generating comprehension quiz..."

**Estimated effort:** 1 hour

---

## Recommended Build Order (For Techfest)

```
┌─────────────────────────────────────────────────────────────┐
│  DAY 1 — Core Demo Flow (P0)                               │
│                                                             │
│  1. Bengali TTS Read-Aloud .............. 2 hrs   [Feature 1] │
│  2. Camera Capture (snap paper) ......... 3 hrs   [Feature 2] │
│  3. Multi-language dropdown ............. 1 hr    [Feature 5] │
│                                                             │
│  Total: ~6 hours                                            │
│  Demo story: "Point phone at paper → hear it in Bengali"    │
├─────────────────────────────────────────────────────────────┤
│  DAY 2 — Ecosystem & Polish (P1 + P2)                      │
│                                                             │
│  4. QR Code Sharing .................... 2 hrs   [Feature 3] │
│  5. PWA Offline Support ................ 2 hrs   [Feature 4] │
│  6. Emergency QR Card .................. 1 hr    [Feature 7] │
│  7. Speech-to-Text Input ............... 2 hrs   [Feature 8] │
│                                                             │
│  Total: ~7 hours                                            │
│  Demo story: "Works offline, shareable, full voice loop"    │
├─────────────────────────────────────────────────────────────┤
│  DAY 3 — Differentiation & Hardening (P2 + P3)             │
│                                                             │
│  8. Mobile Responsiveness .............. 2 hrs   [Feature 9] │
│  9. Real-time Doctor Notifications ..... 2 hrs   [Feature 6] │
│ 10. Loading State Polish ............... 1 hr    [Feature 10]│
│                                                             │
│  Total: ~5 hours                                            │
│  Demo story: "Real-time care loop, production-grade"        │
└─────────────────────────────────────────────────────────────┘

Total remaining effort: ~18-20 hours across 10 features
```

---

## Demo Script (After All Features)

> This is the narrative arc that wins:

1. **"A patient is discharged from the hospital."** → Show a printed discharge paper
2. **"They can't read English medical jargon."** → Point phone camera at the paper (Feature 2)
3. **"In 10 seconds, it speaks their instructions in Bengali."** → OCR → Simplify → TTS (Features 1, 5)
4. **"They take a quick quiz to confirm they understood."** → Quiz appears, patient answers
5. **"They fail the medication section."** → Score < 2/3
6. **"The AI automatically re-explains just that section in simpler words."** → Re-explanation triggers
7. **"They pass the retry."** → Score 3/3
8. **"Their family gets a QR code to track their care."** → QR share (Feature 3)
9. **"The doctor sees a real-time alert when comprehension is low."** → Bell notification (Feature 6)
10. **"It works offline on a ₹5000 phone."** → PWA (Feature 4)
11. **"Zero patient data stored. Zero-PHI architecture."** → Pitch this to judges explicitly

---

## Key Pitch Points for Judges

- **"Zero-PHI architecture"** — Discharge text never hits disk. Process and discard.
- **"Works on ₹5000 phones offline"** — PWA + lazy-loaded 3D + cached results
- **"10-second paper-to-voice pipeline"** — Camera → OCR → LLM → Bengali TTS
- **"Caregiving ecosystem, not just an app"** — QR sharing, doctor alerts, family dashboard
- **"4-language support"** — Bengali, Hindi, Tamil, Telugu (one dropdown change)
- **"Complete comprehension loop"** — Read → Quiz → Fail → Re-explain → Pass

---

*SwasthaLink v2.0 Roadmap · Generated for techfest preparation*
