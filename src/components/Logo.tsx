import React from 'react';

interface LogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const Logo: React.FC<LogoProps> = ({ className = '', size = 'md' }) => {
  const sizes = {
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-12 h-12'
  };

  return (
    <div className={`${sizes[size]} ${className}`}>
      <svg
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full"
      >
        <defs>
          <linearGradient id="logoGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#34D399" />
            <stop offset="50%" stopColor="#10B981" />
            <stop offset="100%" stopColor="#059669" />
          </linearGradient>
          <filter id="glow">
            <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>
        
        {/* Background circle */}
        <circle cx="50" cy="50" r="45" fill="url(#logoGrad)" opacity="0.1"/>
        
        {/* Main frame shape */}
        <path 
          d="M25 30 L75 30 L75 50 L55 60 L50 62 L45 60 L25 50 Z" 
          fill="url(#logoGrad)"
          filter="url(#glow)"
        />
        
        {/* Inner lens/aperture */}
        <circle 
          cx="50" 
          cy="40" 
          r="8" 
          fill="none" 
          stroke="white" 
          strokeWidth="2"
          opacity="0.9"
        />
        
        {/* Bottom bar */}
        <rect 
          x="20" 
          y="65" 
          width="60" 
          height="8" 
          rx="4" 
          fill="url(#logoGrad)"
          opacity="0.8"
        />
        
        {/* Sparkle effects */}
        <circle cx="70" cy="35" r="2" fill="white" opacity="0.8">
          <animate attributeName="opacity" values="0.8;0.3;0.8" dur="2s" repeatCount="indefinite"/>
        </circle>
        <circle cx="30" cy="70" r="1.5" fill="white" opacity="0.6">
          <animate attributeName="opacity" values="0.6;0.2;0.6" dur="2.5s" repeatCount="indefinite"/>
        </circle>
      </svg>
    </div>
  );
};