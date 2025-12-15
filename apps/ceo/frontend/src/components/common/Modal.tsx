import React, { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { cn } from '../../utils/cn';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  size = 'md'
}) => {
  const historyStateIdRef = useRef<string | null>(null);
  const isClosingRef = useRef(false);

  // Disable body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    if (!isOpen) {
      historyStateIdRef.current = null;
      isClosingRef.current = false;
      return;
    }

    const stateId = `modal-${Date.now()}`;
    historyStateIdRef.current = stateId;

    try {
      window.history.pushState({ ...window.history.state, __modalId: stateId }, '');
    } catch (error) {
      console.warn('Failed to push modal history state', error);
    }

    const handlePopState = () => {
      if (!historyStateIdRef.current) return;
      historyStateIdRef.current = null;
      if (!isClosingRef.current) {
        isClosingRef.current = true;
        onClose();
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        if (isClosingRef.current) return;
        isClosingRef.current = true;
        if (historyStateIdRef.current) {
          try {
            window.history.back();
            return;
          } catch (error) {
            console.warn('Failed to navigate back from modal history state', error);
          }
        }
        onClose();
      }
    };

    window.addEventListener('popstate', handlePopState);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('popstate', handlePopState);
      window.removeEventListener('keydown', handleKeyDown);

      if (historyStateIdRef.current && !isClosingRef.current) {
        try {
          isClosingRef.current = true;
          window.history.back();
        } catch (error) {
          console.warn('Failed to clean up modal history state', error);
          onClose();
        }
      }

      historyStateIdRef.current = null;
      isClosingRef.current = false;
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const sizeClasses = {
    sm: 'max-w-md',
    md: 'max-w-2xl',
    lg: 'max-w-4xl',
    xl: 'max-w-6xl'
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:p-0">
        <div 
          className="fixed inset-0 transition-opacity bg-dark-900/80 backdrop-blur-sm" 
          onClick={onClose}
        />
        
        <div className={cn(
          "relative inline-block w-full p-6 my-8 overflow-hidden text-left align-middle transition-all transform glass-effect shadow-2xl rounded-2xl border border-primary-500/20",
          sizeClasses[size]
        )}>
          {title && (
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-primary-900 shimmer-text">{title}</h3>
              <button
                onClick={onClose}
                className="p-1 text-slate-500 hover:text-primary-500 transition-colors rounded-lg hover:bg-white/70"
              >
                <X size={20} />
              </button>
            </div>
          )}
          
          <div className="max-h-[calc(100vh-200px)] overflow-y-auto">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
};