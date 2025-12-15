import React from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { cn } from '../../utils/cn';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  maxLength?: number;
  showCharCount?: boolean;
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  helperText,
  maxLength,
  showCharCount = false,
  className,
  value,
  type,
  ...props
}) => {
  const currentLength = typeof value === 'string' ? value.length : 0;
  const [showPassword, setShowPassword] = React.useState(false);
  const isPasswordField = type === 'password';

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
      <div className="relative">
        <input
          className={cn(
            'w-full px-3 py-2 glass-effect rounded-lg',
            'focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-primary-300',
            'disabled:bg-white/60 disabled:text-slate-400',
            'text-primary-900 placeholder-slate-400',
            'transition-all duration-300',
            error && 'border-red-400/50 focus:ring-red-500',
            isPasswordField && 'pr-10',
            className
          )}
          type={isPasswordField && showPassword ? 'text' : type}
          value={value}
          maxLength={maxLength}
          {...props}
        />
        {isPasswordField && (
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-500 hover:text-primary-500 transition-colors"
          >
            {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        )}
      </div>
      {error && (
        <p className="text-sm text-red-400">{error}</p>
      )}
      {helperText && !error && (
        <p className="text-sm text-slate-500">{helperText}</p>
      )}
    </div>
  );
};