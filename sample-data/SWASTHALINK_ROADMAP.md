# SwasthaLink — Remaining Build Roadmap

> **Project:** SwasthaLink · **Branch:** `testing` · **Stack:** FastAPI + Gemini 2.5 Flash + React/Vite/TS + Supabase + Twilio  
> **Team size:** 3 members · **Goal:** Production-ready, competition-winning build  
> **Author:** ownworldmade / Suvam Paul

---

## Team Assignment Overview

| Member | Ownership | Priority |
|--------|-----------|----------|
| **Member A** | AI pipeline wiring + backend endpoints | Critical path |
| **Member B** | Frontend features + UI polish | Critical path |
| **Member C** | Notifications + analytics + PWA | High value |

> Every task has a **pass test** — the feature is done only when the pass test succeeds end-to-end.

---

---

# MEMBER A — AI Pipeline + Backend

> **Files you'll mainly work in:** `backend/main.py`, `backend/gemini_service.py`, `backend/prompts.py`, `backend/models.py`, `backend/supabase_service.py`

---

## Task A-1 · Wire AI pipeline to patient records

**Status:** ❌ Not done  
**Priority:** 🔴 Critical — everything depends on this

### What to build
When a doctor submits a discharge summary for a specific patient, the Gemini simplification output must be saved against that patient's record in Supabase and be retrievable in the patient portal.

### Steps

1. Add a `patient_id` field to the `ProcessRequest` Pydantic model in `models.py`:
   ```python
   class ProcessRequest(BaseModel):
       discharge_text: str
       role: str
       language: str
       patient_id: str        # add this
       doctor_id: str         # add this
       re_explain: bool = False
   ```

2. In `supabase_service.py`, add a new function `save_discharge_result()`:
   ```python
   async def save_discharge_result(session_id, patient_id, doctor_id, quiz_questions, medications, follow_up, warning_signs, risk_score):
       supabase.table("discharge_results").insert({
           "session_id": session_id,
           "patient_id": patient_id,
           "doctor_id": doctor_id,
           "quiz_questions": quiz_questions,   # JSON array
           "medications": medications,          # JSON array
           "follow_up": follow_up,             # JSON object
           "warning_signs": warning_signs,     # JSON array
           "risk_score": risk_score,           # int 0-100
           "created_at": datetime.utcnow().isoformat()
       }).execute()
   ```

3. Create `discharge_results` table in Supabase SQL editor:
   ```sql
   CREATE TABLE discharge_results (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     session_id UUID REFERENCES sessions(id),
     patient_id TEXT NOT NULL,
     doctor_id TEXT NOT NULL,
     quiz_questions JSONB,
     medications JSONB,
     follow_up JSONB,
     warning_signs JSONB,
     risk_score INTEGER,
     created_at TIMESTAMPTZ DEFAULT NOW()
   );
   ```

4. In `main.py` `/api/process` endpoint, call `save_discharge_result()` after Gemini responds.

5. Add `GET /api/patient/{patient_id}/history` endpoint that returns all discharge results for a patient ordered by `created_at DESC`.

### Pass test
- Doctor submits a discharge summary for patient ID `P001`
- Check Supabase `discharge_results` table → row exists with correct `patient_id`
- Hit `GET /api/patient/P001/history` → returns the saved result

---

## Task A-2 · Readmission risk score

**Status:** ❌ Not done  
**Priority:** 🔴 Critical (high demo impact, pure Python, 30 mins)

### What to build
A 0–100 readmission risk score computed from quiz score, medication count, and role. Added to the `/api/process` response — no ML model needed.

### Steps

1. Add this function to `gemini_service.py` (or a new `risk_service.py`):
   ```python
   def compute_risk_score(quiz_score: int, medication_count: int, role: str, warning_count: int) -> int:
       base = (3 - quiz_score) * 20          # 0, 20, 40, or 60
       med_factor = min(medication_count * 4, 24)  # max 24 pts
       warn_factor = min(warning_count * 3, 12)    # max 12 pts
       role_factor = 4 if role == "elderly" else 0
       return min(base + med_factor + warn_factor + role_factor, 100)
   ```

