import React from 'react';
import { PyAvatar } from './PyAvatar';
import { ShieldAlert } from 'lucide-react';

interface AccessRestrictedProps {
  title: string;
  description?: string;
}

export const AccessRestricted: React.FC<AccessRestrictedProps> = ({ title, description }) => {
  return (
    <div className="max-w-3xl mx-auto p-6 sm:p-10">
      <div className="glass-effect rounded-2xl border border-primary-500/30 bg-white/80 p-6 sm:p-8 flex flex-col sm:flex-row gap-5">
        <div className="flex items-center justify-center">
          <div className="relative">
            <PyAvatar size="lg" className="shadow-xl ring-2 ring-primary-500/40" />
            <span className="absolute -bottom-2 -right-2 bg-primary-500 text-white rounded-full p-1">
              <ShieldAlert size={16} />
            </span>
          </div>
        </div>
        <div>
          <h2 className="text-xl font-semibold text-primary-900">Access limited</h2>
          <p className="text-sm text-slate-600 mt-2 leading-relaxed">
            {description || `You don't have access to ${title.toLowerCase()} yet. Ask your workspace owner to update your permissions.`}
          </p>
        </div>
      </div>
    </div>
  );
};
