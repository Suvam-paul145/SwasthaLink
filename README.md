# SwasthaLink - Medical Translation Platform

> Enhanced with 3D visualizations (Three.js) and advanced charts (Chart.js)

**Built by:** Suvam Paul · [github.com/Suvam-paul145](https://github.com/Suvam-paul145)
**Stack:** React + Vite · Three.js · Chart.js · TailwindCSS v4

---

## 🚀 Quick Start

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

**Current Status:** ✅ All routes configured, all components created
**3D Support:** Requires WebGL
**Charts:** Work in all browsers

---

**Kill All Terminal Ports Command:**

```bash
# Windows (PowerShell/CMD)
taskkill /F /IM node.exe

# Or use npx (cross-platform)
npx kill-port 5173 5174 5175 5176 5177

# Mac/Linux
pkill -f node
# Or
killall node
```

---

Built with ❤️ by Suvam Paul for TechFest Hackathon