2. Call this in `/api/process` after Gemini returns `medications` and `warning_signs`.

3. Add `risk_score: int` to the `ProcessResponse` Pydantic model in `models.py`.

4. Add `risk_level: str` computed from risk_score:
   ```python
   risk_level = "low" if risk_score < 35 else "moderate" if risk_score < 65 else "high"
   ```

5. Return both `risk_score` and `risk_level` in the API JSON response.

### Pass test
- Process any discharge summary
- API response JSON contains `"risk_score": <number>` and `"risk_level": "low"|"moderate"|"high"`
- Elderly role with 8 medications and 0/3 quiz → score must be >= 80

---

## Task A-3 · Drug interaction checker endpoint

**Status:** ❌ Not done  
**Priority:** 🟡 High

### What to build
A new endpoint that takes the `medications[]` array already returned by Gemini and checks for dangerous drug pairs.

### Steps

1. Add to `prompts.py`:
   ```python
   DRUG_INTERACTION_PROMPT = """
   You are a clinical pharmacist. Given this list of medications: {medications}
   Check all pairs for known drug interactions.
   Return ONLY a JSON array. Each object must have:
   - drug_a: string
   - drug_b: string  
   - severity: "mild" | "moderate" | "severe"
   - description: string (one plain sentence, no jargon)
   - action: string (what the patient should do)
   Return [] if no interactions found. No preamble, no markdown.
   """
   ```

2. Add to `main.py`:
   ```python
   @app.post("/api/drug-interactions")
   async def check_drug_interactions(medications: list[str]):
       prompt = DRUG_INTERACTION_PROMPT.format(medications=", ".join(medications))
       result = await gemini_service.generate(prompt)
       return {"interactions": json.loads(result)}
   ```

3. Call this endpoint automatically from frontend whenever `medications[]` has 2+ items after `/api/process` completes.

### Pass test
- Send `["Warfarin", "Aspirin", "Metformin"]` to `/api/drug-interactions`
- Response contains a `severe` interaction between Warfarin and Aspirin
- Empty array `[]` returned for `["Paracetamol"]` (no interactions)

---

## Task A-4 · Caregiver share token generation

**Status:** ❌ Not done  
**Priority:** 🟡 High

### What to build
After a discharge is processed, generate a short unique token. A public `GET /share/{token}` route returns the non-PHI session data for the caregiver dashboard.

### Steps

1. Install: `pip install shortuuid`

2. In `supabase_service.py`, add:
   ```python
   import shortuuid

   async def create_share_token(session_id: str, patient_id: str) -> str:
       token = shortuuid.uuid()[:8]
       supabase.table("share_tokens").insert({
           "token": token,
           "session_id": session_id,
           "patient_id": patient_id,
           "expires_at": (datetime.utcnow() + timedelta(days=30)).isoformat()
       }).execute()
       return token
   ```

3. Create Supabase table:
   ```sql
   CREATE TABLE share_tokens (
     token TEXT PRIMARY KEY,
     session_id UUID,
     patient_id TEXT,
     expires_at TIMESTAMPTZ
   );
   ```

4. Add to `main.py`:
   ```python
   @app.get("/api/share/{token}")
   async def get_share_data(token: str):
       row = supabase.table("share_tokens").select("*").eq("token", token).single().execute()
       if not row.data:
           raise HTTPException(404, "Token not found or expired")
       session = supabase.table("discharge_results") \
           .select("medications, follow_up, warning_signs, risk_score") \
           .eq("session_id", row.data["session_id"]).single().execute()
       return session.data
   ```

5. Return `share_token` in `/api/process` response.

### Pass test
- Process a discharge → response has `"share_token": "abc12345"`
- `GET /api/share/abc12345` returns `medications`, `follow_up`, `risk_score`
- `GET /api/share/invalidtoken` returns 404

---

## Task A-5 · Post-discharge WhatsApp check-in (Day 3 + Day 7)

**Status:** ❌ Not done  
**Priority:** 🟠 Medium

### What to build
Auto-schedule two WhatsApp follow-up messages to the patient 3 and 7 days after discharge.

### Steps

