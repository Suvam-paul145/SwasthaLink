import React from 'react';

/**
 * RiskGauge Component
 * Renders an SVG gauge showing the readmission risk score.
 */
export default function RiskGauge({ score, level }) {
  // Score is 0-100, maps to -90 to 90 degrees
  const angle = (score / 100) * 180 - 90;
  const color = level === 'low' ? '#34d399' : level === 'moderate' ? '#f59e0b' : '#ef4444';
  
  return (
    <div style={{ textAlign: 'center', width: '200px', margin: '0 auto' }}>
      <svg viewBox="0 0 200 110" width="200">
        {/* Background arc segments */}
        {/* Low (0-35) */}
        <path d="M 20 100 A 80 80 0 0 1 75 32" stroke="#34d399" strokeWidth="12" fill="none"/>
        {/* Moderate (35-65) */}
        <path d="M 75 32 A 80 80 0 0 1 146 39" stroke="#f59e0b" strokeWidth="12" fill="none"/>
        {/* High (65-100) */}
        <path d="M 146 39 A 80 80 0 0 1 180 100" stroke="#ef4444" strokeWidth="12" fill="none"/>
        
        {/* Needle */}
        <line
          x1="100" y1="100"
          x2={100 + 65 * Math.cos((angle - 90) * Math.PI / 180)}
          y2={100 + 65 * Math.sin((angle - 90) * Math.PI / 180)}
          stroke={color} strokeWidth="3" strokeLinecap="round"
        />
        <circle cx="100" cy="100" r="5" fill={color}/>
      </svg>
      
      <div style={{ fontSize: 24, fontWeight: 600, color, marginTop: '-5px' }}>
        {score} / 100
      </div>
      <div style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#9ca3af' }}>
        {level} Readmission Risk
      </div>
    </div>
  );
}
