import React, { useState, useEffect } from 'react';
import { X, Copy, CheckCircle2, Sparkles, RefreshCw } from 'lucide-react';
import { Button } from '../common/Button';
import { Textarea } from '../common/Textarea';

// Emotion display configuration
const EMOTION_CONFIG: Record<string, { emoji: string; color: string }> = {
  awe: { emoji: '✨', color: 'bg-purple-100 text-purple-700 border-purple-200' },
  inspired: { emoji: '💡', color: 'bg-amber-100 text-amber-700 border-amber-200' },
  touched: { emoji: '💖', color: 'bg-pink-100 text-pink-700 border-pink-200' },
  laughter: { emoji: '😄', color: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
  provoked: { emoji: '🔥', color: 'bg-orange-100 text-orange-700 border-orange-200' },
  excited: { emoji: '🚀', color: 'bg-blue-100 text-blue-700 border-blue-200' },
  confident: { emoji: '💪', color: 'bg-green-100 text-green-700 border-green-200' },
  reassured: { emoji: '🤝', color: 'bg-teal-100 text-teal-700 border-teal-200' },
  confused: { emoji: '😕', color: 'bg-gray-100 text-gray-600 border-gray-200' },
  disconnected: { emoji: '🔌', color: 'bg-slate-100 text-slate-600 border-slate-200' },
  bored: { emoji: '😐', color: 'bg-stone-100 text-stone-600 border-stone-200' },
  agitated: { emoji: '😤', color: 'bg-red-100 text-red-600 border-red-200' },
  skeptical: { emoji: '🤨', color: 'bg-zinc-100 text-zinc-600 border-zinc-200' },
  indifferent: { emoji: '😶', color: 'bg-neutral-100 text-neutral-600 border-neutral-200' },
  overwhelmed: { emoji: '😵', color: 'bg-violet-100 text-violet-600 border-violet-200' },
};

interface ObserverFeedback {
  score: number;
  emotions: string[];
  reaction: string;
  attempts: number;
}

interface ExpandedBriefModalProps {
  isOpen: boolean;
  onClose: () => void;
  expandedBrief: string;
  observerFeedback?: ObserverFeedback;
  onSendToDraft?: (content: string) => void;
  onSave?: (content: string) => Promise<void> | void;
}

export const ExpandedBriefModal: React.FC<ExpandedBriefModalProps> = ({
  isOpen,
  onClose,
  expandedBrief,
  observerFeedback,
  onSendToDraft,
  onSave
}) => {
  const [editableContent, setEditableContent] = useState(expandedBrief);
  const [copied, setCopied] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isDirty, setIsDirty] = useState(false);

  useEffect(() => {
    setEditableContent(expandedBrief);
    setIsDirty(false);
    setSaveSuccess(false);
  }, [expandedBrief]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(editableContent);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  const handleSendToDraft = () => {
    if (onSendToDraft) {
      onSendToDraft(editableContent);
      onClose();
    }
  };

  const handleSave = async () => {
    if (!onSave) {
      onClose();
      return;
    }

    try {
      setIsSaving(true);
      await onSave(editableContent);
      setIsDirty(false);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2000);
    } catch (error) {
      console.error('Failed to save expanded brief:', error);
      alert('Failed to save expanded brief. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  // Get score color based on value
  const getScoreColor = (score: number) => {
    if (score >= 8) return 'text-green-600 bg-green-50';
    if (score >= 6) return 'text-amber-600 bg-amber-50';
    return 'text-red-600 bg-red-50';
  };

  return (
    <div className="fixed inset-0 z-[60] overflow-hidden">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative h-full overflow-y-auto flex items-center justify-center p-3 sm:p-4">
        <div className="relative bg-white rounded-xl sm:rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
          {/* Header - Fixed */}
          <div className="sticky top-0 bg-white border-b border-slate-200 z-10 px-3 sm:px-4 md:px-6 py-3 sm:py-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0">
              <div>
                <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-slate-900">Expanded Story Brief</h2>
                <p className="text-xs sm:text-sm text-slate-500 mt-1">
                  Full creative direction for this content piece
                </p>
              </div>
              <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap w-full sm:w-auto">
                <div className="flex items-center gap-1.5 sm:gap-2 flex-1 sm:flex-initial">
                  {onSave && (
                    <Button
                      size="sm"
                      onClick={handleSave}
                      disabled={isSaving || !isDirty}
                      className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm"
                    >
                      {isSaving ? (
                        'Saving...'
                      ) : saveSuccess ? (
                        <>
                          <CheckCircle2 size={12} className="text-green-600 sm:w-3.5 sm:h-3.5" />
                          <span className="hidden sm:inline">Saved</span>
                        </>
                      ) : (
                        'Save'
                      )}
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCopy}
                    className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm"
                  >
                    {copied ? (
                      <>
                        <CheckCircle2 size={12} className="text-green-600 sm:w-3.5 sm:h-3.5" />
                        <span className="hidden sm:inline">Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy size={12} className="sm:w-3.5 sm:h-3.5" />
                        <span className="hidden sm:inline">Copy</span>
                      </>
                    )}
                  </Button>
                </div>
                {onSendToDraft && (
                  <Button
                    size="sm"
                    onClick={handleSendToDraft}
                    className="bg-gradient-to-r from-orange-500 to-pink-500 hover:from-orange-600 hover:to-pink-600 text-white text-xs sm:text-sm"
                  >
                    <span className="hidden sm:inline">Send to Draft</span>
                    <span className="sm:hidden">To Draft</span>
                  </Button>
                )}
                <button
                  onClick={onClose}
                  className="p-1.5 sm:p-2 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  <X size={18} className="sm:w-5 sm:h-5" />
                </button>
              </div>
            </div>
          </div>

          {/* Observer Feedback Section */}
          {observerFeedback && (
            <div className="border-b border-slate-100 px-3 sm:px-4 md:px-6 py-3 bg-gradient-to-r from-slate-50 to-white">
              <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                {/* Client Observer Label */}
                <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500">
                  <Sparkles size={14} className="text-purple-500" />
                  <span>Client Observer</span>
                </div>

                {/* Score Badge */}
                <div className={`px-2 py-0.5 rounded-full text-xs font-bold ${getScoreColor(observerFeedback.score)}`}>
                  {observerFeedback.score}/10
                </div>

                {/* Emotion Pills */}
                <div className="flex flex-wrap gap-1.5">
                  {observerFeedback.emotions.map((emotion, idx) => {
                    const config = EMOTION_CONFIG[emotion] || { emoji: '🎯', color: 'bg-slate-100 text-slate-600 border-slate-200' };
                    return (
                      <span
                        key={idx}
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${config.color}`}
                      >
                        <span>{config.emoji}</span>
                        <span className="capitalize">{emotion}</span>
                      </span>
                    );
                  })}
                </div>

                {/* Attempts indicator if > 1 */}
                {observerFeedback.attempts > 1 && (
                  <div className="flex items-center gap-1 text-xs text-slate-400">
                    <RefreshCw size={12} />
                    <span>{observerFeedback.attempts} iterations</span>
                  </div>
                )}
              </div>

              {/* Reaction text */}
              {observerFeedback.reaction && (
                <p className="mt-2 text-xs sm:text-sm text-slate-600 italic">
                  "{observerFeedback.reaction}"
                </p>
              )}
            </div>
          )}

          {/* Content - Scrollable */}
          <div className="flex-1 overflow-y-auto p-3 sm:p-4 md:p-6">
            <Textarea
              value={editableContent}
              onChange={(e) => {
                setEditableContent(e.target.value);
                setIsDirty(true);
                setSaveSuccess(false);
              }}
              rows={25}
              className="w-full text-sm leading-relaxed font-mono"
              placeholder="Expanded story brief will appear here..."
            />
          </div>
        </div>
      </div>
    </div>
  );
};