1. In Supabase, add columns to `sessions`: `phone_number TEXT`, `checkin_3_sent BOOL DEFAULT FALSE`, `checkin_7_sent BOOL DEFAULT FALSE`.

2. Add a `/api/checkin/schedule` endpoint:
   ```python
   @app.post("/api/checkin/schedule")
   async def schedule_checkin(session_id: str, phone: str, discharge_date: str):
       supabase.table("sessions").update({
           "phone_number": phone,
           "discharge_date": discharge_date
       }).eq("id", session_id).execute()
       return {"scheduled": True}
   ```

3. Add a `/api/checkin/run` endpoint (called by a cron job or UptimeRobot):
   ```python
   @app.get("/api/checkin/run")
   async def run_checkins():
       today = date.today()
       sessions = supabase.table("sessions").select("*") \
           .eq("checkin_3_sent", False).execute()
       for s in sessions.data:
           discharge = date.fromisoformat(s["discharge_date"])
           if (today - discharge).days >= 3:
               msg = "SwasthaLink: Namaste! How are you feeling? Are you taking your medicines on time? Reply YES or NO."
               await twilio_service.send_whatsapp(s["phone_number"], msg)
               supabase.table("sessions").update({"checkin_3_sent": True}).eq("id", s["id"]).execute()
       return {"checked": True}
   ```

4. Set UptimeRobot to also ping `GET /api/checkin/run` every 24 hours (add a second monitor).

### Pass test
- Schedule checkin for today minus 3 days → message sent on next `/api/checkin/run` call
- `checkin_3_sent` flips to `true` in Supabase

---

---

# MEMBER B — Frontend Features + UI Polish

> **Files you'll mainly work in:** `src/pages/`, `src/components/`, `src/services/api.js`

---

## Task B-1 · Connect AI output to patient portal

**Status:** ❌ Not done  
**Priority:** 🔴 Critical

### What to build
The simplified output, medication cards, and quiz must now be tied to a real patient record. When a doctor submits, the patient's portal must automatically show their simplified discharge.

### Steps

1. In the doctor's discharge submission form, add a patient search/select field that sends `patient_id` and `doctor_id` to `/api/process`.

2. In `api.js`, update `processDischarge()`:
   ```javascript
   export const processDischarge = async (text, role, language, patientId, doctorId) => {
     const res = await fetch(`${API_URL}/api/process`, {
       method: 'POST',
       headers: { 'Content-Type': 'application/json' },
       body: JSON.stringify({
         discharge_text: text,
         role,
         language,
         patient_id: patientId,
         doctor_id: doctorId
       })
     });
     return res.json();
   };
   ```

3. In the patient portal page, call `GET /api/patient/{patientId}/history` on mount and display the most recent discharge result.

4. Show a "No discharge summary yet" empty state with an info message if history is empty.

### Pass test
- Doctor submits for Patient ID `P001`
- Log into patient portal for `P001` → simplified summary visible
- Empty state shows for `P002` who has no discharge

---

## Task B-2 · Readmission risk gauge component

**Status:** ❌ Not done  
**Priority:** 🔴 Critical (10 min build, massive visual impact)

### What to build
An SVG gauge showing the `risk_score` (0–100) from the API response, with three coloured zones. Displayed on both the doctor view and patient portal.

### Steps

1. Create `src/components/RiskGauge.jsx`:
   ```jsx
   export default function RiskGauge({ score, level }) {
     const angle = (score / 100) * 180 - 90; // -90 to 90 degrees
     const color = level === 'low' ? '#34d399' : level === 'moderate' ? '#f59e0b' : '#ef4444';
     return (
       <div style={{ textAlign: 'center' }}>
         <svg viewBox="0 0 200 110" width="200">
           {/* Background arc segments */}
           <path d="M 20 100 A 80 80 0 0 1 100 20" stroke="#34d399" strokeWidth="12" fill="none"/>
           <path d="M 100 20 A 80 80 0 0 1 155 37" stroke="#f59e0b" strokeWidth="12" fill="none"/>
           <path d="M 155 37 A 80 80 0 0 1 180 100" stroke="#ef4444" strokeWidth="12" fill="none"/>
           {/* Needle */}
           <line
             x1="100" y1="100"
             x2={100 + 65 * Math.cos((angle - 90) * Math.PI / 180)}
             y2={100 + 65 * Math.sin((angle - 90) * Math.PI / 180)}
             stroke={color} strokeWidth="3" strokeLinecap="round"
           />
           <circle cx="100" cy="100" r="5" fill={color}/>
         </svg>
         <div style={{ fontSize: 24, fontWeight: 600, color }}>{score}</div>
         <div style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
           {level} readmission risk
         </div>
       </div>
     );
   }
   ```

