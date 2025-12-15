import React, { useState, useEffect } from 'react';
import { Textarea } from '../common/Textarea';
import { Input } from '../common/Input';
import { Button } from '../common/Button';
import { Plus, Trash2, ChevronLeft, ChevronRight } from 'lucide-react';

interface Product {
  name: string;
  description: string;
}

interface ProductCarouselProps {
  value: string; // JSON string or plain text
  onChange: (value: string) => void;
  placeholder?: string;
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

const parseProducts = (text: string): Product[] => {
  if (!text) return [{ name: '', description: '' }];

  // Try parsing as JSON first
  if (isJSONFormat(text)) {
    try {
      const parsed = JSON.parse(text);
      return parsed.length > 0 ? parsed : [{ name: '', description: '' }];
    } catch {
      return [{ name: '', description: '' }];
    }
  }

  // Otherwise treat as plain text - single product
  return [{ name: '', description: text }];
};

const formatProducts = (products: Product[]): string => {
  // Remove empty products
  const validProducts = products.filter(p => p.name.trim() || p.description.trim());
  if (validProducts.length === 0) return '';

  return JSON.stringify(validProducts);
};

export const ProductCarousel: React.FC<ProductCarouselProps> = ({ value, onChange, placeholder }) => {
  const [products, setProducts] = useState<Product[]>(() => parseProducts(value));
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    setProducts(parseProducts(value));
  }, [value]);

  const handleProductChange = (index: number, field: 'name' | 'description', fieldValue: string) => {
    const updated = [...products];
    updated[index] = { ...updated[index], [field]: fieldValue };
    setProducts(updated);
    onChange(formatProducts(updated));
  };

  const handleAddProduct = () => {
    const updated = [...products, { name: '', description: '' }];
    setProducts(updated);
    setCurrentIndex(updated.length - 1);
    onChange(formatProducts(updated));
  };

  const handleRemoveProduct = (index: number) => {
    if (products.length === 1) {
      // Don't remove the last product, just clear it
      const updated = [{ name: '', description: '' }];
      setProducts(updated);
      setCurrentIndex(0);
      onChange('');
      return;
    }

    const updated = products.filter((_, i) => i !== index);
    setProducts(updated);
    // Adjust current index if needed
    if (currentIndex >= updated.length) {
      setCurrentIndex(updated.length - 1);
    }
    onChange(formatProducts(updated));
  };

  const handlePrevious = () => {
    setCurrentIndex(prev => Math.max(0, prev - 1));
  };

  const handleNext = () => {
    setCurrentIndex(prev => Math.min(products.length - 1, prev + 1));
  };

  const currentProduct = products[currentIndex] || { name: '', description: '' };

  return (
    <div className="space-y-4">
      {/* Carousel Navigation */}
      {products.length > 1 && (
        <div className="flex items-center justify-between bg-slate-50 rounded-lg p-3 border border-slate-200">
          <button
            type="button"
            onClick={handlePrevious}
            disabled={currentIndex === 0}
            className={`p-2 rounded-lg transition-colors ${
              currentIndex === 0
                ? 'text-slate-300 cursor-not-allowed'
                : 'text-slate-700 hover:bg-white hover:shadow-sm'
            }`}
            title="Previous product"
          >
            <ChevronLeft size={18} />
          </button>

          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-slate-700">
              Product {currentIndex + 1} of {products.length}
            </span>
          </div>

          <button
            type="button"
            onClick={handleNext}
            disabled={currentIndex === products.length - 1}
            className={`p-2 rounded-lg transition-colors ${
              currentIndex === products.length - 1
                ? 'text-slate-300 cursor-not-allowed'
                : 'text-slate-700 hover:bg-white hover:shadow-sm'
            }`}
            title="Next product"
          >
            <ChevronRight size={18} />
          </button>
        </div>
      )}

      {/* Product Form */}
      <div className="space-y-4 p-4 bg-gradient-to-br from-orange-50/50 via-pink-50/50 to-purple-50/50 border-2 border-orange-200/50 rounded-xl">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Product/Service Name
          </label>
          <Input
            value={currentProduct.name}
            onChange={(e) => handleProductChange(currentIndex, 'name', e.target.value)}
            placeholder="e.g., Premium Coaching, Software Subscription, Consulting Services"
            className="w-full"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Description
          </label>
          <Textarea
            value={currentProduct.description}
            onChange={(e) => handleProductChange(currentIndex, 'description', e.target.value)}
            placeholder="Describe what this product/service offers, key benefits, pricing, target market, etc."
            rows={4}
            className="w-full"
          />
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-between gap-2 pt-2 border-t border-orange-200/50">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleAddProduct}
            className="flex items-center gap-2"
          >
            <Plus size={14} />
            Add Product
          </Button>

          {products.length > 1 && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => handleRemoveProduct(currentIndex)}
              className="flex items-center gap-2 text-red-600 hover:text-red-700 hover:bg-red-50"
            >
              <Trash2 size={14} />
              Remove
            </Button>
          )}
        </div>
      </div>

      {/* Product Dots Indicator */}
      {products.length > 1 && (
        <div className="flex items-center justify-center gap-2">
          {products.map((_, index) => (
            <button
              key={index}
              type="button"
              onClick={() => setCurrentIndex(index)}
              className={`w-2 h-2 rounded-full transition-all ${
                index === currentIndex
                  ? 'bg-primary-600 w-6'
                  : 'bg-slate-300 hover:bg-slate-400'
              }`}
              title={`Go to product ${index + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
};
