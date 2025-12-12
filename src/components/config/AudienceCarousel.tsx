import React, { useState, useEffect } from 'react';
import { Button } from '../common/Button';
import { Plus, Trash2, ChevronLeft, ChevronRight, Sparkles } from 'lucide-react';
import { BuyerPersonaForm } from './BuyerPersonaForm';

interface Audience {
  name: string; // Audience segment name
  profile: string; // The buyer persona data
}

interface AudienceCarouselProps {
  value: string; // JSON string or plain text
  products: Product[]; // Products from ProductCarousel
  onChange: (value: string) => void;
  onAISuggest?: (audienceIndex: number) => void;
  isGeneratingAI?: boolean;
  placeholder?: string;
}

interface Product {
  name: string;
  description: string;
}

// Check if text is in JSON array format
const isJSONFormat = (text: string): boolean => {
  if (!text || text.trim().length === 0) return false;
  try {
    const parsed = JSON.parse(text);
    return Array.isArray(parsed);
  } catch {
    return false;
  }
};

const parseAudiences = (text: string, productsCount: number): Audience[] => {
  const ensureMinimum = (list: Audience[]) => {
    const needed = Math.max(1, productsCount);
    if (list.length >= needed) return list;
    const extras = Array.from({ length: needed - list.length }, (_, i) => ({
      name: `Audience ${list.length + i + 1}`,
      profile: ''
    }));
    return [...list, ...extras];
  };

  if (!text) {
    // Default: one audience per product
    return ensureMinimum([]);
  }

  // Try parsing as JSON first
  if (isJSONFormat(text)) {
    try {
      const parsed = JSON.parse(text);
      if (Array.isArray(parsed)) {
        return ensureMinimum(parsed);
      }
    } catch {
      // Fall through to default
    }
  }

  // Otherwise treat as plain text - seed first audience, pad to product count
  return ensureMinimum([{ name: 'Primary Audience', profile: text }]);
};

const formatAudiences = (audiences: Audience[]): string => {
  // Remove empty audiences
  const validAudiences = audiences.filter(a => a.profile.trim());
  if (validAudiences.length === 0) return '';

  return JSON.stringify(validAudiences);
};