2. Import and render `<RiskGauge score={result.risk_score} level={result.risk_level} />` on the output page below the medication cards.

3. Also show it on the doctor's patient list view next to each patient's name.

### Pass test
- Process any discharge → RiskGauge renders with correct colour (green/amber/red)
- Score 85 → red needle at the far right
- Score 15 → green needle at the far left

---

## Task B-3 · Drug interaction warning UI

**Status:** ❌ Not done  
**Priority:** 🟡 High

### What to build
After `/api/process` returns, auto-call `/api/drug-interactions` and show a warning banner above the medication cards if any severe or moderate interactions exist.

### Steps

1. In the output page, after setting the result state, add:
   ```javascript
   useEffect(() => {
     if (result?.medications?.length >= 2) {
       const names = result.medications.map(m => m.name);
       api.checkDrugInteractions(names).then(data => {
         setInteractions(data.interactions);
       });
     }
   }, [result]);
   ```

2. Add to `api.js`:
   ```javascript
   export const checkDrugInteractions = async (medications) => {
     const res = await fetch(`${API_URL}/api/drug-interactions`, {
       method: 'POST',
       headers: { 'Content-Type': 'application/json' },
       body: JSON.stringify({ medications })
     });
     return res.json();
   };
   ```

3. Create a `DrugWarningBanner` component:
   ```jsx
   export default function DrugWarningBanner({ interactions }) {
     const severe = interactions.filter(i => i.severity === 'severe');
     const moderate = interactions.filter(i => i.severity === 'moderate');
     if (!severe.length && !moderate.length) return null;
     return (
       <div style={{ border: '1px solid #ef4444', borderRadius: 8, padding: '12px 16px', marginBottom: 16 }}>
         <div style={{ fontWeight: 600, color: '#ef4444', marginBottom: 8 }}>
           Drug interaction warning
         </div>
         {[...severe, ...moderate].map((item, i) => (
           <div key={i} style={{ fontSize: 13, marginBottom: 6 }}>
             <span style={{ color: item.severity === 'severe' ? '#ef4444' : '#f59e0b', fontWeight: 500 }}>
               [{item.severity.toUpperCase()}]
             </span>{' '}
             {item.drug_a} + {item.drug_b} — {item.description}
           </div>
         ))}
       </div>
     );
   }
   ```

### Pass test
- Process a summary containing Warfarin + Aspirin → red warning banner appears above medication cards
- Process a summary with a single medication → banner does not render

---

## Task B-4 · Caregiver dashboard page

**Status:** ❌ Not done  
**Priority:** 🟡 High

### What to build
A public page at `/share/:token` that shows a patient's non-PHI discharge data — readable by a family member without any login.

### Steps

1. Add route in `App.jsx`:
   ```jsx
   <Route path="/share/:token" element={<CaregiverDashboardPage />} />
   ```

2. Create `src/pages/CaregiverDashboardPage.jsx`:
   - On mount, fetch `GET /api/share/:token`
   - Show: medication schedule (morning / evening / night chips), follow-up date, warning signs list, risk gauge
   - Add a large emergency contact button if `emergency_contact` is in session
   - Show "SwasthaLink — Caregiver View" header with Zero-PHI notice

3. In the main output page, after processing completes, show a "Share with family" button that:
   - Generates a QR code using `qrcode.react`
   - Copies the share link to clipboard
   - Shows the QR in a modal

4. Install: `npm install qrcode.react`

