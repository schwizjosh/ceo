/**
 * AIModelSwitcher Component
 *
 * Allows users to switch between different AI models
 * FREE users: Gemini only (no switcher shown)
 * PAID users: Can choose between Gemini, GPT, and Claude models
 */

import React from 'react';
import { Brain } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';

export type AIModel =
  | 'gemini-2.5-flash'
  | 'gemini-2.0-flash'
  | 'gpt-5.1-instant'
  | 'gpt-5'
  | 'gpt-5-mini'
  | 'gpt-4.1'
  | 'gpt-4o'
  | 'gpt-4o-mini'
  | 'claude-sonnet-4.5'
  | 'claude-sonnet-4'
  | 'claude-3.7-sonnet'
  | 'claude-haiku-4.5'
  | 'deepseek-v3.2';

interface AIModelSwitcherProps {
  value: AIModel;
  onChange: (model: AIModel) => void;
  className?: string;
  showForFreeUsers?: boolean; // Whether to show switcher for free users
}

const AI_MODELS: { value: AIModel; label: string; category: string; freeAccess: boolean }[] = [
  // Fast & Economical
  { value: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash', category: '⚡ Fast & Cheap', freeAccess: true },
  { value: 'gemini-2.0-flash', label: 'Gemini 2.0 Flash', category: '⚡ Fast & Cheap', freeAccess: true },
  { value: 'gpt-4o-mini', label: 'GPT-4o Mini', category: '⚡ Fast & Cheap', freeAccess: false },
  { value: 'claude-haiku-4.5', label: 'Claude Haiku 4.5', category: '⚡ Fast & Cheap', freeAccess: false },

  // Balanced Performance (Paid)
  { value: 'gpt-5-mini', label: 'GPT-5 Mini', category: '⚖️ Balanced', freeAccess: false },
  { value: 'gpt-4.1', label: 'GPT-4.1', category: '⚖️ Balanced', freeAccess: false },
  { value: 'gpt-4o', label: 'GPT-4o', category: '⚖️ Balanced', freeAccess: false },
  { value: 'claude-sonnet-4', label: 'Claude Sonnet 4', category: '⚖️ Balanced', freeAccess: false },
  { value: 'claude-3.7-sonnet', label: 'Claude 3.7 Sonnet', category: '⚖️ Balanced', freeAccess: false },
  { value: 'deepseek-v3.2', label: 'DeepSeek V3.2', category: '⚖️ Balanced', freeAccess: false },

  // Premium Performance (Paid)
  { value: 'gpt-5.1-instant', label: 'GPT-5.1 Instant ⚡', category: '🚀 Premium', freeAccess: false },
  { value: 'claude-sonnet-4.5', label: 'Claude Sonnet 4.5', category: '🚀 Premium', freeAccess: false },
  { value: 'gpt-5', label: 'GPT-5', category: '🚀 Premium', freeAccess: false }
];

export const AIModelSwitcher: React.FC<AIModelSwitcherProps> = ({
  value,
  onChange,
  className = '',
  showForFreeUsers = false
}) => {
  const { authUser: user } = useAuth();

  // Determine if user is on free plan
  const isFreeUser = !user?.plan || user.plan === 'free';

  // Free users can only use Gemini
  const availableModels = isFreeUser
    ? AI_MODELS.filter(m => m.freeAccess)
    : AI_MODELS;

  // Don't show switcher for free users unless explicitly requested
  if (isFreeUser && !showForFreeUsers) {
    return (
      <div className={`flex items-center gap-2 text-xs text-slate-500 ${className}`}>
        <Brain size={14} className="text-emerald-500" />
        <span>Gemini 2.5 Flash (FREE)</span>
      </div>
    );
  }

  // Group models by category
  const groupedModels = availableModels.reduce((acc, model) => {
    if (!acc[model.category]) {
      acc[model.category] = [];
    }
    acc[model.category].push(model);
    return acc;
  }, {} as Record<string, typeof AI_MODELS>);

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <Brain size={14} className="text-slate-400" />
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as AIModel)}
        className="text-xs px-2 py-1 rounded border border-slate-300 bg-white text-slate-700 focus:outline-none focus:border-primary-400 transition"
      >
        {Object.entries(groupedModels).map(([category, models]) => (
          <optgroup key={category} label={category}>
            {models.map((model) => (
              <option key={model.value} value={model.value}>
                {model.label}
              </option>
            ))}
          </optgroup>
        ))}
      </select>
    </div>
  );
};
