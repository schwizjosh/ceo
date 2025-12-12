import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Brand } from '../../types';

interface BrandSwitcherProps {
  brands: Brand[];
  currentBrandId: string | null;
  onBrandChange: (brandId: string) => void;
  className?: string;
}

// Generate brand initials from brand name
const getBrandInitials = (brandName: string): string => {
  if (!brandName) return 'BR';

  const words = brandName.trim().split(/\s+/);
  if (words.length === 1) {
    return words[0].substring(0, 2).toUpperCase();
  }

  // Take first letter of first two words
  return (words[0][0] + words[1][0]).toUpperCase();
};

// Generate gradient colors based on brand name (consistent per brand)
const getBrandGradient = (brandName: string): string => {
  if (!brandName) return 'from-primary-500 to-purple-600';

  // Simple hash function for consistency
  const hash = brandName.split('').reduce((acc, char) => {
    return char.charCodeAt(0) + ((acc << 5) - acc);
  }, 0);

  const gradients = [
    'from-primary-500 to-purple-600',
    'from-blue-500 to-cyan-600',
    'from-green-500 to-emerald-600',
    'from-orange-500 to-pink-600',
    'from-red-500 to-rose-600',
    'from-violet-500 to-purple-600',
    'from-amber-500 to-orange-600',
    'from-teal-500 to-cyan-600'
  ];

  return gradients[Math.abs(hash) % gradients.length];
};

export const BrandSwitcher: React.FC<BrandSwitcherProps> = ({
  brands,
  currentBrandId,
  onBrandChange,
  className = ''
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const currentBrand = brands.find(b => b.brand_id === currentBrandId);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  if (!currentBrand || brands.length === 0) {
    return null;
  }

  const initials = getBrandInitials(currentBrand.brand_name);
  const gradient = getBrandGradient(currentBrand.brand_name);

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 sm:gap-2 px-1.5 sm:px-2 py-1.5 hover:bg-white/70 rounded-lg transition-colors"
      >
        {/* Brand Avatar */}
        <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-gradient-to-br ${gradient} flex items-center justify-center shadow-sm flex-shrink-0`}>
          <span className="text-xs font-bold text-white">
            {initials}
          </span>
        </div>

        {/* Brand Name (Desktop Only) */}
        <div className="hidden md:flex items-center gap-2 min-w-0">
          <div className="text-left min-w-0">
            <div className="text-sm font-semibold text-slate-900 leading-tight truncate max-w-[150px] lg:max-w-[200px]">
              {currentBrand.brand_name}
            </div>
          </div>
          <ChevronDown
            size={16}
            className={`text-slate-400 transition-transform flex-shrink-0 ${isOpen ? 'rotate-180' : ''}`}
          />
        </div>
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute top-full left-1/2 -translate-x-1/2 sm:left-0 sm:translate-x-0 mt-2 w-[calc(100vw-2rem)] max-w-xs sm:max-w-sm bg-white rounded-xl shadow-xl border border-slate-200 z-50 overflow-hidden">
          <div className="p-2 max-h-96 overflow-y-auto">
            {brands.map((brand) => {
              const isSelected = brand.brand_id === currentBrandId;
              const brandInitials = getBrandInitials(brand.brand_name);
              const brandGradient = getBrandGradient(brand.brand_name);

              return (
                <button
                  key={brand.brand_id}
                  onClick={() => {
                    onBrandChange(brand.brand_id);
                    setIsOpen(false);
                  }}
                  className={`w-full flex items-center gap-2 sm:gap-3 p-2 sm:p-3 rounded-lg transition-colors ${
                    isSelected
                      ? 'bg-primary-50 border border-primary-200'
                      : 'hover:bg-slate-50 border border-transparent'
                  }`}
                >
                  {/* Brand Avatar */}
                  <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-gradient-to-br ${brandGradient} flex items-center justify-center shadow-sm flex-shrink-0`}>
                    <span className="text-xs sm:text-sm font-bold text-white">
                      {brandInitials}
                    </span>
                  </div>

                  {/* Brand Info */}
                  <div className="flex-1 text-left min-w-0">
                    <div className="text-sm font-semibold text-slate-900 truncate">
                      {brand.brand_name}
                    </div>
                    {brand.tagline && (
                      <div className="text-xs text-slate-500 truncate">
                        {brand.tagline}
                      </div>
                    )}
                  </div>

                  {/* Selected Indicator */}
                  {isSelected && (
                    <Check size={16} className="text-primary-600 flex-shrink-0 sm:w-[18px] sm:h-[18px]" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Create New Brand Option (Optional) */}
          {brands.length < 5 && (
            <>
              <div className="border-t border-slate-100" />
              <div className="p-2">
                <button
                  onClick={() => {
                    setIsOpen(false);
                    navigate('/dashboard/settings');
                  }}
                  className="w-full flex items-center gap-2 sm:gap-3 p-2 sm:p-3 rounded-lg hover:bg-slate-50 transition-colors text-left"
                >
                  <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full border-2 border-dashed border-slate-300 flex items-center justify-center flex-shrink-0">
                    <span className="text-base sm:text-lg text-slate-400">+</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-slate-700 truncate">
                      Create new brand
                    </div>
                    <div className="text-xs text-slate-500 truncate">
                      Add another brand to your workspace
                    </div>
                  </div>
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};
