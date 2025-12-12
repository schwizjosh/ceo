import React from 'react';

interface LoadingFallbackProps {
  message?: string;
}

export const LoadingFallback: React.FC<LoadingFallbackProps> = ({ message = 'Loading...' }) => {
  return (
    <div className="min-h-screen relative floating-particles flex items-center justify-center p-6 bg-gradient-to-br from-primary-100/40 via-white to-accent-100/30">
      <div className="text-center">
        <div className="w-8 h-8 border-2 border-primary-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-slate-600">{message}</p>
      </div>
    </div>
  );
};
