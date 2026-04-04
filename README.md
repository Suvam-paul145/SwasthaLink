# SwasthaLink 🏥

> **Medical discharge summary simplification with bilingual output and WhatsApp delivery**

Converting complex clinical discharge summaries into patient-readable language with bilingual output (English + Bengali), comprehension checks, and WhatsApp delivery.

**Built by:** Suvam Paul · [github.com/Suvam-paul145](https://github.com/Suvam-paul145) · **ownworldmade**

**Stack:** FastAPI · Gemini 2.5 Flash · React + Vite · Twilio · Supabase · AWS · Three.js · Chart.js · TailwindCSS v4

---

## 🎯 Problem Statement

**40-80% of patients don't understand their discharge instructions**, leading to:
- Incorrect medication usage
- Missed follow-up appointments
- Preventable readmissions
- Anxiety and confusion

**SwasthaLink solves this by** converting medical jargon into plain everyday language that patients actually understand.

---

## ✨ Key Features

### Core Features (MVP)
- 🤖 **AI-Powered Simplification**: Gemini 2.5 Flash converts clinical text into plain language
- 🌍 **Bilingual Output**: English + Bengali with everyday conversational language
- 💊 **Medication Cards**: Visual medication schedule with plain-purpose names
- 📝 **Comprehension Quiz**: 3 MCQs to verify understanding (auto-retry if score < 2/3)
- 📱 **WhatsApp Delivery**: Send simplified summary directly to patient's phone
- 🔊 **Text-to-Speech**: Read-aloud in Bengali using Web Speech API
- 👥 **Role-Based Simplification**: Tailored for Patient / Caregiver / Elderly
- 🎨 **3D Visualizations**: Three.js medical animations
- 📊 **Advanced Charts**: Chart.js data visualizations

### Advanced Features (Post-MVP)
- 📄 **PDF/Image Upload**: OCR extraction using Gemini Vision
- 📊 **Analytics Dashboard**: Session stats, comprehension scores
- 🔄 **Re-Explanation**: Simpler version triggered by low quiz scores

---

## 🏗️ Architecture

### Full Stack

**Frontend:**
- React 18 + Vite
- React Router v6
- Tailwind CSS v4
- Chart.js (data visualization)
- Three.js + React Three Fiber (3D medical visualizations)
- Framer Motion (animations)
- GSAP (advanced animations)

**Backend:**
- FastAPI (Python 3.11+)
- Google Gemini 2.5 Flash API
- Twilio WhatsApp API
- Supabase (PostgreSQL) - Zero-PHI session logging
- AWS S3 (24-hour auto-delete)

**Deployment:**
- Frontend: Vercel
- Backend: Render (with UptimeRobot for cold-start prevention)

### CI/CD Architecture

- CI entrypoint: `.github/workflows/ci.yml`
- Reusable CI logic: `.github/workflows/ci-reusable.yml`
- CD orchestration: `.github/workflows/cd.yml`
- Composite setup actions:
  - `.github/actions/setup-node/action.yml`
  - `.github/actions/setup-python/action.yml`
- Docker build files:
  - `Dockerfile.frontend`
  - `backend/Dockerfile`
- Kubernetes manifests:
  - Base: `infra/k8s/base/`
  - Overlays: `infra/k8s/overlays/staging`, `infra/k8s/overlays/production`
- Full architecture notes: `docs/cicd-architecture.md`

### Zero-PHI Architecture

```
Clinical text → RAM only → Gemini API → Response → RAM → Client
                ↑ Never written to disk/DB

Supabase stores ONLY: session_id, role, timestamp, quiz_score
(NO clinical text, NO patient names, NO PHI)
```

---

## 🚀 Quick Start

###Prerequisites

- Node.js 18+ and npm
- Python 3.11+
- Git

### 1. Clone Repository

```bash
git clone https://github.com/Suvam-paul145/SwasthaLink.git
cd SwasthaLink
```

### 2. Backend Setup (Required)

```bash
cd backend

# Create virtual environment
python -m venv venv

# Activate virtual environment
# Windows:
venv\Scripts\activate
# Linux/Mac:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Create .env file
cp .env.example .env

# Edit .env with your API keys:
# - GEMINI_API_KEY (from aistudio.google.com)
# - TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN (from twilio.com)
# - SUPABASE_URL, SUPABASE_KEY (from supabase.com)
# - AWS credentials (optional for file upload)

# Run backend
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

**Backend URLs:**
- API Server: `http://localhost:8000`
- API Docs: `http://localhost:8000/docs`
- Health Check: `http://localhost:8000/api/health`

### 3. Frontend Setup

```bash
# In a new terminal, from project root
cd ../  # back to root if in backend folder

# Install dependencies
npm install

# Create .env file
cp .env.example .env

# Edit .env
echo "VITE_API_URL=http://localhost:8000" > .env

# Run frontend
npm run dev
```

**Frontend URL:** `http://localhost:5173`

---

## 🔑 API Keys Setup

### 1. Gemini API Key (Required)

1. Go to [Google AI Studio](https://aistudio.google.com)
2. Sign in with Google account
3. Click "Get API Key"
4. Copy the key and add to `backend/.env`:
   ```
   GEMINI_API_KEY=your_key_here
   ```

### 2. Twilio WhatsApp (Required)

1. Create account at [twilio.com/try-twilio](https://twilio.com/try-twilio)
2. Go to **Messaging → Try WhatsApp**
3. Note your sandbox number (e.g., `+1 415 523 8886`)
4. **Scan QR code to join sandbox on your phone**
5. Copy credentials to `backend/.env`:
   ```
   TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
   TWILIO_AUTH_TOKEN=your_auth_token
   TWILIO_WHATSAPP_NUMBER=whatsapp:+14155238886
   ```

### 3. Supabase (Required)

1. Create project at [supabase.com](https://supabase.com)
2. Go to **Settings → API**
3. Copy URL and anon key to `backend/.env`:
   ```
   SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_KEY=your_anon_key
   ```
4. Create `sessions` table via SQL Editor:
   ```sql
   CREATE TABLE sessions (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     created_at TIMESTAMPTZ DEFAULT NOW(),
     role TEXT CHECK (role IN ('patient', 'caregiver', 'elderly')),
     language TEXT CHECK (language IN ('en', 'bn', 'both')),
     quiz_score INTEGER CHECK (quiz_score BETWEEN 0 AND 3),
     whatsapp_sent BOOLEAN DEFAULT FALSE,
     re_explained BOOLEAN DEFAULT FALSE,
     log_format TEXT DEFAULT 'text'
   );
   ```

### 4. AWS (Optional - For File Upload)

Only needed for PDF/image upload feature:

1. Create AWS account
2. Create S3 bucket (e.g., `discharge-uploads-yourname`)
3. Create IAM user with S3 access
4. Add credentials to `backend/.env`:
   ```
   AWS_ACCESS_KEY_ID=your_access_key
   AWS_SECRET_ACCESS_KEY=your_secret_key
   S3_BUCKET_NAME=discharge-uploads-yourname
   AWS_REGION=ap-south-1
   ```

---

## 📁 Project Structure

```
SwasthaLink/
├── backend/                      # FastAPI backend
│   ├── main.py                   # FastAPI app with all routes
│   ├── models.py                 # Pydantic request/response models
│   ├── prompts.py                # Gemini prompt templates
│   ├── gemini_service.py         # AI processing service
│   ├── twilio_service.py         # WhatsApp messaging service
│   ├── supabase_service.py       # Session logging service
│   ├── s3_service.py             # File storage service
│   ├── requirements.txt          # Python dependencies
│   ├── Procfile                  # Render deployment config
│   ├── .env.example              # Environment variables template
│   └── .gitignore
│
├── src/                          # React frontend
│   ├── components/               # UI components (3D + Charts)
│   │   ├── AppShell.jsx          # Layout + sidebar
│   │   ├── MedicalHeart3D.jsx    # Three.js heart
│   │   ├── DNA3DHelix.jsx        # Three.js DNA
│   │   ├── VitalSignsChart.jsx   # Chart.js
│   │   └── ...
│   ├── pages/                    # Page components
│   │   ├── ClarityHubPage.jsx    # Main landing
│   │   ├── AdminPanelPage.jsx    # Full dashboard
│   │   └── ...
│   ├── services/
│   │   └── api.js                # Backend API service
│   ├── utils/
│   │   ├── config.js             # Configuration constants
│   │   ├── chartConfig.js        # Chart.js setup
│   │   └── animations.js         # Animation presets
│   ├── App.jsx                   # Main app component
│   └── main.jsx                  # Entry point
│
├── sample_data/                  # Test discharge summaries
│   ├── demo_summary.txt          # 12-drug ICU case (demo)
│   ├── simple_discharge.txt      # Simple outpatient case
│   └── post_surgery.txt          # Post-surgery case
│
├── package.json                  # Frontend dependencies
├── vite.config.js                # Vite configuration
├── tailwind.config.ts            # Tailwind CSS config
├── .env.example                  # Frontend env template
├── .gitignore
└── README.md                     # This file
```

---

## 🎮 Usage Guide

### Quick Test with Sample Data

1. **Start both backend and frontend** (in separate terminals)
2. Navigate to `http://localhost:5173`
3. Copy content from `sample_data/demo_summary.txt`
4. Paste into the input field
5. Select role (Patient/Caregiver/Elderly)
6. Click "Simplify Now"
7. See bilingual output + medication chart + quiz

### Testing WhatsApp Delivery

1. **Join Twilio sandbox first:**
   - Save `+1 415 523 8886` in phone contacts
   - Send WhatsApp message: `join <your-sandbox-code>` (code from Twilio console)
   - You'll receive confirmation
2. After getting simplified summary, enter phone number (+919876543210 format)
3. Click "Send to WhatsApp"
4. Check your phone for the message

### Testing Backend API Directly

```bash
# Health check
curl http://localhost:8000/api/health

# Process summary (use sample data)
curl -X POST http://localhost:8000/api/process \
  -H "Content-Type: application/json" \
  -d '{
    "discharge_text": "Patient discharged on Metformin 500mg twice daily for Type 2 Diabetes. Follow up in 4 weeks.",
    "role": "patient",
    "language": "both"
  }'
```

---

## 🔌 API Endpoints

### Core Backend Endpoints

#### POST `/api/process`
Process discharge summary with AI

**Request:**
```json
{
  "discharge_text": "string (min 50 chars)",
  "role": "patient | caregiver | elderly",
  "language": "en | bn | both",
  "re_explain": false
}
```

**Response:**
```json
{
  "simplified_english": "3-5 paragraphs...",
  "simplified_bengali": "সহজ বাংলায়...",
  "medications": [
    {
      "name": "heart tablet",
      "dose": "1 tablet",
      "timing": ["morning"],
      "reason": "prevents blood clots",
      "important": "never stop without doctor"
    }
  ],
  "follow_up": {
    "date": "In 2 weeks",
    "with": "Cardiology OPD",
    "reason": "Check recovery"
  },
  "warning_signs": ["chest pain", "breathlessness"],
  "comprehension_questions": [
    {
      "question": "Why must you never stop aspirin?",
      "options": ["A)...", "B)...", "C)...", "D)..."],
      "correct": "B",
      "explanation": "..."
    }
  ],
  "whatsapp_message": "*SwasthaLink* 🏥\n...",
  "session_id": "uuid"
}
```

#### POST `/api/send-whatsapp`
Send message to WhatsApp

**Request:**
```json
{
  "phone_number": "+919876543210",
  "message": "string"
}
```

#### POST `/api/quiz/submit`
Submit quiz and get score

**Request:**
```json
{
  "session_id": "uuid",
  "answers": ["A", "B", "C"],
  "correct_answers": ["A", "C", "D"]
}
```

**Response:**
```json
{
  "score": 2,
  "out_of": 3,
  "passed": true,
  "needs_re_explain": false,
  "feedback": "Good job! Review a few points."
}
```

#### GET `/api/health`
Check all services health

#### GET `/api/sessions/count`
Get total sessions processed

#### GET `/api/analytics`
Get analytics dashboard data

---

## 🚢 Deployment

### Backend Deployment (Render)

1. Push code to GitHub
2. Go to [render.com](https://render.com) → **New Web Service**
3. Connect your GitHub repository
4. Configure:
   - **Root Directory**: `backend`
   - **Runtime**: Python 3
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn main:app --host 0.0.0.0 --port $PORT`
5. **Add Environment Variables** (from `backend/.env.example`):
   - GEMINI_API_KEY
   - TWILIO_ACCOUNT_SID
   - TWILIO_AUTH_TOKEN
   - TWILIO_WHATSAPP_NUMBER
   - SUPABASE_URL
   - SUPABASE_KEY
   - (AWS keys if using file upload)
6. Deploy!

### Frontend Deployment (Vercel)

1. Push code to GitHub
2. Go to [vercel.com](https://vercel.com) → **New Project**
3. Import your repository
4. Configure:
   - **Root Directory**: `.` (project root)
   - **Framework Preset**: Vite
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
5. **Add Environment Variable**:
   - `VITE_API_URL` = `https://your-backend.onrender.com`
6. Deploy!

### Prevent Backend Cold Starts (UptimeRobot)

Render free tier sleeps after 15 minutes of inactivity. Keep it warm:

1. Go to [uptimerobot.com](https://uptimerobot.com) → Create Monitor
2. **Type**: HTTP(s)
3. **URL**: `https://your-backend.onrender.com/api/health`
4. **Monitoring Interval**: 14 minutes

---

## 🧪 Testing Checklist

### Backend Tests

- [ ] `curl http://localhost:8000/api/health` returns `{"status":"ok"}`
- [ ] API docs accessible at `http://localhost:8000/docs`
- [ ] Process endpoint works with sample data
- [ ] WhatsApp sends to your joined sandbox number
- [ ] Supabase logs sessions (check Supabase dashboard)

### Frontend Tests

- [ ] Dev server starts without errors
- [ ] Homepage loads (`http://localhost:5173`)
- [ ] All routes accessible via sidebar
- [ ] 3D components render (or show "Loading 3D..." fallback)
- [ ] Charts display correctly
- [ ] No red errors in browser console (F12)

### Integration Tests

- [ ] Frontend can call backend API
- [ ] Full flow works: input → process → output → quiz → WhatsApp
- [ ] API URL in `.env` is correct
- [ ] CORS allows frontend domain

---

## 🔧 Code Modularity

### Backend Service Layer

```
Routes (main.py)
    ↓ delegate to
Services:
  - gemini_service.py      (AI processing)
  - twilio_service.py      (WhatsApp)
  - supabase_service.py    (Logging)
  - s3_service.py          (Storage)
    ↓ use
Models (models.py)         (Pydantic validation)
    ↓ return to
Routes → JSON Response
```

**Benefits:**
- Single Responsibility Principle
- Easy to test each service independently
- Easy to swap implementations
- Clear separation of concerns

### Frontend Service Layer

```
Component (React)
    ↓ calls
API Service (api.js)
    ↓ uses
Config (config.js)
    ↓ HTTP request
Backend API
```

**Benefits:**
- Centralized API logic
- Easy to add caching, retries
- Consistent error handling
- Single source of truth for endpoints

---

## 🐛 Troubleshooting

### Backend Issues

**Problem**: `ModuleNotFoundError`
```bash
# Make sure virtual environment is activated
# Windows: venv\Scripts\activate
# Linux/Mac: source venv/bin/activate
pip install -r requirements.txt
```

**Problem**: `Gemini API key not configured`
- Check `backend/.env` exists and has `GEMINI_API_KEY=...`
- Verify key is valid at [aistudio.google.com](https://aistudio.google.com)

**Problem**: `Twilio error 21408` (Recipient not joined sandbox)
- Recipient must send `join <code>` to Twilio sandbox number
- Wait for confirmation message before sending

**Problem**: `CORS error`
- Check `FRONTEND_URL` in `backend/.env`
- Check `allow_origins` in `backend/main.py` includes your frontend URL

### Frontend Issues

**Problem**: `Failed to fetch` / Network errors
- Ensure backend is running on `http://localhost:8000`
- Check `VITE_API_URL` in `.env`
- Check browser console for exact error

**Problem**: API timeout
- Gemini API can take 5-15 seconds for complex summaries
- Check network connection
- Increase `REQUEST_TIMEOUT` in `src/utils/config.js`

**Problem**: Blank page
- Check browser console (F12) for errors
- Hard refresh: Ctrl+Shift+R (Cmd+Shift+R on Mac)
- Clear Vite cache: `rm -rf node_modules/.vite && npm run dev`

**Problem**: 3D components not loading
- Requires WebGL support (check: https://get.webgl.org/)
- Shows fallback "Loading 3D..." if unavailable
- Charts still work without WebGL

---

## 🚀 Quick Start

### Frontend Only (Without Backend)

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build
```

**Dev Server:** Usually runs on http://localhost:5173 (or 5174/5175 if ports are in use)

---

## 📍 Available Routes

| Route | Component | Description |
|-------|-----------|-------------|
| `/overview` or `/` | ClarityHubPage | Main landing page |
| `/family-dashboard` | FamilyDashboardPage | Patient monitoring (3D + Charts) |
| `/clarity-hub` | DetailedClarityHubPage | Detailed medical translation |
| `/admin-panel` | AdminPanelPage | Full dashboard (3D + Charts) |
| `/showcase` | ComponentShowcasePage | Demo of all components |
| `/settings` | SettingsPage | App settings |

---

## ✨ New Components Added

### 3D Visualizations (Three.js + React Three Fiber)
- **MedicalHeart3D** - Animated pulsating heart
- **DNA3DHelix** - Rotating double helix
- **FloatingMedicalCube** - 3D metric display

### Charts (Chart.js)
- **VitalSignsChart** - Multi-line chart
- **ComprehensionScoreChart** - Bar chart with benchmarks
- **ProcessingStatusDoughnut** - Distribution chart
- **ReadmissionRiskChart** - Risk trend line chart

### Utilities
- **ErrorBoundary** - Graceful error handling
- **chartConfig.js** - Chart.js theme configuration
- **animations.js** - Framer Motion presets

---

## 🔧 Troubleshooting

### Blank Page Issue
1. **Check browser console** (F12) for errors
2. **Hard refresh**: Ctrl+Shift+R (Cmd+Shift+R on Mac)
3. **Clear Vite cache**: `rm -rf node_modules/.vite && npm run dev`

### 3D Components Not Loading
- **WebGL Required**: 3D needs WebGL support
- **Fallback**: Shows "Loading 3D..." if WebGL unavailable
- **Charts still work** without WebGL

### Port Already in Use
```bash
# Kill all Node processes (see command at bottom of README)
# Or manually change port in vite.config.js
```

---

## 📦 Dependencies

```json
{
  "three": "Latest",
  "@react-three/fiber": "Latest",
  "@react-three/drei": "Latest",
  "chart.js": "Latest",
  "react-chartjs-2": "Latest",
  "framer-motion": "Latest",
  "gsap": "Latest"
}
```

---

## 🗂️ Project Structure

```
src/
├── App.jsx → Route configuration
├── main.jsx → Entry point
├── components/
│   ├── AppShell.jsx → Layout + sidebar
│   ├── ErrorBoundary.jsx
│   ├── MedicalHeart3D.jsx
│   ├── DNA3DHelix.jsx
│   ├── FloatingMedicalCube.jsx
│   ├── VitalSignsChart.jsx
│   ├── ComprehensionScoreChart.jsx
│   ├── ProcessingStatusDoughnut.jsx
│   └── ReadmissionRiskChart.jsx
├── pages/
│   ├── ClarityHubPage.jsx
│   ├── DetailedClarityHubPage.jsx
│   ├── FamilyDashboardPage.jsx
│   ├── AdminPanelPage.jsx
│   ├── ComponentShowcasePage.jsx
│   └── SettingsPage.jsx
└── utils/
    ├── chartConfig.js
    └── animations.js
```

---

## 🎯 Component Usage Examples

### Using 3D Components

```jsx
import MedicalHeart3D from './components/MedicalHeart3D';

<MedicalHeart3D bpm={72} className="h-96" />
```

### Using Charts

```jsx
import VitalSignsChart from './components/VitalSignsChart';

const data = {
  labels: ['00:00', '04:00', '08:00'],
  heartRate: [68, 72, 70],
  bloodPressure: [120, 118, 122]
};

<VitalSignsChart data={data} />
```

---

## ⚠️ Browser Requirements

- **Chrome/Firefox/Edge 90+** - Full 3D support
- **Safari 14+** - Limited 3D support
- **WebGL Required** for 3D visualizations
- Charts work in all modern browsers

---

## 🐛 Common Issues & Fixes

| Issue | Solution |
|-------|----------|
| Blank white page | Check console (F12), hard refresh, clear cache |
| 3D not rendering | Check WebGL support, try different browser |
| Port in use | Kill processes: `npx kill-port 5173 5174 5175` |
| Import errors | Run `npm install --force` |
| Build errors | Delete `node_modules/.vite` and restart |

---

## 🔍 Quick Diagnosis

```bash
# Check if files exist
ls src/pages/*.jsx src/components/*.jsx

# Verify dev server is running
curl http://localhost:5173

# Check for WebGL support
# Visit: https://get.webgl.org/
```

---

## 📝 Development Workflow

1. **Start dev server**: `npm run dev`
2. **Open browser**: Navigate to displayed URL
3. **Check console**: For any errors (F12)
4. **Test routes**: Click through sidebar navigation
5. **Verify components**: Admin Panel has most components

---

## 🎨 Customization

### Change Theme Colors
Edit `tailwind.config.js`:
```js
colors: {
  primary: "#4fdbc8",  // Change this
  // ... other colors
}
```

### Modify Chart Themes
Edit `src/utils/chartConfig.js`:
```js
export const chartTheme = {
  primaryColor: '#4fdbc8',  // Change this
  // ... other settings
}
```

---

## 🚀 Deployment

### Build
```bash
npm run build
# Output: dist/
```

### Preview Build
```bash
npm run preview
```

### Deploy to Vercel/Netlify
```bash
# Connect your Git repo
# Set build command: npm run build
# Set output directory: dist
```

---

## 🛠️ Utility Commands

### Clear Cache & Restart
```bash
rm -rf node_modules/.vite
npm run dev
```

### Reinstall Dependencies
```bash
rm -rf node_modules package-lock.json
npm install
```

### Kill All Node/Vite Processes (Windows)
```bash
# Kill specific ports
npx kill-port 5173 5174 5175 5176

# Or kill all Node processes
taskkill /F /IM node.exe
```

### Kill All Node/Vite Processes (Mac/Linux)
```bash
# Kill specific ports
npx kill-port 5173 5174 5175 5176

# Or kill all Node processes
pkill -f node
```

---

## 📄 License

MIT License - See LICENSE file

---

## 🤝 Contributing

This is a hackathon project. For issues or suggestions:
1. Check browser console for errors
2. Verify WebGL support if 3D issues
3. Report bugs with error messages

---

## ✅ Success Checklist

- [ ] Dev server starts without errors
- [ ] Can access homepage (auto-redirects to /overview)
- [ ] Sidebar navigation visible
- [ ] All 6 routes load
- [ ] Admin Panel shows charts (may show "Loading 3D..." if WebGL unsupported)
- [ ] No red errors in browser console

---

**Current Status:** ✅ Full-stack application ready
**Backend:** FastAPI + Gemini + Twilio + Supabase
**Frontend:** React + Vite + Three.js + Chart.js
**Zero-PHI:** Session metadata only, no clinical data stored

---

## 📝 Sample Data

Test with realistic discharge summaries:

- **demo_summary.txt** - 12-drug ICU case (complex, for stage demos)
- **simple_discharge.txt** - Outpatient gastroenteritis (simple, for quick tests)
- **post_surgery.txt** - Post-cholecystectomy (medium complexity)

---

## 👨‍💻 Author

**Suvam Paul**
- GitHub: [@Suvam-paul145](https://github.com/Suvam-paul145)
- Portfolio: **ownworldmade**

---

## 📄 License

MIT License - See LICENSE file

---

## 🙏 Acknowledgments

- **Google Gemini** for powerful AI capabilities
- **Twilio** for WhatsApp messaging infrastructure
- **Supabase** for zero-config PostgreSQL
- **FastAPI** for elegant Python web framework
- **React**, **Vite**, **Three.js**, **Chart.js** for amazing frontend tools

---

## 📞 Support

Having issues?

1. Check [Troubleshooting](#-troubleshooting) section
2. Verify all API keys are configured correctly
3. Check browser console (F12) for errors
4. Ensure both backend and frontend are running
5. View API docs: `http://localhost:8000/docs`
6. Open GitHub Issues for bugs

---

**Built with ❤️ for better healthcare communication**
