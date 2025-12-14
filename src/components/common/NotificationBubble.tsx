import React from 'react';
import { PyAvatar } from './PyAvatar';
import { X } from 'lucide-react';
import { cn } from '../../utils/cn';

interface NotificationBubbleProps {
  message: string;
  type?: 'info' | 'success' | 'warning' | 'error';
  onClose?: () => void;
  className?: string;
}

export const NotificationBubble: React.FC<NotificationBubbleProps> = ({
  message,
  type = 'info',
  onClose,
  className
}) => {
  const typeStyles = {
    info: 'border-primary-200 bg-gradient-to-r from-primary-100/80 to-purple-100/80',
    success: 'border-green-200 bg-gradient-to-r from-green-100/80 to-primary-100/80',
    warning: 'border-accent-200 bg-gradient-to-r from-accent-100/80 to-earth-100/80',
    error: 'border-red-200 bg-gradient-to-r from-red-100/80 to-purple-100/80'
  };

  return (
    <div className={cn(
      'conversation-bubble flex items-start space-x-3 max-w-md animate-float',
      typeStyles[type],
      className
    )}>
      <PyAvatar size="sm" />
      <div className="flex-1 min-w-0">
        <p className="text-sm text-slate-600 leading-relaxed">{message}</p>
      </div>
      {onClose && (
        <button
          onClick={onClose}
          className="flex-shrink-0 p-1 text-slate-500 hover:text-primary-500 transition-colors"
        >
          <X size={14} />
        </button>
      )}
    </div>
  );
};