### Pass test
- Process a discharge → "Share with family" button appears
- Click → QR renders, link copied to clipboard
- Open link in private/incognito tab → caregiver dashboard loads with medication info, no login required

---

## Task B-5 · Quiz result → doctor alert UI

**Status:** ❌ Not done  
**Priority:** 🟡 High

### What to build
When a patient scores < 2/3 on the comprehension quiz, the doctor's dashboard must show a "Patient needs re-explanation" alert badge for that patient.

### Steps

1. In `supabase_service.py`, update `log_quiz_result()` to also update a `needs_followup` boolean in `discharge_results`:
   ```python
   if score < 2:
       supabase.table("discharge_results") \
           .update({"needs_followup": True}) \
           .eq("session_id", session_id).execute()
   ```

2. In the doctor's patient list, fetch `discharge_results` for each patient and check `needs_followup`.

3. Show a red badge "Needs re-explanation" next to any patient where `needs_followup === true`.

4. Clicking the badge navigates the doctor to that patient's session with the re-explain prompt pre-triggered.

5. When re-explanation is done and the patient scores ≥ 2/3, flip `needs_followup` back to `false`.

### Pass test
- Patient fails quiz (0/3) → doctor dashboard shows red badge on that patient card
- Patient retakes and passes → badge disappears after page refresh

---

## Task B-6 · Multi-language selector (Hindi, Tamil, Telugu)

**Status:** ❌ Not done  
**Priority:** 🟠 Medium

### What to build
Extend beyond Bengali to support Hindi, Tamil, and Telugu. Single dropdown change + one Gemini prompt param — this is a 1-hour task.

### Steps

1. In `ClarityHubPage.jsx`, replace the language toggle with a `<select>`:
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

2. In `prompts.py`, update the simplification prompt to use the language code:
   ```python
   LANGUAGE_NAMES = {
     "en": "English", "bn": "Bengali", "hi": "Hindi",
     "ta": "Tamil", "te": "Telugu", "mr": "Marathi"
   }
   # In the prompt: f"Translate into {LANGUAGE_NAMES[language]}"
   ```

3. Update `ProcessRequest` model to accept these new language codes with validation.

4. In TTS, map language codes to SpeechSynthesis voice tags:
   ```javascript
   const LANG_TAGS = { bn: 'bn-IN', hi: 'hi-IN', ta: 'ta-IN', te: 'te-IN', mr: 'mr-IN' };
   utterance.lang = LANG_TAGS[language] || 'en-IN';
   ```

### Pass test
- Select Hindi → simplified output appears in Hindi
- TTS button reads in Hindi (voice varies by browser/OS, confirm on Chrome Android)
- API rejects `language: "fr"` with a 422 validation error

---

---

# MEMBER C — Notifications + Analytics + PWA

> **Files you'll mainly work in:** `vite.config.js`, `src/pages/AdminPanelPage.jsx`, `backend/main.py`, Supabase dashboard

---

## Task C-1 · PWA offline support

**Status:** ❌ Not done  
**Priority:** 🔴 Critical (30 min, huge rural India narrative payoff)

### What to build
Make SwasthaLink installable on Android home screens and cacheable offline — so patients in low-connectivity areas can still read their last simplified summary.

### Steps

1. Install:
   ```bash
   npm install -D vite-plugin-pwa
   npm install workbox-window
   ```

2. Update `vite.config.js`:
   ```javascript
   import { VitePWA } from 'vite-plugin-pwa'

   export default defineConfig({
     plugins: [
       react(),
       VitePWA({
         registerType: 'autoUpdate',
         workbox: {
           globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
           runtimeCaching: [{
             urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
             handler: 'CacheFirst',
           }]
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
             { src: '/icon-512.png', sizes: '512x512', type: 'image/png' }
           ]
         }
       })
     ]
   })
   ```

3. Add two icon files: `public/icon-192.png` and `public/icon-512.png` (use any SwasthaLink logo at those sizes).

4. Cache the last processed result in `localStorage` after every successful `/api/process` call:
   ```javascript
   localStorage.setItem('swl_last_result', JSON.stringify(result));
   ```

