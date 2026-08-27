import React from 'react';

const GlassCard = ({ children, title, subtitle, className = '', hoverable = true, glowColor = '' }) => {
  // Map glowing borders based on alert properties
  const glows = {
    saffron: 'border-glow-saffron hover:shadow-neon-saffron',
    red: 'border-glow-red hover:shadow-neon-red',
    emerald: 'border-glow-emerald hover:shadow-neon-emerald',
  };

  const glowClass = glowColor ? glows[glowColor] || '' : '';

  return (
    <div 
      className={`glass-panel rounded-xl p-5 ${
        hoverable ? 'glass-panel-hover' : ''
      } ${glowClass} ${className}`}
    >
      {(title || subtitle) && (
        <div className="mb-4">
          {title && <h3 className="text-sm font-bold text-slate-200 tracking-wide font-display">{title}</h3>}
          {subtitle && <span className="text-[10px] text-slate-500 font-mono tracking-wider">{subtitle}</span>}
        </div>
      )}
      {children}
    </div>
  );
};

export default GlassCard;
