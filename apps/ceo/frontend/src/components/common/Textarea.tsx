import React from 'react';
import { cn } from '../../utils/cn';

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  helperText?: string;
  maxLength?: number;
  showCharCount?: boolean;
}

export const Textarea: React.FC<TextareaProps> = ({
  label,
  error,
  helperText,
  maxLength,
  showCharCount = false,
  className,
  value,
  ...props
}) => {
  const currentLength = typeof value === 'string' ? value.length : 0;

  return (
    <div className="space-y-1">
      {label && (
        <div className="flex justify-between items-center">
          <label className="block text-sm font-medium text-slate-600">
            {label}
          </label>
          {showCharCount && maxLength && (
            <span className={cn(
              'text-xs',
              currentLength > maxLength * 0.9 ? 'text-accent-400' : 'text-slate-500'
            )}>
              {currentLength}/{maxLength}
            </span>
          )}
        </div>
      )}
      <textarea
        className={cn(
          'w-full px-3 py-2 glass-effect rounded-lg',
          'focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-primary-300',
          'disabled:bg-white/60 disabled:text-slate-400',
          'text-primary-900 placeholder-slate-400',
          'resize-vertical min-h-[100px]',
          'transition-all duration-300',
          error && 'border-red-400/50 focus:ring-red-500',
          className
        )}
        value={value}
        maxLength={maxLength}
        {...props}
      />
      {error && (
        <p className="text-sm text-red-400">{error}</p>
      )}
      {helperText && !error && (
        <p className="text-sm text-slate-500">{helperText}</p>
      )}
    </div>
  );
};