5. On the output page mount, if `result` is empty and `localStorage` has a cached result, load it with an "Offline — showing last saved summary" banner.

6. Add an "Install app" button that appears on mobile using the `beforeinstallprompt` event.

### Pass test
- Open on Chrome Android → "Add to Home Screen" prompt appears
- Process a discharge → install, turn off WiFi, open installed app → last summary visible with offline banner
- Lighthouse PWA score >= 90 (`npm run build && npx serve dist` then run Lighthouse)

---

## Task C-2 · Wire real data into Admin analytics dashboard

**Status:** ❌ Not done  
**Priority:** 🔴 Critical (charts show static data right now)

### What to build
Replace all static/mock chart data in `AdminPanelPage.jsx` with live Supabase queries via the backend.

### Steps

1. Add a comprehensive analytics endpoint to `main.py`:
   ```python
   @app.get("/api/analytics/summary")
   async def analytics_summary():
       sessions = supabase.table("sessions").select("*").execute().data
       results = supabase.table("discharge_results").select("*").execute().data

       total_sessions = len(sessions)
       avg_quiz_score = sum(s.get("quiz_score", 0) for s in sessions if s.get("quiz_score") is not None) / max(len(sessions), 1)
       whatsapp_sent = sum(1 for s in sessions if s.get("whatsapp_sent"))
       needs_followup = sum(1 for r in results if r.get("needs_followup"))
       high_risk = sum(1 for r in results if r.get("risk_score", 0) >= 65)

       score_by_week = {}  # group by ISO week
       for s in sessions:
           if s.get("quiz_score") is not None:
               week = s["created_at"][:10]
               score_by_week.setdefault(week, []).append(s["quiz_score"])

       return {
           "total_sessions": total_sessions,
           "avg_quiz_score": round(avg_quiz_score * 33.3, 1),  # as percentage
           "whatsapp_sent": whatsapp_sent,
           "needs_followup": needs_followup,
           "high_risk_patients": high_risk,
           "score_trend": [
               {"date": d, "avg": round(sum(v)/len(v)*33.3, 1)}
               for d, v in sorted(score_by_week.items())[-14:]
           ]
       }
   ```

2. In `AdminPanelPage.jsx`, on mount call `GET /api/analytics/summary` and replace all hardcoded chart data with the API response.

3. Update `ComprehensionScoreChart` to use `score_trend` from the API.

4. Show stat boxes using live values: Total Sessions, Avg Comprehension, WhatsApp Sent, Patients Needing Follow-up, High Risk Count.

5. Add a "Last updated" timestamp and a refresh button.

### Pass test
- Process 5 dummy discharges with different quiz scores
- Admin dashboard total sessions shows 5
- Comprehension chart has 5 data points with correct averages
- Refresh button updates values without full page reload

---

## Task C-3 · Doctor notification panel (Supabase Realtime)

**Status:** ❌ Not done  
**Priority:** 🟡 High

### What to build
Doctors see a live notification bell that lights up when a patient in their care scores < 2/3 on a quiz. Uses Supabase Realtime — no polling needed.

### Steps

1. Install Supabase client on frontend (already installed — just import it):
   ```javascript
   import { createClient } from '@supabase/supabase-js'
   const supabase = createClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_ANON_KEY)
   ```

2. In the doctor's layout component (likely `AppShell.jsx`), subscribe to changes:
   ```javascript
   useEffect(() => {
     const channel = supabase
       .channel('doctor-alerts')
       .on('postgres_changes', {
         event: 'UPDATE',
         schema: 'public',
         table: 'discharge_results',
         filter: `doctor_id=eq.${doctorId}`
       }, (payload) => {
         if (payload.new.needs_followup === true) {
           setAlerts(prev => [...prev, payload.new]);
         }
       })
       .subscribe();
     return () => supabase.removeChannel(channel);
   }, [doctorId]);
   ```

3. Add a notification bell icon to the doctor's top nav with a red badge count.

4. Clicking the bell opens a dropdown listing patients who need follow-up with their name and last quiz score.

5. Enable Supabase Realtime for the `discharge_results` table in the Supabase dashboard (Table Editor → Enable Realtime toggle).

