import React, { useState, useEffect } from 'react';
import { Textarea } from '../common/Textarea';

interface BuyerPersona {
  product?: string;
  name?: string;
  age?: string;
  occupation?: string;
  interests?: string;
  casual_interests?: string;
  character_lifestyle?: string;
  aspirations?: string;
  problems?: string;
}

interface BuyerPersonaFormProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

// Check if text is in structured format
const isStructuredFormat = (text: string): boolean => {
  if (!text || text.trim().length === 0) return false;

  const structuredKeywords = ['PRODUCT', 'NAME', 'Age', 'Occupation', 'Interests', 'Casual Interests', 'Character', 'Aspirations', 'Problems'];
  const lines = text.split('\n');
  let matchCount = 0;

  for (const line of lines) {
    const trimmed = line.trim();
    if (structuredKeywords.some(keyword => trimmed.toLowerCase().startsWith(keyword.toLowerCase()))) {
      matchCount++;
    }
  }

  // If at least 3 structured fields are present, consider it structured
  return matchCount >= 3;
};

const parseBuyerPersona = (text: string): BuyerPersona => {
  if (!text) return {};

  const persona: BuyerPersona = {};
  const lines = text.split('\n');

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.toUpperCase().startsWith('PRODUCT')) {
      persona.product = trimmed.split(':')[1]?.trim() || '';
    } else if (trimmed.toUpperCase().startsWith('NAME')) {
      persona.name = trimmed.split(':')[1]?.trim() || '';
    } else if (trimmed.toLowerCase().startsWith('age')) {
      persona.age = trimmed.split(':')[1]?.trim() || '';
    } else if (trimmed.toLowerCase().startsWith('occupation')) {
      persona.occupation = trimmed.split(':')[1]?.trim() || '';
    } else if (trimmed.toLowerCase().startsWith('interests')) {
      persona.interests = trimmed.split(':')[1]?.trim() || '';
    } else if (trimmed.toLowerCase().startsWith('casual interests')) {
      persona.casual_interests = trimmed.split(':')[1]?.trim() || '';
    } else if (trimmed.toLowerCase().startsWith('character') || trimmed.toLowerCase().startsWith('character & lifestyle')) {
      persona.character_lifestyle = trimmed.split(':')[1]?.trim() || '';
    } else if (trimmed.toLowerCase().startsWith('aspirations')) {
      persona.aspirations = trimmed.split(':')[1]?.trim() || '';
    } else if (trimmed.toLowerCase().startsWith('problems')) {
      persona.problems = trimmed.split(':')[1]?.trim() || '';
    }
  }

  return persona;
};

const formatBuyerPersona = (persona: BuyerPersona): string => {
  const lines: string[] = [];

  if (persona.product) lines.push(`PRODUCT : ${persona.product}`);
  if (persona.name) lines.push(`NAME : ${persona.name}`);
  if (persona.age) lines.push(`Age : ${persona.age}`);
  if (persona.occupation) lines.push(`Occupation : ${persona.occupation}`);
  if (persona.interests) lines.push(`Interests : ${persona.interests}`);
  if (persona.casual_interests) lines.push(`Casual Interests : ${persona.casual_interests}`);
  if (persona.character_lifestyle) lines.push(`Character & Lifestyle : ${persona.character_lifestyle}`);
  if (persona.aspirations) lines.push(`Aspirations : ${persona.aspirations}`);
  if (persona.problems) lines.push(`Problems : ${persona.problems}`);

  return lines.join('\n');
};

