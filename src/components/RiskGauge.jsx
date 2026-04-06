import React from "react";

function RiskGauge({ score = 0, level = "low" }) {
  const clamp = (n, min, max) => Math.max(min, Math.min(max, n));
  const safeScore = clamp(Number(score) || 0, 0, 100);

  const levelFromScore = (value) => {
    if (value <= 34) return "low";
    if (value <= 64) return "moderate";
    return "high";
  };

  const safeLevel =
    level === "low" || level === "moderate" || level === "high"
      ? level
      : levelFromScore(safeScore);

  const COLORS = {
    low: "#22c55e",
    moderate: "#f59e0b",
    high: "#ef4444",
    track: "#e5e7eb",
    textMain: "#111827",
    textSub: "#6b7280",
  };

  const needleColor = COLORS[safeLevel];

  const width = 220;
  const height = 140;
  const cx = 110;
  const cy = 110;
  const radius = 88;

  const pctToAngle = (pct) => 180 - (pct / 100) * 180;
  const polar = (angleDeg, r) => {
    const rad = (angleDeg * Math.PI) / 180;
    return {
      x: cx + r * Math.cos(rad),
      y: cy - r * Math.sin(rad),
    };
  };

  const arcPath = (startPct, endPct) => {
    const startAngle = pctToAngle(startPct);
    const endAngle = pctToAngle(endPct);
    const startPoint = polar(startAngle, radius);
    const endPoint = polar(endAngle, radius);
    return `M ${startPoint.x} ${startPoint.y} A ${radius} ${radius} 0 0 1 ${endPoint.x} ${endPoint.y}`;
  };

  const needleAngle = pctToAngle(safeScore);

  return (
    <div
      style={{
        width: "100%",
        maxWidth: 320,
        margin: "0 auto",
        padding: 16,
        borderRadius: 16,
        background: "#ffffff",
        boxSizing: "border-box",
      }}
    >
      <svg
        viewBox={`0 0 ${width} ${height}`}
        style={{ width: "100%", height: "auto", display: "block" }}
      >
        <path d={arcPath(0, 100)} stroke={COLORS.track} strokeWidth="16" fill="none" />
        <path d={arcPath(0, 34)} stroke={COLORS.low} strokeWidth="16" fill="none" />
        <path d={arcPath(35, 64)} stroke={COLORS.moderate} strokeWidth="16" fill="none" />
        <path d={arcPath(65, 100)} stroke={COLORS.high} strokeWidth="16" fill="none" />

        <line
          x1={cx}
          y1={cy}
          x2={cx + 72}
          y2={cy}
          stroke={needleColor}
          strokeWidth="5"
          strokeLinecap="round"
          transform={`rotate(${-needleAngle} ${cx} ${cy})`}
        />
        <circle cx={cx} cy={cy} r="8" fill={needleColor} />
      </svg>

      <div style={{ textAlign: "center", marginTop: 6 }}>
        <div
          style={{
            fontSize: 36,
            fontWeight: 800,
            lineHeight: 1,
            color: COLORS.textMain,
          }}
        >
          {Math.round(safeScore)}
        </div>
        <div
          style={{
            marginTop: 6,
            fontSize: 14,
            fontWeight: 600,
            color: COLORS.textSub,
            textTransform: "capitalize",
          }}
        >
          {safeLevel} readmission risk
        </div>
      </div>
    </div>
  );
}

export default RiskGauge;