### Pass test
- Doctor is logged in, has the notification bell visible
- Patient (in a different tab) fails quiz
- Without refreshing — doctor's bell count increments within 3 seconds

---

## Task C-4 · Emergency medical QR card (printable)

**Status:** ❌ Not done  
**Priority:** 🟡 High (demo showstopper, zero backend needed)

### What to build
A printable emergency card with a QR code encoding the patient's blood type, allergies, current medications, and emergency contact. Scannable by a paramedic.

### Steps

1. After discharge processing, show a "Generate emergency card" button in the patient portal.

2. Create `src/components/EmergencyQRCard.jsx`:
   ```jsx
   import QRCode from 'qrcode.react';

   export default function EmergencyQRCard({ patient }) {
     const payload = JSON.stringify({
       bt: patient.blood_type,
       allergies: patient.allergies,
       meds: patient.medications.map(m => m.name),
       ec: patient.emergency_contact
     });
     return (
       <div id="qr-print-card" style={{
         width: 300, border: '2px solid #000',
         borderRadius: 8, padding: 16, fontFamily: 'Arial'
       }}>
         <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 8 }}>
           SwasthaLink — Emergency Card
         </div>
         <QRCode value={payload} size={140} />
         <div style={{ fontSize: 11, marginTop: 8 }}>
           Blood type: {patient.blood_type}<br/>
           Allergies: {patient.allergies || 'None known'}<br/>
           Emergency contact: {patient.emergency_contact}
         </div>
       </div>
     );
   }
   ```

3. Add a "Print card" button:
   ```javascript
   const printCard = () => {
     const card = document.getElementById('qr-print-card');
     const win = window.open('', '_blank');
     win.document.write(`<html><body>${card.outerHTML}</body></html>`);
     win.print();
   };
   ```

4. Install: `npm install qrcode.react` (if not already from Task B-4)

### Pass test
- Patient profile has blood type, allergies, emergency contact filled in
- Click "Generate emergency card" → QR card renders
- Click "Print card" → browser print dialog opens with card ready
- Scan QR with a phone camera → JSON data readable

---

## Task C-5 · Patient session history view

**Status:** ❌ Not done  
**Priority:** 🟠 Medium

### What to build
A timeline view in the patient portal showing all their past discharge summaries, quiz scores, and risk scores over time — so returning patients and their families can track health progress.

### Steps

1. Create `src/pages/PatientHistoryPage.jsx`.

2. On mount, call `GET /api/patient/{patientId}/history` (built in Task A-1).

3. Render as a vertical timeline:
   - Each entry shows: date, condition snippet (first 60 chars of simplified_english), quiz score badge, risk level chip
   - Click to expand and see full medication list + warning signs
   - Sort by `created_at` descending (most recent first)

4. Add a simple trend line at the top showing quiz score over time using `ComprehensionScoreChart`.

5. Add route: `/patient/:id/history` in `App.jsx`.

### Pass test
- Patient P001 has 3 discharge sessions in the database
- History page shows 3 entries in reverse chronological order
- Expanding an entry reveals medications and warning signs

---

## Task C-6 · Input validation + error state hardening

**Status:** ❌ Not done  
**Priority:** 🟠 Medium (prevents demo crashes)

### What to build
Ensure all async operations have proper loading states, error states, and user-friendly messages — critical for a live demo where API calls can fail.

### Steps

1. In every API call in `api.js`, wrap with try/catch and return a standard error shape:
   ```javascript
   try {
     const res = await fetch(...);
     if (!res.ok) throw new Error(`HTTP ${res.status}`);
     return await res.json();
   } catch (err) {
     return { error: true, message: err.message };
   }
   ```

2. In every page that calls an API, check for `result.error === true` and show a styled error toast (not a raw `alert()`).

3. Add a `<Suspense>` wrapper with a skeleton loader around the main output area.

4. Add minimum character validation on the discharge text input — disable "Simplify Now" button if text < 100 characters, show character count.

5. Add a loading message that cycles through steps while Gemini processes:
   - 0–2s: "Reading discharge summary..."
   - 2–5s: "Extracting medications..."
   - 5–8s: "Simplifying into Bengali..."
   - 8s+: "Generating comprehension quiz..."