export const BuyerPersonaForm: React.FC<BuyerPersonaFormProps> = ({ value, onChange, placeholder }) => {
  const [persona, setPersona] = useState<BuyerPersona>(() => parseBuyerPersona(value));
  const [isStructuredMode, setIsStructuredMode] = useState(() => isStructuredFormat(value));
  const [manualModeOverride, setManualModeOverride] = useState(false);

  useEffect(() => {
    // Only auto-detect format if user hasn't manually toggled the mode
    if (!manualModeOverride) {
      const shouldBeStructured = isStructuredFormat(value);
      setIsStructuredMode(shouldBeStructured);
    }
    setPersona(parseBuyerPersona(value));
  }, [value, manualModeOverride]);

  const handleFieldChange = (field: keyof BuyerPersona, fieldValue: string) => {
    const updated = { ...persona, [field]: fieldValue };
    setPersona(updated);
    onChange(formatBuyerPersona(updated));
  };

  const handleToggleToStructured = () => {
    setIsStructuredMode(true);
    setManualModeOverride(true);
  };

  const handleToggleToFreeform = () => {
    setIsStructuredMode(false);
    setManualModeOverride(true);
  };

  if (!isStructuredMode) {
    return (
      <div className="space-y-2">
        <div className="flex justify-between items-center mb-2">
          <span className="text-xs text-slate-600">Free-form mode</span>
          <button
            type="button"
            onClick={handleToggleToStructured}
            className="text-xs text-primary-600 hover:text-primary-700"
          >
            Switch to Structured Mode
          </button>
        </div>
        <Textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          rows={10}
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center mb-2">
        <span className="text-xs font-medium text-slate-700">Structured Buyer Persona</span>
        <button
          type="button"
          onClick={handleToggleToFreeform}
          className="text-xs text-primary-600 hover:text-primary-700"
        >
          Switch to Free-form
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Product */}
        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1">
            PRODUCT
          </label>
          <input
            type="text"
            value={persona.product || ''}
            onChange={(e) => handleFieldChange('product', e.target.value)}
            placeholder="e.g., Lands & Properties"
            className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
        </div>

        {/* Name */}
        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1">
            NAME
          </label>
          <input
            type="text"
            value={persona.name || ''}
            onChange={(e) => handleFieldChange('name', e.target.value)}
            placeholder="e.g., Chinedu Godwin"
            className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
        </div>

        {/* Age */}
        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1">
            Age
          </label>
          <input
            type="text"
            value={persona.age || ''}
            onChange={(e) => handleFieldChange('age', e.target.value)}
            placeholder="e.g., 31"
            className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
        </div>

        {/* Occupation */}
        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1">
            Occupation
          </label>
          <input
            type="text"
            value={persona.occupation || ''}
            onChange={(e) => handleFieldChange('occupation', e.target.value)}
            placeholder="e.g., Investor"
            className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Interests */}
      <div>
        <label className="block text-xs font-medium text-slate-700 mb-1">
          Interests
        </label>
        <Textarea
          value={persona.interests || ''}
          onChange={(e) => handleFieldChange('interests', e.target.value)}
          placeholder="e.g., Forex / Market Trade, Flexing, Cars, VIP Treatments"
          rows={2}
        />
      </div>

      {/* Casual Interests */}
      <div>
        <label className="block text-xs font-medium text-slate-700 mb-1">
          Casual Interests
        </label>
        <Textarea
          value={persona.casual_interests || ''}
          onChange={(e) => handleFieldChange('casual_interests', e.target.value)}
          placeholder="e.g., Premium food, Pizza, Women, Telegram"
          rows={2}
        />
      </div>

      {/* Character & Lifestyle */}
      <div>
        <label className="block text-xs font-medium text-slate-700 mb-1">
          Character & Lifestyle
        </label>
        <Textarea
          value={persona.character_lifestyle || ''}
          onChange={(e) => handleFieldChange('character_lifestyle', e.target.value)}
          placeholder="e.g., Flamboyant, Works from Home, Luxury"
          rows={2}
        />
      </div>

      {/* Aspirations */}
      <div>
        <label className="block text-xs font-medium text-slate-700 mb-1">
          Aspirations
        </label>
        <Textarea
          value={persona.aspirations || ''}
          onChange={(e) => handleFieldChange('aspirations', e.target.value)}
          placeholder="e.g., Body goals, achieving a social status"
          rows={2}
        />
      </div>

      {/* Problems */}
      <div>
        <label className="block text-xs font-medium text-slate-700 mb-1">
          Problems
        </label>
        <Textarea
          value={persona.problems || ''}
          onChange={(e) => handleFieldChange('problems', e.target.value)}
          placeholder="e.g., Liquidity risk, inflation, Fear per investment"
          rows={2}
        />
      </div>

      {/* Preview */}
      <div className="mt-4 p-4 bg-slate-50 rounded-lg border border-slate-200">
        <div className="text-xs font-medium text-slate-700 mb-2">Preview</div>
        <pre className="text-xs text-slate-600 whitespace-pre-wrap font-mono">
          {formatBuyerPersona(persona) || 'Fill in the fields above to see the formatted buyer persona'}
        </pre>
      </div>
    </div>
  );
};
