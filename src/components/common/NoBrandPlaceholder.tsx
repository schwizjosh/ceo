import React from 'react';
import { Sparkles } from 'lucide-react';

interface NoBrandPlaceholderProps {
  title: string;
  description: string;
}

export const NoBrandPlaceholder: React.FC<NoBrandPlaceholderProps> = ({ title, description }) => {
  return (
    <div className="max-w-4xl mx-auto px-6">
      <div className="glass-effect p-12 rounded-2xl border border-primary-500/20 text-center">
        <div className="flex justify-center mb-6">
          <div className="w-16 h-16 rounded-full bg-primary-500/10 flex items-center justify-center">
            <Sparkles className="w-8 h-8 text-primary-400" />
          </div>
        </div>
        <h2 className="text-2xl font-bold text-primary-900 mb-3">{title}</h2>
        <p className="text-slate-500 max-w-md mx-auto">
          {description}
        </p>
        <p className="text-sm text-slate-500 mt-6">
          Create a brand using the banner above to get started.
        </p>
      </div>
    </div>
  );
};
