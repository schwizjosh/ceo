/**
 * CharacterFormField Component
 *
 * Individual field with "Mark as Perfect" toggle
 */

import React, { useEffect, useState } from 'react';

export type CharacterFieldKey =
  | 'name'
  | 'character_name'
  | 'role'
  | 'gender'
  | 'about'
  | 'personality'
  | 'age_range'
  | 'work_mode'
  | 'persona'
  | 'backstory'
  | 'voice'
  | 'emotional_range'
  | 'personality_tags';

interface CharacterFormFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  onPerfectToggle: () => void;
  onBlur?: () => void;
  isPerfect: boolean;
  placeholder?: string;
  type?: 'input' | 'textarea' | 'select';
  required?: boolean;
  options?: { value: string; label: string }[];
  helpText?: string;
  rows?: number;
  suggestion?: string;
  onSuggestionApply?: (field: CharacterFieldKey, suggestion: string) => void;
  onSuggestionRefine?: (field: CharacterFieldKey) => void;
  fieldKey?: CharacterFieldKey;
  suggestionLabel?: string;
  isRefining?: boolean;
  readOnly?: boolean;            // Make field read-only (for AI-generated content)
  hideAIButtons?: boolean;       // Hide AI suggestion/refine buttons
  hidePerfectToggle?: boolean;   // Hide perfect toggle
}

export const CharacterFormField: React.FC<CharacterFormFieldProps> = ({
  label,
  value,
  onChange,
  onPerfectToggle,
  onBlur,
  isPerfect,
  placeholder,
  type = 'input',
  required = false,
  options = [],
  helpText,
  rows = 2,
  suggestion,
  onSuggestionApply,
  onSuggestionRefine,
  fieldKey,
  suggestionLabel,
  isRefining = false,
  readOnly = false,
  hideAIButtons = false,
  hidePerfectToggle = false
}) => {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setCopied(false);
  }, [suggestion]);

  const handleApplyClick = () => {
    if (!suggestion || !fieldKey) return;
    onSuggestionApply?.(fieldKey, suggestion);
  };

  const handleRefineClick = () => {
    if (!fieldKey) return;
    onSuggestionRefine?.(fieldKey);
  };

  const handleCopyClick = async () => {
    if (!suggestion) return;

    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(suggestion);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = suggestion;
        textarea.setAttribute('readonly', '');
        textarea.style.position = 'absolute';
        textarea.style.left = '-9999px';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy suggestion to clipboard:', error);
    }
  };

  return (
    <div className={`relative ${isPerfect ? 'bg-green-50/30 rounded-lg p-2 -m-2' : ''}`}>
      <div className="flex items-center justify-between mb-1">
        <label className="block text-sm font-medium text-primary-800">
          {label} {required && <span className="text-red-500">*</span>}
          {readOnly && <span className="ml-1 text-xs text-slate-500">(AI-Generated)</span>}
        </label>
        {!hidePerfectToggle && (
          <button
            onClick={onPerfectToggle}
            className={`px-2 py-1 rounded text-xs font-medium transition-all uppercase ${
              isPerfect
                ? 'text-green-600 border border-green-400/50 bg-green-50 hover:bg-green-100'
                : 'text-slate-500 border border-slate-300 hover:border-slate-400'
            }`}
            type="button"
          >
            {isPerfect ? '✓ Perfect' : 'Mark as Perfect'}
          </button>
        )}
      </div>

      {type === 'input' && (
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
          placeholder={placeholder}
          readOnly={readOnly}
          className={`w-full px-3 py-2 rounded-lg border ${
            isPerfect ? 'border-green-300 bg-green-50/50' : 'border-primary-200'
          } ${readOnly ? 'bg-slate-50 cursor-not-allowed' : 'bg-white/50'} focus:outline-none focus:ring-2 focus:ring-primary-400`}
        />
      )}

      {type === 'textarea' && (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
          placeholder={placeholder}
          rows={rows}
          readOnly={readOnly}
          className={`w-full px-3 py-2 rounded-lg border ${
            isPerfect ? 'border-green-300 bg-green-50/50' : 'border-primary-200'
          } ${readOnly ? 'bg-slate-50 cursor-not-allowed' : 'bg-white/50'} focus:outline-none focus:ring-2 focus:ring-primary-400 resize-y min-h-[80px]`}
        />
      )}

      {type === 'select' && (
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
          className={`w-full px-3 py-2 rounded-lg border ${
            isPerfect ? 'border-green-300 bg-green-50/50' : 'border-primary-200'
          } bg-white/50 focus:outline-none focus:ring-2 focus:ring-primary-400`}
        >
          <option value="">Select...</option>
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      )}

      {helpText && (
        <p className="text-xs text-slate-500 mt-1">{helpText}</p>
      )}

      {!hideAIButtons && suggestion && !isPerfect && fieldKey && (
        <div className="mt-2 border border-primary-200 bg-primary-50/60 rounded-md p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-semibold text-primary-900">
              {suggestionLabel || 'Andora suggests'}
            </span>
          </div>
          <div className="flex items-start justify-between gap-3">
            <p className="text-sm text-primary-800 whitespace-pre-wrap flex-1 leading-relaxed">{suggestion}</p>
            <div className="flex flex-col gap-1 items-end flex-shrink-0">
              <div className="flex gap-1">
                {onSuggestionApply && fieldKey && (
                  <button
                    type="button"
                    onClick={handleApplyClick}
                    className="text-xs px-3 py-1 rounded-md bg-primary-600 text-white hover:bg-primary-700 transition"
                  >
                    Apply
                  </button>
                )}
                {onSuggestionRefine && fieldKey && (
                  <button
                    type="button"
                    onClick={handleRefineClick}
                    className="text-xs px-3 py-1 rounded-md bg-orange-600 text-white hover:bg-orange-700 transition disabled:opacity-60 disabled:cursor-not-allowed"
                    disabled={isRefining}
                  >
                    {isRefining ? 'Refining…' : 'Refine'}
                  </button>
                )}
              </div>
              <button
                type="button"
                onClick={handleCopyClick}
                className="text-xs px-3 py-1 rounded-md border border-primary-300 text-primary-700 hover:bg-primary-100 transition"
                aria-label={`Copy ${suggestionLabel || "Andora's suggestion"} for ${label}`}
              >
                {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
