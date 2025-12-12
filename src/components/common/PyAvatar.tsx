import React from 'react';
import { cn } from '../../utils/cn';

interface PyAvatarProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  animate?: boolean;
}

export const PyAvatar: React.FC<PyAvatarProps> = ({
  size = 'md',
  className,
  animate = false
}) => {
  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-12 h-12',
    lg: 'w-16 h-16',
    xl: 'w-24 h-24'
  };

  return (
    <div className={cn(
      'relative rounded-full overflow-hidden',
      sizeClasses[size],
      className
    )}>
      <img
        src="/py-logo.png"
        alt="Py AI Assistant"
        className="w-full h-full object-cover"
      />
    </div>
  );
};