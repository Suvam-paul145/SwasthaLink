# SwasthaLink Enhanced UI Components

## Overview
This document describes the 3D visualization and charting components added to SwasthaLink for enhanced medical data presentation.

## Installed Libraries

### 3D Visualization
- **three** - Core 3D graphics library
- **@react-three/fiber** - React renderer for Three.js
- **@react-three/drei** - Useful helpers for React Three Fiber
- **@react-spring/three** - Spring physics-based animations for 3D

### Data Visualization
- **chart.js** - Flexible charting library
- **react-chartjs-2** - React wrapper for Chart.js

### Animation
- **framer-motion** - Production-ready motion library
- **gsap** - Professional-grade animation platform

## 3D Components

### 1. MedicalHeart3D
**Location:** `src/components/MedicalHeart3D.jsx`

A pulsating 3D heart visualization that simulates heartbeat animation.

**Props:**
- `bpm` (number): Beats per minute to display (default: 72)
- `className` (string): Additional CSS classes

**Usage:**
```jsx
import MedicalHeart3D from './components/MedicalHeart3D';

<MedicalHeart3D bpm={72} className="h-96" />
```

**Features:**
- Auto-rotating visualization
- Pulsating animation synced with BPM
- Metallic shader with custom colors
- Interactive orbit controls

---

### 2. DNA3DHelix
**Location:** `src/components/DNA3DHelix.jsx`

Animated double-helix DNA structure for genetic/medical data visualization.

**Props:**
- `className` (string): Additional CSS classes

**Usage:**
```jsx
import DNA3DHelix from './components/DNA3DHelix';

<DNA3DHelix className="h-96" />
```

**Features:**
- Dual-strand helix animation
- Connecting base pairs
- Auto-rotation
- Emissive lighting effects

---

### 3. FloatingMedicalCube
**Location:** `src/components/FloatingMedicalCube.jsx`

A floating 3D cube with text overlay, perfect for displaying key metrics.

**Props:**
- `value` (string): Primary metric value (default: "99.2%")
- `label` (string): Metric label (default: "Accuracy")
- `className` (string): Additional CSS classes

**Usage:**
```jsx
import FloatingMedicalCube from './components/FloatingMedicalCube';

<FloatingMedicalCube
  value="99.2%"
  label="AI Accuracy"
  className="h-48"
/>
```

**Features:**
- Floating animation
- Metallic rounded cube
- Centered text overlay
- Auto-rotation

---

## Chart Components

### 1. VitalSignsChart
**Location:** `src/components/VitalSignsChart.jsx`

Multi-line chart for tracking vital signs over time.

**Props:**
- `data` (object): Chart data with labels, heartRate, and bloodPressure arrays
- `className` (string): Additional CSS classes

**Usage:**
```jsx
import VitalSignsChart from './components/VitalSignsChart';

const vitalData = {
  labels: ['00:00', '04:00', '08:00', '12:00', '16:00', '20:00'],
  heartRate: [68, 72, 70, 75, 73, 71],
  bloodPressure: [120, 118, 122, 119, 121, 120]
};

<VitalSignsChart data={vitalData} />
```

**Features:**
- Dual-line tracking (heart rate & blood pressure)
- Smooth curves with tension
- Interactive tooltips
- Glass-card container

---

### 2. ComprehensionScoreChart
**Location:** `src/components/ComprehensionScoreChart.jsx`

Bar chart showing patient comprehension trends with benchmark line.

**Props:**
- `data` (object): Chart data with labels and scores arrays
- `className` (string): Additional CSS classes

**Usage:**
```jsx
import ComprehensionScoreChart from './components/ComprehensionScoreChart';

const scoreData = {
  labels: ['Week 1', 'Week 2', 'Week 3', 'Week 4', 'Current'],
  scores: [72, 78, 82, 85, 88.5]
};

<ComprehensionScoreChart data={scoreData} />
```

**Features:**
- Gradient bar colors
- Target benchmark overlay
- Current average display
- Rounded bars

---

### 3. ProcessingStatusDoughnut
**Location:** `src/components/ProcessingStatusDoughnut.jsx`

Doughnut chart showing document processing distribution.

**Props:**
- `className` (string): Additional CSS classes

**Usage:**
```jsx
import ProcessingStatusDoughnut from './components/ProcessingStatusDoughnut';

<ProcessingStatusDoughnut />
```

**Features:**
- 4-segment breakdown (Completed, Processing, Pending, Failed)
- Center total count display
- Hover effects
- Custom color scheme

---

### 4. ReadmissionRiskChart
**Location:** `src/components/ReadmissionRiskChart.jsx`

Line chart tracking readmission risk over time with industry comparison.