6. If Twilio WhatsApp fails, show specific message: "WhatsApp delivery failed. Check that the number joined the Twilio sandbox." — not a generic error.

### Pass test
- Turn off backend → UI shows "Backend unreachable" toast, no crash
- Submit text with 50 chars → button stays disabled with hint "Need at least 100 characters"
- Process a long summary → loading message visibly cycles through steps

---

---

# Shared Tasks (Any member can pick up)

## Task S-1 · Mobile responsiveness on low-end Android

**Effort:** 2–3 hours  
Disable or lazy-load Three.js components on screens < 768px wide or when `navigator.hardwareConcurrency < 4`. Test the full flow on Chrome Android at 80% CPU throttle in DevTools.

## Task S-2 · CORS hardening on backend

**Effort:** 30 minutes  
In `backend/main.py`, change `allow_origins=["*"]` to the specific Vercel URL: `allow_origins=[os.getenv("FRONTEND_URL", "http://localhost:5173")]`. Add `FRONTEND_URL` to Render environment variables.

## Task S-3 · Rate limiting on `/api/process`

**Effort:** 1 hour  
Install `slowapi` (`pip install slowapi`) and add a limiter: 10 requests/minute per IP on `/api/process`. Prevents accidental Gemini quota burn during a demo.

```python
from slowapi import Limiter
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter

@app.post("/api/process")
@limiter.limit("10/minute")
async def process_discharge(request: Request, body: ProcessRequest):
    ...
```

## Task S-4 · README update

**Effort:** 30 minutes  
Update `README.md` to reflect the new multi-role architecture (Patient, Doctor, Admin), add the new API endpoints (A-2, A-3, A-4, A-5), and add the demo script from the strategy document.

---

---

# Done ✅ (Do Not Rebuild)

| Feature | Status |
|---------|--------|
| AI discharge text simplification (Gemini 2.5 Flash) | ✅ Done |
| Bilingual English + Bengali output | ✅ Done |
| MCQ comprehension quiz + adaptive re-explain | ✅ Done |
| Medication cards with plain-language names | ✅ Done |
| WhatsApp delivery via Twilio | ✅ Done |
| Bengali TTS read-aloud | ✅ Done |
| Role-aware simplification (Patient/Caregiver/Elderly) | ✅ Done |
| Prescription / document OCR upload (Gemini Vision) | ✅ Done |
| Patient reports module | ✅ Done |
| Doctor portal | ✅ Done |
| Admin panel (UI) | ✅ Done |
| Verification system | ✅ Done |
| Patient data management | ✅ Done |
| Supabase session logging (Zero-PHI) | ✅ Done |
| Render + Vercel deployment + UptimeRobot | ✅ Done |
| 3D visualisations (Three.js heart, DNA) | ✅ Done |
| Chart.js analytics components | ✅ Done |

---

---

# Priority Execution Order

```
Week 1 (Critical path — all 3 members in parallel)
  A-1  Wire AI pipeline to patient records
  A-2  Readmission risk score (30 mins, do this first)
  B-1  Connect AI output to patient portal
  B-2  Risk gauge component
  C-1  PWA offline support
  C-2  Wire real data into admin analytics

Week 2 (High value)
  A-3  Drug interaction endpoint
  A-4  Share token generation
  B-3  Drug interaction warning UI
  B-4  Caregiver dashboard page
  B-5  Quiz result → doctor alert UI
  C-3  Doctor notification panel

Week 3 (Polish + demo prep)
  A-5  Post-discharge WhatsApp check-ins
  B-6  Multi-language expansion
  C-4  Emergency QR card
  C-5  Patient session history
  C-6  Input validation + error hardening
  S-1  Mobile responsiveness
  S-2  CORS hardening
  S-3  Rate limiting
  S-4  README update
```

---

*Generated for ownworldmade / Suvam Paul · SwasthaLink v2.0 roadmap*  
*Stack: FastAPI · Gemini 2.5 Flash · React 18 + Vite · Supabase · Twilio · Render · Vercel*
