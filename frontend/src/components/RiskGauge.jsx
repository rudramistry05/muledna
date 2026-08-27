import React from 'react';

const RiskGauge = ({ score = 0, size = 160 }) => {
  const radius = 60;
  const strokeWidth = 10;
  const circumference = 2 * Math.PI * radius;
  
  // Cap score between 0 and 100
  const normalizedScore = Math.min(100, Math.max(0, score));
  const strokeDashoffset = circumference - (normalizedScore / 100) * circumference;

  // Determine risk grade and color class
  let color = '#10B981'; // Emerald (Legit)
  let textGlow = 'neon-text-emerald';
  let level = 'LOW RISK';

  if (normalizedScore >= 75) {
    color = '#EF4444'; // Red (Mule Threat)
    textGlow = 'neon-text-red';
    level = 'CRITICAL MULE';
  } else if (normalizedScore >= 35) {
    color = '#FF9933'; // Saffron (Suspicious)
    textGlow = 'neon-text-saffron';
    level = 'SUSPICIOUS';
  }

  return (
    <div className="flex flex-col items-center justify-center p-2">
      <div className="relative" style={{ width: size, height: size }}>
        <svg className="w-full h-full transform -rotate-90">
          {/* Background circle track */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            className="stroke-slate-800"
            strokeWidth={strokeWidth}
            fill="transparent"
          />
          
          {/* Glowing active circle track */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={color}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            fill="transparent"
            style={{
              transition: 'stroke-dashoffset 0.8s ease-in-out, stroke 0.8s ease',
              filter: `drop-shadow(0 0 6px ${color})`
            }}
          />
        </svg>
        
        {/* Central telemetry overlays */}
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          <span className="text-[10px] text-slate-500 font-mono tracking-widest uppercase">Risk Rating</span>
          <span className={`text-3xl font-extrabold font-display tracking-tight ${textGlow}`}>
            {normalizedScore.toFixed(1)}
          </span>
          <span className="text-[9px] text-slate-400 font-mono tracking-wider font-semibold uppercase mt-0.5">
            {level}
          </span>
        </div>
      </div>
    </div>
  );
};

export default RiskGauge;
