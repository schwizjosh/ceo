/**
 * AndoraNotification Component
 *
 * A friendly notification component that shows what Andora is doing.
 * Feels like interacting with someone rather than a loading spinner.
 */

import React from 'react';
import { Loader2, StopCircle } from 'lucide-react';

interface AndoraNotificationProps {
  message: string;
  show?: boolean;
  modelInfo?: string; // Kept for backward compatibility but not displayed
  progress?: { current: number; total: number } | null;
  onStop?: () => void;
  action?: {
    label: string;
    onClick: () => void;
  };
}

import React from 'react';
import { Loader2, StopCircle } from 'lucide-react';

interface PyNotificationProps {
  message: string;
  show?: boolean;
  modelInfo?: string; // Kept for backward compatibility but not displayed
  progress?: { current: number; total: number } | null;
  onStop?: () => void;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export const PyNotification: React.FC<PyNotificationProps> = ({
  message,
  show = true,
  modelInfo, // Ignored - kept for backward compatibility
  progress,
  onStop,
  action,
}) => {
  if (!show) return null;

  const progressPercentage = progress && progress.total > 0
    ? Math.round((progress.current / progress.total) * 100)
    : 0;

  return (
    <div className="fixed top-4 right-4 z-[9999] animate-slide-in-right">
      <div className="flex items-start gap-3 p-4 rounded-2xl border border-orange-200/50 bg-gradient-to-br from-white/95 via-orange-50/30 to-white/95 backdrop-blur shadow-xl max-w-md">
        {/* Py Avatar */}
        <div className="flex-shrink-0">
          <div className="relative">
            <img
              src="/py-logo.png"
              alt="Py"
              className="w-10 h-10 rounded-full ring-2 ring-orange-200/60"
            />
            {/* Animated glow effect */}
            <div className="absolute inset-0 rounded-full bg-orange-200/30 blur-md animate-pulse"></div>
          </div>
        </div>

        {/* Message Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-semibold text-sm text-slate-700">Py</span>
            <Loader2 className="w-3 h-3 text-orange-500 animate-spin" />
          </div>
          <p className="text-sm text-slate-600 leading-relaxed">
            {message}
          </p>
          {action && (
            <button
              onClick={action.onClick}
              className="mt-2 text-sm text-blue-600 hover:text-blue-700 font-semibold"
            >
              {action.label}
            </button>
          )}
        </div>

        {/* Stop Button */}
        {onStop && (
          <button
            onClick={onStop}
            className="flex-shrink-0 p-1.5 rounded-full hover:bg-red-50 text-red-500 hover:text-red-600 transition-colors group"
            title="Stop generation"
          >
            <StopCircle className="w-5 h-5" />
          </button>
        )}
      </div>
    </div>
  );
};

// Add animation to tailwind config or use inline styles
const styles = `
  @keyframes slide-in-right {
    from {
      transform: translateX(100%);
      opacity: 0;
    }
    to {
      transform: translateX(0);
      opacity: 1;
    }
  }

  .animate-slide-in-right {
    animation: slide-in-right 0.3s ease-out;
  }
`;

// Inject styles if not already in global CSS
if (typeof document !== 'undefined') {
  const styleSheet = document.createElement('style');
  styleSheet.textContent = styles;
  document.head.appendChild(styleSheet);
}
