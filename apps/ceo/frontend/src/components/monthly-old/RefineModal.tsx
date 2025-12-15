import React, { useEffect, useState } from 'react';
import { Button } from '../common/Button';
import { Textarea } from '../common/Textarea';
import { aiService } from '../../services/aiService';
import { Star, Wand2, X, Copy, Clock, CheckCircle2, Maximize2 } from 'lucide-react';
import type { Brand, Character, ContentItem } from '../../types';
import type { AIModel } from '../common/AIModelSwitcher';

interface RefineModalProps {
  isOpen: boolean;
  onClose: () => void;
  content: ContentItem | null;
  onContentUpdate: (contentId: string, updates: any) => void;
  brand: Brand;
  characters?: Character[];
  preferredModel?: string;
  canEdit?: boolean;
}

const formatDate = (dateString: string) => {
  if (!dateString) return 'Invalid date';

  // Extract date-only portion if it's an ISO datetime string
  const dateOnly = dateString.split('T')[0];

  // Create date at noon UTC to avoid timezone issues
  const date = new Date(dateOnly + 'T12:00:00Z');

  // Check if date is valid
  if (isNaN(date.getTime())) {
    console.warn('Invalid date:', dateString);
    return dateString;
  }

  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC'
  });
};

const NON_THINKING_MODEL: AIModel = 'claude-haiku-3.5';

// Channel color mapping
const CHANNEL_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  'LinkedIn': { bg: 'bg-blue-500/10', text: 'text-blue-600', border: 'border-blue-400/40' },
  'Instagram': { bg: 'bg-pink-500/10', text: 'text-pink-600', border: 'border-pink-400/40' },
  'Twitter': { bg: 'bg-cyan-500/10', text: 'text-cyan-600', border: 'border-cyan-400/40' },
  'Facebook': { bg: 'bg-indigo-500/10', text: 'text-indigo-600', border: 'border-indigo-400/40' },
  'TikTok': { bg: 'bg-purple-500/10', text: 'text-purple-600', border: 'border-purple-400/40' },
  'YouTube': { bg: 'bg-red-500/10', text: 'text-red-600', border: 'border-red-400/40' },
};

const getChannelColor = (channel: string) => {
  return CHANNEL_COLORS[channel] || { bg: 'bg-slate-500/10', text: 'text-slate-600', border: 'border-slate-400/40' };
};

