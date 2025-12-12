/**
 * CharacterForm Component
 *
 * Intuitive form for creating/editing characters.
 * Users fill what they know, AI fills the rest intelligently.
 */

import React from 'react';
import { Character, AgeRange } from '../../types';
import { Input } from '../common/Input';
import { Textarea } from '../common/Textarea';
import { Button } from '../common/Button';
import { Check, Sparkles } from 'lucide-react';

interface CharacterFormProps {
  character: Partial<Character>;
  onChange: (updates: Partial<Character>) => void;
  onMarkPerfect: () => void;
  isPerfect: boolean;
  showAIGenerate?: boolean;
  onAIGenerate?: () => void;
  isGenerating?: boolean;
}

const AGE_RANGES: AgeRange[] = [
  'teen',
  'early-20s',
  'mid-20s',
  'late-20s',
  'early-30s',
  'mid-30s',
  'late-30s',
  'early-40s',
  'mid-40s',
  'late-40s',
  '50s',
  '60s+'
];

const WORK_MODES = [
  { value: 'onsite', label: 'Onsite' },
  { value: 'remote', label: 'Remote' },
  { value: 'hybrid', label: 'Hybrid' }
];

export const CharacterForm: React.FC<CharacterFormProps> = ({
  character,
  onChange,
  onMarkPerfect,
  isPerfect,
  showAIGenerate = true,
  onAIGenerate,
  isGenerating = false
}) => {
  return (
    <div className={`p-6 rounded-lg border ${
      isPerfect
        ? 'border-green-400 bg-green-50/50'
        : 'border-primary-200/40 bg-white/50'
    } glass-effect space-y-4`}>

      {/* Header with Perfect Badge */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-primary-900">
          {character.name || 'New Character'}
        </h3>
        <Button
          onClick={onMarkPerfect}
          size="sm"
          variant={isPerfect ? 'default' : 'outline'}
          className={isPerfect ? 'bg-green-500 hover:bg-green-600' : ''}
        >
          <Check size={16} className="mr-1" />
          {isPerfect ? 'Perfect!' : 'Mark Perfect'}
        </Button>
      </div>

      {/* Form Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Character Name (Dramatic Role) */}
        <div>
          <label className="block text-sm font-medium text-primary-800 mb-1">
            Character Name <span className="text-red-500">*</span>
          </label>
          <Input
            value={character.name || ''}
            onChange={(e) => onChange({ name: e.target.value })}
            placeholder="e.g., The Guardian, The Visionary, The Mentor"
            className="w-full"
          />
          <p className="text-xs text-slate-500 mt-1">
            Dramatic role in the story (e.g., The Guardian, The Mother, The Keeper)
          </p>
        </div>

        {/* Role */}
        <div>
          <label className="block text-sm font-medium text-primary-800 mb-1">
            Role
          </label>
          <Input
            value={character.role || ''}
            onChange={(e) => onChange({ role: e.target.value })}
            placeholder="e.g., CTO, Marketing Lead"
            className="w-full"
          />
        </div>

        {/* Location */}
        <div>
          <label className="block text-sm font-medium text-primary-800 mb-1">
            Location
          </label>
          <Input
            value={character.location || ''}
            onChange={(e) => onChange({ location: e.target.value })}
            placeholder="e.g., Lagos, Nigeria"
            className="w-full"
          />
        </div>

        {/* Age Range */}
        <div>
          <label className="block text-sm font-medium text-primary-800 mb-1">
            Age Range
          </label>
          <select
            value={character.age_range || ''}
            onChange={(e) => onChange({ age_range: e.target.value as AgeRange })}
            className="w-full px-3 py-2 rounded-lg border border-primary-200 bg-white/50 focus:outline-none focus:ring-2 focus:ring-primary-400"
          >
            <option value="">Select age range...</option>
            {AGE_RANGES.map((range) => (
              <option key={range} value={range}>
                {range}
              </option>
            ))}
          </select>
        </div>

        {/* Work Mode */}
        <div>
          <label className="block text-sm font-medium text-primary-800 mb-1">
            Work Mode
          </label>
          <select
            value={character.work_mode || ''}
            onChange={(e) => onChange({ work_mode: e.target.value as 'onsite' | 'remote' | 'hybrid' })}
            className="w-full px-3 py-2 rounded-lg border border-primary-200 bg-white/50 focus:outline-none focus:ring-2 focus:ring-primary-400"
          >
            <option value="">Select work mode...</option>
            {WORK_MODES.map((mode) => (
              <option key={mode.value} value={mode.value}>
                {mode.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Perks */}
      <div>
        <label className="block text-sm font-medium text-primary-800 mb-1">
          Perks
        </label>
        <Textarea
          value={character.about || ''}
          onChange={(e) => onChange({ about: e.target.value })}
          placeholder="Brief description or notes about this character..."
          rows={4}
          className="w-full"
        />
      </div>

      {/* Personality Type */}
      <div>
        <label className="block text-sm font-medium text-primary-800 mb-1">
          Personality Type
        </label>
        <Input
          value={character.personality || ''}
          onChange={(e) => onChange({ personality: e.target.value })}
          placeholder="e.g., Strategic visionary (INTJ) who leads with data and empathy"
          className="w-full"
        />
        <p className="text-xs text-slate-500 mt-1">
          One-line personality description. Reference{' '}
          <a
            href="https://16personalities.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary-600 hover:text-primary-700 underline"
          >
            16personalities.com
          </a>
          {' '}for personality types.
        </p>
      </div>

      {/* Backstory */}
      <div>
        <label className="block text-sm font-medium text-primary-800 mb-1">
          Backstory
        </label>
        <Textarea
          value={character.backstory || ''}
          onChange={(e) => onChange({ backstory: e.target.value })}
          placeholder="Compelling origin story or cinematic backstory..."
          rows={3}
          className="w-full"
        />
      </div>

      {/* Character & Voice */}
      <div>
        <label className="block text-sm font-medium text-primary-800 mb-1">
          Character & Voice
        </label>
        <Textarea
          value={character.voice || ''}
          onChange={(e) => onChange({ voice: e.target.value })}
          placeholder="Comprehensive description capturing their character essence AND voice - include communication style, tone, humor level, quirks, signature phrases, emotional depth, and how they connect with audience..."
          rows={2}
          className="w-full"
        />
        <p className="text-xs text-slate-500 mt-1">
          Describe both who they are AND how they communicate. Be specific and detailed.
        </p>
      </div>

      {/* AI Generated Cinematic Persona */}
      {character.persona && (
        <div className="p-4 rounded-lg bg-accent-50/30 border border-accent-200/40">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles size={16} className="text-accent-500" />
            <label className="block text-sm font-semibold text-primary-900">
              Cinematic Persona
            </label>
          </div>
          <p className="text-sm text-primary-700 leading-relaxed">
            {character.persona}
          </p>
        </div>
      )}

      {/* AI Generate Button */}
      {showAIGenerate && onAIGenerate && !isPerfect && (
        <div className="pt-2 border-t border-primary-200/40">
          <Button
            onClick={onAIGenerate}
            loading={isGenerating}
            size="sm"
            className="w-full"
          >
            <Sparkles size={16} className="mr-2" />
            {character.persona ? 'Regenerate with AI' : 'Generate with AI'}
          </Button>
        </div>
      )}
    </div>
  );
};
