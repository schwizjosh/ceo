/**
 * Andora Speech Bubble Component
 *
 * Speech bubble for Andora to communicate with users
 */

import React from 'react';

interface AndoraSpeechBubbleProps {
  children: React.ReactNode;
  className?: string;
}

export const AndoraSpeechBubble: React.FC<AndoraSpeechBubbleProps> = ({
  children,
  className = ''
}) => {
  return (
    <div className={`relative ${className}`}>
      {/* Speech bubble tail */}
      <div className="absolute -left-2 top-4 w-4 h-4 bg-white transform rotate-45 rounded-sm shadow-lg"></div>

      {/* Bubble content */}
      <div className="relative bg-white rounded-2xl p-6 shadow-xl border border-primary-100/70">
        <div className="text-slate-700 leading-relaxed">
          {children}
        </div>
      </div>
    </div>
  );
};