export const RefineModal: React.FC<RefineModalProps> = ({
  isOpen,
  onClose,
  content,
  onContentUpdate,
  brand,
  characters,
  preferredModel: _preferredModel,
  canEdit = true
}) => {
  const [isExpanding, setIsExpanding] = useState(false);
  const [isIterating, setIsIterating] = useState(false);
  const [userDraft, setUserDraft] = useState('');
  const [iterationNotes, setIterationNotes] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (content) {
      setUserDraft(content.user_revision || '');
      setIterationNotes('');
    }
  }, [content]);

  if (!isOpen || !content) return null;

  const model: AIModel = NON_THINKING_MODEL;
  const baseBrief = content.final_brief || content.expanded_brief || content.brief || '';
  const cast = characters ?? brand.cast_management ?? [];
  const channelColor = getChannelColor(content.channel);

  const handleExpandBrief = async () => {
    if (!content || content.expanded_brief || !canEdit) return;
    setIsExpanding(true);
    try {
      const expandedBrief = await aiService.expandBrief(content, brand, model, undefined, cast);
      onContentUpdate(content.id, { expanded_brief: expandedBrief, final_brief: expandedBrief });
    } catch (error) {
      console.error('Error expanding brief:', error);
    } finally {
      setIsExpanding(false);
    }
  };

  const handleIterate = async () => {
    if (!content || !canEdit) return;
    setIsIterating(true);
    try {
      const iterationInput = userDraft.trim() ? userDraft : baseBrief;
      const refined = await aiService.refineContent(
        brand,
        iterationInput,
        iterationNotes.trim() || 'Refine with the provided edits.',
        content.date,
        cast,
        model
      );
      onContentUpdate(content.id, {
        expanded_brief: refined,
        final_brief: refined,
        user_revision: userDraft.trim() || content.user_revision || '',
        is_perfect: false
      });
      setIterationNotes('');
    } catch (error) {
      console.error('Error refining content:', error);
    } finally {
      setIsIterating(false);
    }
  };

  const handleMarkPerfect = () => {
    if (!canEdit) return;
    onContentUpdate(content.id, {
      is_perfect: !content.is_perfect,
      user_revision: userDraft,
      final_brief: content.final_brief || content.expanded_brief || userDraft || content.brief
    });
  };

  const handleSaveDraft = () => {
    if (!canEdit) return;
    onContentUpdate(content.id, { user_revision: userDraft });
  };

  const handleCopy = async (text: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Disable body scroll when modal is open
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:p-0">
        <div
          className="fixed inset-0 transition-opacity backdrop-blur-lg bg-white/30"
          onClick={onClose}
        />

        <div className="relative inline-block w-full max-w-4xl p-6 my-8 overflow-hidden text-left align-middle transition-all transform bg-white/95 backdrop-blur-xl shadow-2xl rounded-2xl border border-primary-500/20">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <h3 className="text-lg font-semibold text-dark-900 shimmer-text">
                {content.title}
              </h3>
              <div className="flex items-center gap-3">
                <span className={`px-3 py-1 rounded-full text-xs font-medium border ${channelColor.bg} ${channelColor.text} ${channelColor.border}`}>
                  {content.channel}
                </span>
                {content.suggested_posting_time && (
                  <span className="flex items-center gap-1.5 text-xs text-slate-500">
                    <Clock size={14} />
                    {content.suggested_posting_time}
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={handleMarkPerfect}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-200 ${
                  content.is_perfect
                    ? 'bg-green-500/10 text-green-600 border border-green-400/40 hover:bg-green-500/20'
                    : 'glass-effect text-slate-600 hover:bg-white/70 border border-primary-500/20'
                }`}
                disabled={!canEdit}
              >
                <Star size={16} className={content.is_perfect ? 'fill-current' : ''} />
                <span className="text-sm font-medium">{content.is_perfect ? 'Perfect' : 'Mark Perfect'}</span>
              </button>
              <button
                onClick={onClose}
                className="p-1 text-slate-500 hover:text-primary-500 transition-colors rounded-lg hover:bg-white/70"
              >
                <X size={20} />
              </button>
            </div>
          </div>

          {/* Content - Scrollable */}
          <div className="max-h-[calc(100vh-200px)] overflow-y-auto">
            <div className="space-y-6">
              {/* Date Section */}
              <div className="glass-effect p-4 rounded-lg border border-primary-500/30">
                <div className="flex items-center space-x-2">
                  <Clock className="w-5 h-5 text-primary-400" />
                  <p className="text-sm text-primary-600 font-medium">
                    {formatDate(content.date)}
                  </p>
                </div>
              </div>

              {!canEdit && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-400/40 text-amber-700 text-sm">
                  <span>👀 You have view-only access to this calendar.</span>
                </div>
              )}

              {/* AI Brief Section */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-semibold text-dark-900">
                    Content Brief
                  </h2>
                  <div className="flex items-center gap-2">
                    {!content.expanded_brief && (
                      <Button
                        onClick={handleExpandBrief}
                        loading={isExpanding}
                        size="sm"
                        className="flex items-center gap-2 bg-gradient-to-r from-orange-500 to-pink-500 hover:from-orange-600 hover:to-pink-600 text-white border-0"
                        disabled={!canEdit}
                      >
                        <Maximize2 size={14} />
                        Expand Brief
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex items-center gap-2"
                      onClick={() => handleCopy(baseBrief)}
                    >
                      {copied ? (
                        <>
                          <CheckCircle2 size={14} className="text-green-600" />
                          <span>Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy size={14} />
                          <span>Copy</span>
                        </>
                      )}
                    </Button>
                  </div>
                </div>

                <Textarea
                  value={baseBrief || 'No brief generated yet. Click "Expand Brief" to create a detailed content brief.'}
                  readOnly
                  rows={8}
                  className="text-sm bg-white"
                />
              </div>

              {/* Refinement Section */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-semibold text-dark-900">
                    Your Refinement
                  </h2>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleSaveDraft}
                    disabled={!canEdit}
                    className="flex items-center gap-2"
                  >
                    <span>Save Notes</span>
                  </Button>
                </div>

                <Textarea
                  value={userDraft}
                  onChange={(e) => setUserDraft(e.target.value)}
                  placeholder="Paste the brief here and add your edits or final tweaks..."
                  rows={8}
                  disabled={!canEdit}
                  className="text-sm bg-white"
                />
              </div>

              {/* AI Iteration Section */}
              <div className="space-y-3 p-5 rounded-xl glass-effect border border-primary-500/30 bg-gradient-to-br from-orange-50/50 to-pink-50/50">
                <h2 className="text-sm font-semibold text-dark-900 flex items-center gap-2">
                  <Wand2 size={18} className="text-orange-500" />
                  Ask Andora to Refine
                </h2>

                <Textarea
                  value={iterationNotes}
                  onChange={(e) => setIterationNotes(e.target.value)}
                  placeholder="Give Andora extra direction (e.g., 'Make it more casual', 'Add a stronger CTA', 'Focus on benefits')..."
                  rows={4}
                  disabled={!canEdit}
                  className="bg-white text-sm"
                />

                <Button
                  onClick={handleIterate}
                  loading={isIterating}
                  disabled={!canEdit || (!iterationNotes.trim() && !userDraft.trim())}
                  className="flex items-center gap-2 bg-gradient-to-r from-orange-500 to-pink-500 hover:from-orange-600 hover:to-pink-600 text-white border-0"
                >
                  <Wand2 size={16} />
                  {isIterating ? 'Andora is refining...' : 'Ask AI to Refine'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