export const AudienceCarousel: React.FC<AudienceCarouselProps> = ({
  value,
  products = [],
  onChange,
  onAISuggest,
  isGeneratingAI = false,
  placeholder
}) => {
  const [audiences, setAudiences] = useState<Audience[]>(() => parseAudiences(value, products.length));
  const [currentIndex, setCurrentIndex] = useState(0);

  // Update audiences when products change
  useEffect(() => {
    const parsedAudiences = parseAudiences(value, products.length);
    setAudiences(parsedAudiences);
  }, [value, products.length]);

  const handleAudienceChange = (index: number, profile: string) => {
    const updated = [...audiences];
    updated[index] = { ...updated[index], profile };
    setAudiences(updated);
    onChange(formatAudiences(updated));
  };

  const handleNameChange = (index: number, name: string) => {
    const updated = [...audiences];
    updated[index] = { ...updated[index], name };
    setAudiences(updated);
    onChange(formatAudiences(updated));
  };

  const handleAddAudience = () => {
    const updated = [...audiences, { name: `Audience ${audiences.length + 1}`, profile: '' }];
    setAudiences(updated);
    setCurrentIndex(updated.length - 1);
    onChange(formatAudiences(updated));
  };

  const handleRemoveAudience = (index: number) => {
    if (audiences.length === 1) {
      // Don't remove the last audience, just clear it
      const updated = [{ name: 'Primary Audience', profile: '' }];
      setAudiences(updated);
      setCurrentIndex(0);
      onChange('');
      return;
    }

    const updated = audiences.filter((_, i) => i !== index);
    setAudiences(updated);
    // Adjust current index if needed
    if (currentIndex >= updated.length) {
      setCurrentIndex(updated.length - 1);
    }
    onChange(formatAudiences(updated));
  };

  const handlePrevious = () => {
    setCurrentIndex(prev => Math.max(0, prev - 1));
  };

  const handleNext = () => {
    setCurrentIndex(prev => Math.min(audiences.length - 1, prev + 1));
  };

  const handleAIGenerate = () => {
    if (onAISuggest) {
      // Pass current audience index so AI can update the right audience
      onAISuggest(currentIndex);
    }
  };

  const currentAudience = audiences[currentIndex] || { name: 'Audience 1', profile: '' };
  const currentProduct = products[currentIndex];

  return (
    <div className="space-y-4">
      {/* Carousel Navigation - Always show to make it clear this is a carousel */}
      <div className="flex items-center justify-between bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-3 border-2 border-blue-200">
        <button
          type="button"
          onClick={handlePrevious}
          disabled={currentIndex === 0 || audiences.length === 1}
          className={`p-2 rounded-lg transition-colors ${
            currentIndex === 0 || audiences.length === 1
              ? 'text-slate-300 cursor-not-allowed'
              : 'text-slate-700 hover:bg-white hover:shadow-sm'
          }`}
          title="Previous audience"
        >
          <ChevronLeft size={18} />
        </button>

        <div className="flex flex-col items-center gap-1">
          <span className="text-sm font-semibold text-slate-800">
            {currentAudience.name || `Audience ${currentIndex + 1}`}
          </span>
          <span className="text-xs text-slate-600">
            {audiences.length > 1 ? `${currentIndex + 1} of ${audiences.length}` : '1 audience'}
            {currentProduct && currentProduct.name && ` • for ${currentProduct.name}`}
          </span>
        </div>

        <button
          type="button"
          onClick={handleNext}
          disabled={currentIndex === audiences.length - 1 || audiences.length === 1}
          className={`p-2 rounded-lg transition-colors ${
            currentIndex === audiences.length - 1 || audiences.length === 1
              ? 'text-slate-300 cursor-not-allowed'
              : 'text-slate-700 hover:bg-white hover:shadow-sm'
          }`}
          title="Next audience"
        >
          <ChevronRight size={18} />
        </button>
      </div>

      {/* Audience Name */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex-1">
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Audience Segment Name
          </label>
          <input
            type="text"
            value={currentAudience.name}
            onChange={(e) => handleNameChange(currentIndex, e.target.value)}
            placeholder="e.g., Early Adopters, Enterprise Clients, Small Business Owners"
            className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
        </div>
        {onAISuggest && (
          <button
            type="button"
            onClick={handleAIGenerate}
            disabled={isGeneratingAI}
            className="flex items-center gap-2 text-sm text-primary-600 hover:text-primary-700 disabled:opacity-50 mt-6"
          >
            <Sparkles size={14} />
            {isGeneratingAI ? 'Generating...' : 'AI Suggest'}
          </button>
        )}
      </div>

      {/* Current Product Context */}
      {currentProduct && currentProduct.name && (
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="text-xs font-medium text-blue-900 mb-1">
            🎯 Targeting for: {currentProduct.name}
          </div>
          <div className="text-xs text-blue-700">
            {currentProduct.description}
          </div>
        </div>
      )}

      {/* Buyer Persona Form */}
      <div className="min-w-0">
        <BuyerPersonaForm
          value={currentAudience.profile}
          onChange={(profile) => handleAudienceChange(currentIndex, profile)}
          placeholder={placeholder || "Describe this audience segment - who they are, what they need, what they care about."}
        />
      </div>

      {/* Action Buttons */}
      <div className="flex items-center justify-between gap-2 pt-3">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleAddAudience}
          className="flex items-center gap-2 bg-gradient-to-r from-blue-50 to-purple-50 border-blue-300 hover:from-blue-100 hover:to-purple-100 text-blue-700 font-medium"
        >
          <Plus size={16} />
          Add Another Audience
        </Button>

        {audiences.length > 1 && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => handleRemoveAudience(currentIndex)}
            className="flex items-center gap-2 text-red-600 hover:text-red-700 hover:bg-red-50 border-red-300"
          >
            <Trash2 size={14} />
            Remove This Audience
          </Button>
        )}
      </div>

      {/* Audience Dots Indicator - Always show */}
      <div className="flex items-center justify-center gap-2">
        {audiences.map((aud, index) => (
          <button
            key={index}
            type="button"
            onClick={() => setCurrentIndex(index)}
            className={`transition-all ${
              index === currentIndex
                ? 'bg-primary-600 w-8 h-2 rounded-full'
                : 'bg-slate-300 hover:bg-slate-400 w-2 h-2 rounded-full'
            }`}
            title={`${aud.name || `Audience ${index + 1}`}`}
          />
        ))}
      </div>

      {/* Key Audience Note */}
      <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
        <div className="text-xs text-blue-900 text-center">
          {currentIndex === 0 ? (
            <span>⭐ <strong>Key Audience</strong> - Used for Character Studio and default content targeting</span>
          ) : (
            <span>🎯 <strong>Alternate Audience</strong> - Available for targeted content briefs</span>
          )}
        </div>
      </div>
    </div>
  );
};