**Props:**
- `data` (object): Chart data with labels and risk arrays
- `className` (string): Additional CSS classes

**Usage:**
```jsx
import ReadmissionRiskChart from './components/ReadmissionRiskChart';

const riskData = {
  labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
  risk: [18.5, 16.2, 14.8, 13.5, 12.9, 12.4]
};

<ReadmissionRiskChart data={riskData} />
```

**Features:**
- Risk percentage tracking
- Industry average benchmark
- Trend indicator
- Error-themed styling (red)

---

## Utilities

### Chart Configuration
**Location:** `src/utils/chartConfig.js`

Centralized Chart.js configuration with SwasthaLink theme.

**Exports:**
- `chartTheme` - Color and style constants
- `defaultChartOptions` - Shared chart options
- `ChartJS` - Configured Chart.js instance

**Usage:**
```jsx
import { chartTheme, defaultChartOptions } from '../utils/chartConfig';
```

---

### Animation Utilities
**Location:** `src/utils/animations.js`

Framer Motion animation presets for consistent UI motion.

**Available Animations:**
- `fadeIn` - Simple fade in
- `fadeInUp` - Fade with upward motion
- `scaleIn` - Scale and fade
- `slideInFromRight` / `slideInFromLeft` - Horizontal slides
- `staggerContainer` - Stagger child animations
- `cardHover` - Card hover effect
- `buttonTap` - Button press effect
- `glassPulse` - Glass morphism pulse
- `heartbeat` - Medical heartbeat effect
- `spinnerRotate` - Loading spinner
- `progressBar` - Animated progress

**Usage:**
```jsx
import { motion } from 'framer-motion';
import { fadeInUp, cardHover } from '../utils/animations';

<motion.div
  initial={fadeInUp.initial}
  animate={fadeInUp.animate}
  transition={fadeInUp.transition}
  whileHover={cardHover.hover}
>
  Content
</motion.div>
```

---

## Integration Example

### Admin Panel Page
The Admin Panel now includes:
- 3D Floating Cube for AI accuracy metrics
- Readmission Risk Chart (8-column span)
- Processing Status Doughnut (4-column span)
- Comprehension Score Chart
- Vital Signs Chart
- DNA Helix 3D visualization
- Real-time Heart Monitor 3D

### Family Dashboard Page
The Family Dashboard now includes:
- 3D Heart visualization in the Heart Rate card
- Full-width Vital Signs Chart at the bottom

---

## Performance Considerations

### 3D Components
- Use `className="h-96"` or similar to constrain canvas size
- Limit to 2-3 active 3D components per page for optimal performance
- Auto-rotation speeds are optimized for smooth 60fps

### Charts
- Charts are responsive and maintain aspect ratio
- Use `maintainAspectRatio: false` for fixed-height containers
- Data is memoized to prevent unnecessary re-renders

---

## Customization

### Themes
All components use the SwasthaLink color palette:
- Primary: `#4fdbc8` (teal)
- Secondary: `#00d9ff` (cyan)
- Error: `#ef4444` (red)
- Background: Glass morphism with blur

### Styling
Components use TailwindCSS classes and can be customized via:
1. `className` prop for additional classes
2. Modifying `src/utils/chartConfig.js` for chart themes
3. Editing component files directly for advanced customization

---

## Browser Compatibility

### WebGL Support
3D components require WebGL support. Fallback handling:
```jsx
import { Canvas } from '@react-three/fiber';

<Canvas fallback={<div>WebGL not supported</div>}>
  {/* 3D content */}
</Canvas>
```

### Chart.js
Fully supported in all modern browsers including:
- Chrome/Edge 90+
- Firefox 88+
- Safari 14+

---

## Future Enhancements

1. **VR/AR Support** - Add @react-three/xr for immersive medical data
2. **Real-time Data** - WebSocket integration for live updates
3. **Data Export** - Export charts as PNG/SVG
4. **Accessibility** - Add ARIA labels and keyboard navigation
5. **Mobile Optimization** - Touch gestures for 3D controls

---

## Troubleshooting

### 3D Components Not Rendering
- Check if WebGL is enabled in browser
- Verify Three.js dependencies are installed
- Check console for Canvas errors

### Charts Not Displaying
- Ensure Chart.js is properly registered (done in chartConfig.js)
- Verify data format matches expected structure
- Check container height is defined

### Performance Issues
- Reduce number of active 3D components
- Optimize chart data point count
- Use React.memo() for expensive components

---

## Support

For issues or questions:
- GitHub: [github.com/Suvam-paul145](https://github.com/Suvam-paul145)
- Project: SwasthaLink (AnubadMed)

Built with ❤️ by ownworldmade
