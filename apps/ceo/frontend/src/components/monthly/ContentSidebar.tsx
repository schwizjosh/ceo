import React, { useState, useEffect, useRef, lazy, Suspense } from 'react';
import { Brand, ContentItem, Character, TeamMember, Event } from '../../types';
import { X, Star, Wand2, Maximize2, Copy, CheckCircle2, Clock, Send, Save, RefreshCw, ChevronLeft, ChevronRight, Undo2, Redo2, Maximize, Minimize, Type } from 'lucide-react';
import { Button } from '../common/Button';
import { Textarea } from '../common/Textarea';
import { aiService } from '../../services/aiService';
import { apiClient } from '../../lib/api';
import { ExpandedBriefModal } from './ExpandedBriefModal';
import { AIModelSwitcher } from '../common/AIModelSwitcher';
import { useAuth } from '../../hooks/useAuth';

// Lazy load the heavy ReactQuill editor to reduce initial bundle size
// Note: Quill CSS is imported globally in index.css
const ReactQuill = lazy(() => import('react-quill'));

// Channel color mapping
const CHANNEL_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  'LinkedIn': { bg: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-300' },
  'Instagram': { bg: 'bg-pink-100', text: 'text-pink-700', border: 'border-pink-300' },
  'X': { bg: 'bg-cyan-100', text: 'text-cyan-700', border: 'border-cyan-300' },
  'Facebook': { bg: 'bg-indigo-100', text: 'text-indigo-700', border: 'border-indigo-300' },
  'TikTok': { bg: 'bg-purple-100', text: 'text-purple-700', border: 'border-purple-300' },
  'YouTube': { bg: 'bg-red-100', text: 'text-red-700', border: 'border-red-300' },
  'Blog': { bg: 'bg-green-100', text: 'text-green-700', border: 'border-green-300' },
  'Email': { bg: 'bg-amber-100', text: 'text-amber-700', border: 'border-amber-300' },
};

const getChannelColor = (channel: string) => {
  return CHANNEL_COLORS[channel] || {
    bg: 'bg-slate-100',
    text: 'text-slate-700',
    border: 'border-slate-300'
  };
};

interface ContentSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  content: ContentItem | null;
  allContentForDay?: ContentItem[]; // All content items for the same date
  allContent?: ContentItem[]; // ← NEW: All content items for the month (for day navigation)
  brand: Brand;
  onContentUpdate: (contentId: string, updates: Partial<ContentItem>) => void;
  onRegenerate?: (contentId: string) => void;
  preferredModel?: string;
  canEdit?: boolean;
  events?: Event[];
  monthTheme?: string;
  weekFocus?: string;
  showNotification?: (message: string, model?: string) => void;
  hideNotification?: () => void;
}

export const ContentSidebar: React.FC<ContentSidebarProps> = ({
  isOpen,
  onClose,
  content,
  allContentForDay = [],
  allContent = [], // ← NEW: All content for month
  brand,
  onContentUpdate,
  onRegenerate,
  preferredModel = 'claude-haiku-3.5',
  canEdit = true,
  events = [],
  monthTheme,
  weekFocus,
  showNotification,
  hideNotification
}) => {
  const [currentContent, setCurrentContent] = useState<ContentItem | null>(content);
  const [draft, setDraft] = useState('');
  const [draftHistory, setDraftHistory] = useState<string[]>([]);
  const [redoHistory, setRedoHistory] = useState<string[]>([]);
  const [refineNotes, setRefineNotes] = useState('');
  const [isExpanding, setIsExpanding] = useState(false);
  const [isRefining, setIsRefining] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [copiedOriginal, setCopiedOriginal] = useState(false);
  const [showTeamSelector, setShowTeamSelector] = useState(false);
  const [showExpandedBrief, setShowExpandedBrief] = useState(false);
  const [selectedTeamMembers, setSelectedTeamMembers] = useState<string[]>([]);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [useRichText, setUseRichText] = useState(true);
  const [expandModel, setExpandModel] = useState(preferredModel);
  const [autoSaveStatus, setAutoSaveStatus] = useState<'saved' | 'saving' | 'unsaved'>('saved');
  const [selectedAudienceIndex, setSelectedAudienceIndex] = useState(0);
  const [observerFeedback, setObserverFeedback] = useState<any>(null);
  const [showPerfectWarning, setShowPerfectWarning] = useState(false);
  const quillRef = useRef<any>(null);
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Get user auth to check plan
  const { authUser: user } = useAuth();
  const isFreeUser = !user?.plan || user.plan === 'free';

  // Parse audiences from brand.buyer_profile
  const audiences = (() => {
    try {
      const parsed = JSON.parse(brand.buyer_profile || '[]');
      return Array.isArray(parsed) && parsed.length > 0 ? parsed : [{ name: 'Primary Audience', profile: brand.buyer_profile || '' }];
    } catch {
      return [{ name: 'Primary Audience', profile: brand.buyer_profile || '' }];
    }
  })();

  const selectedAudience = audiences[selectedAudienceIndex] || audiences[0];

  // Reset state when content changes
  useEffect(() => {
    if (content) {
      setCurrentContent(content);
      setDraft(content.user_revision || '');
      setRefineNotes('');
      setSelectedTeamMembers([]);
    }
  }, [content]);

  // Debug logging
  useEffect(() => {
    console.log('ContentSidebar Debug State:', {
      canEdit,
      isExpanding,
      isRefining,
      streaming: currentContent?._streaming,
      hasDraft: !!draft,
      hasRefineNotes: !!refineNotes.trim(),
      modalOpen: isOpen
    });
  }, [canEdit, isExpanding, isRefining, currentContent?._streaming, draft, refineNotes, isOpen]);

  // Update draft when currentContent changes (navigation)
  useEffect(() => {
    if (currentContent) {
      setDraft(currentContent.user_revision || '');
      setRefineNotes('');
      setCopied(false);
      setCopiedOriginal(false);
      setObserverFeedback(null); // Reset observer feedback on content change
    }
  }, [currentContent?.id]);

  // Navigation between channels (within same day)
  const currentIndex = allContentForDay.findIndex(item => item.id === currentContent?.id);
  const hasPrevious = currentIndex > 0;
  const hasNext = currentIndex < allContentForDay.length - 1;

  const handleNavigate = (direction: 'prev' | 'next') => {
    if (direction === 'prev' && hasPrevious) {
      setCurrentContent(allContentForDay[currentIndex - 1]);
    } else if (direction === 'next' && hasNext) {
      setCurrentContent(allContentForDay[currentIndex + 1]);
    }
  };

  // Day navigation (across all days)
  const sortedContent = allContent ? [...allContent].sort((a, b) => a.date.localeCompare(b.date)) : [];
  const currentDayIndex = sortedContent.findIndex(item => item.id === currentContent?.id);
  const currentDate = currentContent?.date;
  const uniqueDates = sortedContent.length > 0 ? [...new Set(sortedContent.map(item => item.date))].sort() : [];
  const allDates = uniqueDates; // Alias for compatibility
  const currentDateIndex = uniqueDates.findIndex(date => date === currentDate);
  const hasPreviousDay = currentDateIndex > 0;
  const hasNextDay = currentDateIndex < uniqueDates.length - 1;

  const handleDayNavigate = (direction: 'prev' | 'next') => {
    if (direction === 'prev' && hasPreviousDay) {
      const prevDate = uniqueDates[currentDateIndex - 1];
      const firstItemOfPrevDay = sortedContent.find(item => item.date === prevDate);
      if (firstItemOfPrevDay) setCurrentContent(firstItemOfPrevDay);
    } else if (direction === 'next' && hasNextDay) {
      const nextDate = uniqueDates[currentDateIndex + 1];
      const firstItemOfNextDay = sortedContent.find(item => item.date === nextDate);
      if (firstItemOfNextDay) setCurrentContent(firstItemOfNextDay);
    }
  };

  // Draft history management
  const saveDraftToHistory = (newDraft: string) => {
    if (newDraft !== draft) {
      setDraftHistory(prev => [...prev.slice(-19), draft]); // Keep last 20 versions
      setRedoHistory([]); // Clear redo history when new change is made
      setDraft(newDraft);
    }
  };

  const handleUndo = () => {
    if (draftHistory.length > 0) {
      const previous = draftHistory[draftHistory.length - 1];
      setRedoHistory(prev => [...prev, draft]); // Save current to redo
      setDraft(previous);
      setDraftHistory(prev => prev.slice(0, -1));
    }
  };

  const handleRedo = () => {
    if (redoHistory.length > 0) {
      const next = redoHistory[redoHistory.length - 1];
      setDraftHistory(prev => [...prev, draft]); // Save current to undo
      setDraft(next);
      setRedoHistory(prev => prev.slice(0, -1));
    }
  };

  // Update currentContent when it's updated via onContentUpdate
  useEffect(() => {
    if (currentContent) {
      const updated = allContentForDay.find(item => item.id === currentContent.id);
      if (updated) {
        setCurrentContent(updated);
      }
    }
  }, [allContentForDay, currentContent?.id]);

  // Auto-save functionality with debounce
  useEffect(() => {
    if (!canEdit || !currentContent) return;

    // Clear existing timer
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }

    // Mark as unsaved when draft changes
    if (draft !== (currentContent.user_revision || '')) {
      setAutoSaveStatus('unsaved');

      // Auto-save after 2 seconds of inactivity
      autoSaveTimerRef.current = setTimeout(() => {
        setAutoSaveStatus('saving');
        onContentUpdate(currentContent.id, { user_revision: draft });
        setTimeout(() => setAutoSaveStatus('saved'), 500);
      }, 2000);
    }

    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
    };
  }, [draft, currentContent, canEdit, onContentUpdate]);

  if (!isOpen || !currentContent) return null;

  const baseBrief = currentContent.final_brief || currentContent.expanded_brief || currentContent.brief || '';
  const cast = Array.isArray(brand.cast_management) ? brand.cast_management : [];
  const channelColor = getChannelColor(currentContent.channel);
  const teamMembers = Array.isArray(brand.team_members) ? brand.team_members : [];

  // Format date
  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr + 'T12:00:00Z');
      return date.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        timeZone: 'UTC'
      });
    } catch {
      return dateStr;
    }
  };

  // Expand brief
  const handleExpand = async () => {
    console.log('🔵 handleExpand clicked!', { canEdit, streaming: currentContent?._streaming });
    if (!currentContent || !canEdit || currentContent._streaming) return;

    setIsExpanding(true);
    showNotification?.('Expanding brief into rich creative concept...', expandModel);

    try {
      // Include existing draft content as additional context/prompt
      const userPrompt = draft.trim() ? draft.trim() : undefined;

      // Use selected audience profile for context
      const targetAudience = selectedAudience.profile || brand.buyer_profile;

      const result = await aiService.expandBrief(
        currentContent,
        { ...brand, buyer_profile: targetAudience }, // Override with selected audience
        expandModel,
        userPrompt, // Pass draft content as prompt
        cast,
        weekFocus
      );

      // Extract expanded brief and observer feedback
      const expandedBrief = result.expandedBrief;
      const feedback = result.observerFeedback;

      // Store observer feedback in state
      if (feedback) {
        setObserverFeedback(feedback);
        console.log('✨ Client Observer Feedback:', feedback);
      }

      // Convert expanded object to formatted string if it's an object
      let expandedText = expandedBrief;
      if (typeof expandedBrief === 'object' && expandedBrief !== null) {
        expandedText = formatExpandedBrief(expandedBrief);
      }

      // Write expanded brief into draft field with history
      saveDraftToHistory(expandedText);

      // Also save to content item
      onContentUpdate(currentContent.id, {
        expanded_brief: expandedText,
        final_brief: expandedText,
        user_revision: expandedText
      });

      // Auto-enable rich text mode when expansion completes
      setUseRichText(true);
    } catch (error) {
      console.error('Failed to expand:', error);
      alert('Failed to expand brief. Please try again.');
    } finally {
      setIsExpanding(false);
      hideNotification?.();
    }
  };

  // Copy Original Idea to clipboard
  const handleCopyOriginal = async () => {
    if (!currentContent) return;

    const originalIdea = `
🎣 HOOK
${currentContent.story_hook || 'N/A'}

📋 DIRECTIVES
${currentContent.directives || 'N/A'}

🎭 CHARACTER
${currentContent.character_focus || 'N/A'}

🎬 MEDIA TYPE
${currentContent.media_type || 'N/A'}

🎨 TONE
${currentContent.tone || 'N/A'}

🎯 CALL TO ACTION
${currentContent.call_to_action || 'N/A'}
    `.trim();

    try {
      await navigator.clipboard.writeText(originalIdea);
      setCopiedOriginal(true);
      setTimeout(() => setCopiedOriginal(false), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  // Helper to format expanded brief object to readable HTML for rich text editor
  const formatExpandedBrief = (brief: any): string => {
    if (typeof brief === 'string') {
      return brief;
    }

    const sections = [
      { key: 'day', title: '📅 Day' },
      { key: 'channel', title: '📢 Channel' },
      { key: 'storyHook', title: '🎣 Story Hook & Content Idea' },
      { key: 'hook', title: '🎣 Story Hook' },
      { key: 'characterFocus', title: '🎭 Character Focus' },
      { key: 'character_focus', title: '🎭 Character Focus' },
      { key: 'emotionalBeat', title: '💫 Emotional Beat' },
      { key: 'emotional_beat', title: '💫 Emotional Beat' },
      { key: 'narrativePurpose', title: '📖 Narrative Purpose' },
      { key: 'narrative_purpose', title: '📖 Narrative Purpose' },
      { key: 'mediaType', title: '🎬 Media Type' },
      { key: 'media_type', title: '🎬 Media Type' },
      { key: 'callToAction', title: '🎯 Call To Action' },
      { key: 'call_to_action', title: '🎯 Call To Action' },
      { key: 'cta', title: '🎯 Call To Action' },
      { key: 'directives', title: '📋 Content Directives' },
      { key: 'brief', title: '📝 Creative Brief' },
      { key: 'keyMessage', title: '💡 Key Message' },
      { key: 'contentStructure', title: '📋 Content Structure' },
      { key: 'successMetrics', title: '✨ Success Metrics' }
    ];

    const formattedSections = sections
      .filter(section => {
        const value = brief[section.key];
        // Skip if value is undefined, null, or an object (prevent React error)
        return value && (typeof value === 'string' || typeof value === 'number');
      })
      .map(section => {
        const value = String(brief[section.key]);
        // Convert newlines in the value to <br> tags for proper display
        const formattedValue = value.replace(/\n/g, '<br>');
        return `<h3><strong>${section.title}</strong></h3><p>${formattedValue}</p>`;
      })
      .join('');

    return formattedSections;
  };

  // Review - Andora contextualizes the prompt in refineNotes with the original brief
  const handleRefine = async () => {
    console.log('✨ handleRefine (Review) clicked!', { canEdit, streaming: currentContent?._streaming, notes: refineNotes });
    if (!currentContent || !canEdit || !refineNotes.trim() || currentContent._streaming) return;

    setIsRefining(true);
    try {
      // Build context from original idea
      const originalIdea = `
ORIGINAL IDEA:
Hook: ${currentContent.story_hook || 'N/A'}
Directives: ${currentContent.directives || 'N/A'}
Character: ${currentContent.character_focus || 'N/A'}
Media Type: ${currentContent.media_type || 'N/A'}
CTA: ${currentContent.call_to_action || 'N/A'}
      `.trim();

      // Use ONLY the review notes (refineNotes), NOT the draft content
      // Andora will contextualize these notes with the original brief
      const userReviewNotes = refineNotes.trim();

      // Use selected audience profile for context
      const targetAudience = selectedAudience.profile || brand.buyer_profile;

      const refined = await aiService.refineContent(
        { ...brand, buyer_profile: targetAudience }, // Override with selected audience
        originalIdea,
        userReviewNotes,
        currentContent.date,
        cast,
        expandModel
      );

      // Write refined content into draft field with history
      saveDraftToHistory(refined);

      onContentUpdate(currentContent.id, {
        expanded_brief: refined,
        final_brief: refined,
        user_revision: refined,
        is_perfect: false
      });

      setRefineNotes('');
    } catch (error) {
      console.error('Failed to refine:', error);
      alert('Failed to refine content. Please try again.');
    } finally {
      setIsRefining(false);
    }
  };

  // Mark as perfect
  const handleMarkPerfect = () => {
    console.log('⭐ handleMarkPerfect clicked!', { canEdit, streaming: currentContent?._streaming, draft });
    if (!canEdit || currentContent._streaming) return;

    // Immediately update local state for instant UI feedback
    const newPerfectState = !currentContent.is_perfect;
    setCurrentContent(prev => prev ? { ...prev, is_perfect: newPerfectState } : null);

    // Then update parent
    onContentUpdate(currentContent.id, {
      is_perfect: newPerfectState,
      user_revision: draft,
      final_brief: draft || currentContent.final_brief || currentContent.expanded_brief || currentContent.brief
    });
  };

  // Save draft
  const handleSaveDraft = () => {
    if (!canEdit || currentContent._streaming) return;
    onContentUpdate(currentContent.id, { user_revision: draft });
  };

  // Copy to clipboard
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(baseBrief);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  // Regenerate entire content
  const handleRegenerate = async () => {
    if (!currentContent || !canEdit || !onRegenerate) return;

    setIsRegenerating(true);
    try {
      await onRegenerate(currentContent.id);
    } catch (error) {
      console.error('Failed to regenerate:', error);
      alert('Failed to regenerate content. Please try again.');
    } finally {
      setIsRegenerating(false);
    }
  };

  // Send brief to team
  const handleSendBrief = () => {
    if (teamMembers.length === 0) {
      alert('No team members found. Add team members in Settings.');
      return;
    }
    setShowTeamSelector(true);
  };

  const handleConfirmSendBrief = async () => {
    if (!currentContent) return;

    if (selectedTeamMembers.length === 0) {
      alert('Please select at least one team member.');
      return;
    }

    try {
      showNotification?.('Sending brief via email...', preferredModel);

      // Get emails from selected team member IDs
      const selectedEmails = teamMembers
        .filter(member => selectedTeamMembers.includes(member.id))
        .map(member => member.email);

      if (selectedEmails.length === 0) {
        throw new Error('No valid email addresses found');
      }

      // Prepare content data
      const contentData = {
        title: currentContent.title,
        channel: currentContent.channel,
        date: currentContent.date,
        storyHook: currentContent.story_hook,
        characterFocus: currentContent.character_focus,
        emotionalBeat: currentContent.emotional_beat,
        narrativePurpose: currentContent.narrative_purpose,
        mediaType: currentContent.media_type,
        callToAction: currentContent.call_to_action,
        brief: draft || currentContent.expanded_brief || currentContent.brief || '',
        suggestedTime: currentContent.suggested_posting_time,
      };

      // Send emails directly (not IDs) since team_members table doesn't exist
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/email/send-brief`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
        },
        body: JSON.stringify({
          teamMemberEmails: selectedEmails, // Use emails directly, not IDs
          contentData,
          brandName: brand.brand_name
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to send email');
      }

      hideNotification?.();
      alert(`✅ Brief sent to ${selectedEmails.length} team member(s)!`);
      setShowTeamSelector(false);
      setSelectedTeamMembers([]);
    } catch (error) {
      console.error('Failed to send brief:', error);
      hideNotification?.();
      alert(`❌ Failed to send brief: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  // Send expanded brief to draft field
  const handleSendExpandedToDraft = (expandedContent: string) => {
    setDraft(expandedContent);
  };

  return (
    <div className={`fixed inset-y-0 right-0 z-50 w-full max-w-2xl bg-white shadow-2xl transform transition-transform duration-300 ease-in-out ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}>
      <div className="flex flex-col h-full">
        {/* Header - Sticky */}
        <div className="sticky top-0 bg-white/95 backdrop-blur-lg border-b border-slate-200 z-20 shadow-sm flex-shrink-0">
            <div className="max-w-5xl mx-auto px-3 sm:px-4 md:px-6 py-3 sm:py-4">
              {/* Breadcrumb Trail */}
              <div className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm text-slate-600 mb-2 sm:mb-3 overflow-x-auto">
                <span className="hover:text-slate-900 cursor-default">Content Calendar</span>
                <ChevronRight size={14} className="text-slate-400" />
                <span className="hover:text-slate-900 cursor-default">
                  {new Date(currentContent.date + 'T12:00:00Z').toLocaleDateString('en-US', {
                    month: 'long',
                    year: 'numeric',
                    timeZone: 'UTC'
                  })}
                </span>
                <ChevronRight size={14} className="text-slate-400" />
                <span className="hover:text-slate-900 cursor-default">
                  {new Date(currentContent.date + 'T12:00:00Z').toLocaleDateString('en-US', {
                    weekday: 'long',
                    day: 'numeric',
                    timeZone: 'UTC'
                  })}
                </span>
                <ChevronRight size={14} className="text-slate-400" />
                <span className={`px-2 py-0.5 rounded-full text-xs font-semibold border ${channelColor.bg} ${channelColor.text} ${channelColor.border}`}>
                  {currentContent.channel}
                </span>
              </div>

              {/* Consolidated Navigation Bar */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 sm:gap-4 p-2 sm:p-3 bg-slate-50 rounded-lg mb-2 sm:mb-3">
                {/* Day Navigation */}
                {allContent && allContent.length > 0 && allDates && allDates.length > 1 && (
                  <div className="flex items-center justify-center gap-2">
                    <button
                      onClick={() => handleDayNavigate('prev')}
                      disabled={!hasPreviousDay}
                      className={`flex items-center gap-1 px-2 sm:px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-colors ${hasPreviousDay
                          ? 'hover:bg-white text-slate-700 shadow-sm'
                          : 'text-slate-300 cursor-not-allowed'
                        }`}
                      title="Previous day"
                    >
                      <ChevronLeft size={14} className="sm:w-4 sm:h-4" />
                      <span className="hidden md:inline">Prev Day</span>
                      <span className="md:hidden">Prev</span>
                    </button>
                    <span className="text-[10px] sm:text-xs font-medium text-slate-600 px-1 sm:px-2 whitespace-nowrap">
                      Day {currentDateIndex + 1}/{allDates.length}
                    </span>
                    <button
                      onClick={() => handleDayNavigate('next')}
                      disabled={!hasNextDay}
                      className={`flex items-center gap-1 px-2 sm:px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-colors ${hasNextDay
                          ? 'hover:bg-white text-slate-700 shadow-sm'
                          : 'text-slate-300 cursor-not-allowed'
                        }`}
                      title="Next day"
                    >
                      <span className="hidden md:inline">Next Day</span>
                      <span className="md:hidden">Next</span>
                      <ChevronRight size={14} className="sm:w-4 sm:h-4" />
                    </button>
                  </div>
                )}

                {/* Channel Navigation (only show if multiple channels) */}
                {allContentForDay && allContentForDay.length > 1 && (
                  <div className="flex items-center justify-center gap-2 sm:border-l border-slate-200 sm:pl-4">
                    <button
                      onClick={() => handleNavigate('prev')}
                      disabled={!hasPrevious}
                      className={`p-1.5 sm:p-2 rounded-lg transition-colors ${hasPrevious
                          ? 'hover:bg-white text-slate-700 shadow-sm'
                          : 'text-slate-300 cursor-not-allowed'
                        }`}
                      title="Previous channel"
                    >
                      <ChevronLeft size={16} className="sm:w-[18px] sm:h-[18px]" />
                    </button>
                    <span className="text-[10px] sm:text-xs font-medium text-slate-600 px-1 sm:px-2 whitespace-nowrap">
                      {currentIndex + 1}/{allContentForDay.length}
                    </span>
                    <button
                      onClick={() => handleNavigate('next')}
                      disabled={!hasNext}
                      className={`p-1.5 sm:p-2 rounded-lg transition-colors ${hasNext
                          ? 'hover:bg-white text-slate-700 shadow-sm'
                          : 'text-slate-300 cursor-not-allowed'
                        }`}
                      title="Next channel"
                    >
                      <ChevronRight size={16} className="sm:w-[18px] sm:h-[18px]" />
                    </button>
                  </div>
                )}
              </div>

              {/* Title and Actions Row */}
              <div className="flex flex-col sm:flex-row items-start justify-between gap-3 sm:gap-4">
                <div className="flex-1 min-w-0 w-full sm:w-auto">
                  <div className="flex items-center gap-2 sm:gap-3 mb-1 sm:mb-2">
                    {currentContent.suggested_posting_time && (
                      <span className="flex items-center gap-1 sm:gap-1.5 text-[10px] sm:text-xs text-slate-500">
                        <Clock size={12} className="sm:w-3.5 sm:h-3.5" />
                        {currentContent.suggested_posting_time}
                      </span>
                    )}
                  </div>
                  <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-slate-900 mb-1">
                    {currentContent.title}
                  </h1>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0 flex-wrap w-full sm:w-auto justify-end">
                  {/* AI Model Switcher - Hidden for free users */}
                  {!isFreeUser && (
                    <div className="flex items-center gap-2">
                      <AIModelSwitcher
                        value={expandModel as any}
                        onChange={(model) => setExpandModel(model)}
                        className="text-xs"
                      />
                    </div>
                  )}

                  {/* Audience Switcher (only show if multiple audiences) */}
                  {audiences.length > 1 && (
                    <div className="flex items-center gap-2">
                      <select
                        value={selectedAudienceIndex}
                        onChange={(e) => setSelectedAudienceIndex(Number(e.target.value))}
                        className="text-xs px-2 py-1.5 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                        title="Select target audience"
                      >
                        {audiences.map((aud: any, idx: number) => (
                          <option key={idx} value={idx}>
                            {aud.name || `Audience ${idx + 1}`}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                  {canEdit && onRegenerate && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleRegenerate}
                      loading={isRegenerating}
                      disabled={isRegenerating}
                      className="flex items-center gap-1 sm:gap-2 text-orange-600 hover:text-orange-700 hover:bg-orange-50 text-xs sm:text-sm"
                      title={audiences.length > 1 ? `Regenerate original idea for ${selectedAudience.name} using ${expandModel}` : `Regenerate original idea using ${expandModel}`}
                    >
                      <RefreshCw size={14} className={isRegenerating ? 'animate-spin' : ''} />
                      <span className="hidden sm:inline">Regenerate Idea</span>
                      <span className="sm:hidden">Regen</span>
                    </Button>
                  )}
                  {canEdit && teamMembers.length > 0 && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleSendBrief}
                      className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm"
                    >
                      <Send size={14} />
                      <span className="hidden sm:inline">Send</span>
                    </Button>
                  )}
                  <Button
                    variant={currentContent.is_perfect ? 'default' : 'outline'}
                    size="sm"
                    onClick={handleMarkPerfect}
                    disabled={!canEdit || currentContent._streaming}
                    className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm"
                  >
                    <Star size={14} className={currentContent.is_perfect ? 'fill-current' : ''} />
                    <span className="hidden sm:inline">{currentContent.is_perfect ? 'Perfect' : 'Mark Perfect'}</span>
                    <span className="sm:hidden">★</span>
                  </Button>
                  <button
                    onClick={onClose}
                    className="p-1.5 sm:p-2 hover:bg-slate-100 rounded-lg transition-colors"
                  >
                    <X size={18} className="sm:w-5 sm:h-5" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-5xl mx-auto px-3 sm:px-4 md:px-6 py-4 sm:py-6 md:py-8 space-y-4 sm:space-y-6 md:space-y-8">
            {!canEdit && (
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg text-amber-800">
                👀 View-only access
              </div>
            )}

            {/* Original Idea - Consolidated Card */}
            {(currentContent.story_hook || currentContent.character_focus || currentContent.directives || currentContent.media_type || currentContent.call_to_action) && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-bold text-slate-900">💡 Original Idea</h2>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCopyOriginal}
                    className="flex items-center gap-2"
                  >
                    {copiedOriginal ? (
                      <>
                        <CheckCircle2 size={14} className="text-green-600" />
                        Copied
                      </>
                    ) : (
                      <>
                        <Copy size={14} />
                        Copy
                      </>
                    )}
                  </Button>
                </div>

                <div className="p-6 bg-gradient-to-br from-orange-50 via-pink-50 to-purple-50 border-2 border-orange-200 rounded-2xl space-y-4">
                  {currentContent.story_hook && (
                    <div>
                      <h3 className="text-sm font-semibold text-slate-700 mb-1.5">🎣 Hook</h3>
                      <p className="text-sm text-slate-700 leading-relaxed">{currentContent.story_hook}</p>
                    </div>
                  )}

                  {currentContent.directives && (
                    <div>
                      <h3 className="text-sm font-semibold text-slate-700 mb-1.5">📋 Directives</h3>
                      <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">{currentContent.directives}</p>
                    </div>
                  )}

                  <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 md:gap-4 pt-2 border-t border-orange-200/50">
                    {currentContent.character_focus && (
                      <div>
                        <h3 className="text-xs font-semibold text-slate-600 mb-1">🎭 Character</h3>
                        <p className="text-sm text-slate-700">{currentContent.character_focus}</p>
                      </div>
                    )}

                    {currentContent.media_type && (
                      <div>
                        <h3 className="text-xs font-semibold text-slate-600 mb-1">🎬 Media Type</h3>
                        <p className="text-sm text-slate-700 font-medium uppercase tracking-wide">{currentContent.media_type}</p>
                      </div>
                    )}

                    {currentContent.tone && (
                      <div>
                        <h3 className="text-xs font-semibold text-slate-600 mb-1">🎨 Tone</h3>
                        <p className="text-sm text-slate-700 font-medium">{currentContent.tone}</p>
                      </div>
                    )}

                    {currentContent.call_to_action && (
                      <div>
                        <h3 className="text-xs font-semibold text-slate-600 mb-1">🎯 CTA</h3>
                        <p className="text-sm text-slate-700">{currentContent.call_to_action}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Draft & Refinement */}
            <div className="space-y-4">
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-bold text-slate-900">Full Creative Execution</h2>
                  {!isFreeUser && (
                    <AIModelSwitcher
                      value={expandModel}
                      onChange={setExpandModel}
                    />
                  )}
                </div>
                <div className="flex items-center gap-1 sm:gap-2 flex-wrap">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsFullscreen(!isFullscreen)}
                    className="flex items-center gap-2"
                    title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
                  >
                    {isFullscreen ? <Minimize size={14} /> : <Maximize size={14} />}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setUseRichText(!useRichText)}
                    disabled={!canEdit}
                    className="flex items-center gap-2"
                    title="Toggle Rich Text Editor"
                  >
                    <Type size={14} />
                    {useRichText ? 'Plain' : 'Rich'}
                  </Button>
                  {!currentContent.expanded_brief && !currentContent.final_brief ? (
                    <Button
                      size="sm"
                      onClick={handleExpand}
                      loading={isExpanding}
                      disabled={!canEdit || currentContent._streaming}
                      className="flex items-center gap-2 bg-gradient-to-r from-orange-500 to-pink-500 hover:from-orange-600 hover:to-pink-600 text-white"
                      title={`Expand brief into full content using ${expandModel}`}
                    >
                      <Maximize2 size={14} />
                      Expand Brief
                    </Button>
                  ) : null}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleUndo}
                    disabled={!canEdit || draftHistory.length === 0}
                    className="flex items-center gap-2"
                    title="Undo"
                  >
                    <Undo2 size={14} />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleRedo}
                    disabled={!canEdit || redoHistory.length === 0}
                    className="flex items-center gap-2"
                    title="Redo"
                  >
                    <Redo2 size={14} />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={async () => {
                      if (draft) {
                        // Strip HTML tags for plain text copy
                        const tempDiv = document.createElement('div');
                        tempDiv.innerHTML = draft;
                        const plainText = tempDiv.textContent || tempDiv.innerText || draft;
                        await navigator.clipboard.writeText(plainText);
                        setCopied(true);
                        setTimeout(() => setCopied(false), 2000);
                      }
                    }}
                    disabled={!draft}
                    className="flex items-center gap-2"
                  >
                    {copied ? <CheckCircle2 size={14} className="text-green-600" /> : <Copy size={14} />}
                    {copied ? 'Copied!' : 'Copy'}
                  </Button>
                  {(currentContent.expanded_brief || currentContent.final_brief) && (
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={handleExpand}
                      loading={isExpanding}
                      disabled={!canEdit || currentContent._streaming}
                      className="flex items-center gap-2 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white"
                      title={`Regenerate expanded brief using ${expandModel}`}
                    >
                      <RefreshCw size={14} className={isExpanding ? 'animate-spin' : ''} />
                      Regenerate Expansion
                    </Button>
                  )}
                </div>
              </div>

              {useRichText ? (
                <div className={`${isFullscreen ? 'fixed inset-0 z-[90] bg-white flex flex-col overflow-hidden' : ''}`}> 
                  {isFullscreen && (
                    <div className="flex items-center justify-between gap-3 px-8 py-4 border-b border-slate-200 bg-white flex-shrink-0">
                      <div className="flex items-center gap-3">
                        <h3 className="text-lg font-semibold text-slate-900">Full Creative Execution</h3>
                        <span className={`text-xs px-2 py-1 rounded-full ${autoSaveStatus === 'saved' ? 'bg-green-100 text-green-700' :
                            autoSaveStatus === 'saving' ? 'bg-blue-100 text-blue-700' :
                              'bg-amber-100 text-amber-700'
                          }`}>
                          {autoSaveStatus === 'saved' ? '✓ Saved' :
                            autoSaveStatus === 'saving' ? '⏳ Saving...' :
                              '⚠ Unsaved'}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        {canEdit && teamMembers.length > 0 && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={handleSendBrief}
                            className="flex items-center gap-2"
                          >
                            <Send size={14} />
                            Send Brief
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setIsFullscreen(false)}
                          className="flex items-center gap-2"
                        >
                          <Minimize size={14} />
                          Exit Fullscreen
                        </Button>
                      </div>
                    </div>
                  )}
                  <div className={`${isFullscreen ? 'flex-1 overflow-y-auto px-8 py-6' : ''}`}> 
                    <div className={`${isFullscreen ? 'max-w-4xl mx-auto' : ''}`}> 
                      <Suspense fallback={
                        <div className="min-h-[300px] flex items-center justify-center bg-gray-50 rounded-lg border border-gray-200">
                          <div className="text-center">
                            <div className="w-6 h-6 border-2 border-primary-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                            <p className="text-sm text-gray-500">Loading editor...</p>
                          </div>
                        </div>
                      }>
                        <ReactQuill
                          ref={quillRef}
                          value={draft}
                          onChange={(value) => {
                            if (currentContent.is_perfect) {
                              setShowPerfectWarning(true);
                            } else {
                              saveDraftToHistory(value);
                            }
                          }}
                          readOnly={!canEdit || currentContent._streaming}
                          theme="snow"
                          className={`${isFullscreen ? 'h-auto' : 'min-h-[300px]'}`}
                          placeholder="Click 'Expand Brief' to generate the full script/article/copy, or type your own content here..."
                          modules={{
                            toolbar: [
                              [{ 'header': [1, 2, 3, false] }],
                              ['bold', 'italic', 'underline', 'strike'],
                              [{ 'list': 'ordered' }, { 'list': 'bullet' }],
                              [{ 'align': [] }],
                              ['link', 'blockquote', 'code-block'],
                              ['clean']
                            ]
                          }}
                        />
                      </Suspense>
                    </div>
                  </div>
                </div>
              ) : (
                <div className={`${isFullscreen ? 'fixed inset-0 z-[90] bg-white flex flex-col overflow-hidden' : ''}`}> 
                  {isFullscreen && (
                    <div className="flex items-center justify-between gap-3 px-8 py-4 border-b border-slate-200 bg-white flex-shrink-0">
                      <div className="flex items-center gap-3">
                        <h3 className="text-lg font-semibold text-slate-900">Full Creative Execution</h3>
                        <span className={`text-xs px-2 py-1 rounded-full ${autoSaveStatus === 'saved' ? 'bg-green-100 text-green-700' :
                            autoSaveStatus === 'saving' ? 'bg-blue-100 text-blue-700' :
                              'bg-amber-100 text-amber-700'
                          }`}>
                          {autoSaveStatus === 'saved' ? '✓ Saved' :
                            autoSaveStatus === 'saving' ? '⏳ Saving...' :
                              '⚠ Unsaved'}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        {canEdit && teamMembers.length > 0 && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={handleSendBrief}
                            className="flex items-center gap-2"
                          >
                            <Send size={14} />
                            Send Brief
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setIsFullscreen(false)}
                          className="flex items-center gap-2"
                        >
                          <Minimize size={14} />
                          Exit Fullscreen
                        </Button>
                      </div>
                    </div>
                  )}
                  <div className={`${isFullscreen ? 'flex-1 overflow-y-auto px-8 py-6' : ''}`}> 
                    <div className={`${isFullscreen ? 'max-w-4xl mx-auto' : ''}`}> 
                      <Textarea
                        value={draft}
                        onChange={(e) => {
                          if (currentContent.is_perfect) {
                            setShowPerfectWarning(true);
                          } else {
                            saveDraftToHistory(e.target.value);
                          }
                        }}
                        placeholder="Click 'Expand Brief' to generate the full script/article/copy, or type your own prompt/notes here first to guide Andora's writing..."
                        disabled={!canEdit || currentContent._streaming}
                        rows={isFullscreen ? 30 : 12}
                        className={`text-sm leading-relaxed font-mono ${isFullscreen ? 'w-full min-h-screen' : ''}`}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Review */}
            <div className="p-6 bg-gradient-to-br from-orange-50 via-pink-50 to-purple-50 border-2 border-orange-200 rounded-2xl space-y-4">
              <div className="flex items-center gap-2">
                <Wand2 className="w-5 h-5 text-orange-600" />
                <h2 className="text-lg font-bold text-slate-900">Review</h2>
              </div>
              <p className="text-xs text-slate-600">Andora will review your notes below and expand them into a full creative brief in the draft field above</p>

              <Textarea
                value={refineNotes}
                onChange={(e) => setRefineNotes(e.target.value)}
                placeholder="Write your review notes here - ideas, directions, tweaks you want. Andora will contextualize this with the original brief and create an expanded version..."
                disabled={!canEdit || currentContent._streaming}
                rows={3}
                className="bg-white/80 text-sm"
              />

              <Button
                onClick={handleRefine}
                loading={isRefining}
                disabled={!canEdit || !refineNotes.trim() || currentContent._streaming}
                className="w-full bg-gradient-to-r from-orange-500 to-pink-500 hover:from-orange-600 hover:to-pink-600 text-white"
              >
                <Wand2 size={16} className="mr-2" />
                {isRefining ? 'Andora is reviewing...' : 'Review'}
              </Button>
            </div>

            {/* Team Comments - Only show when team members exist */}
            {teamMembers.length > 0 && (
              <div className="p-6 bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 border-2 border-blue-200 rounded-2xl space-y-4">
                <div className="flex items-center gap-2">
                  <Type className="w-5 h-5 text-blue-600" />
                  <h2 className="text-lg font-bold text-slate-900">Team Comments</h2>
                </div>
                <p className="text-xs text-slate-600">
                  Leave notes for your team about this brief
                </p>

                <Textarea
                  value={currentContent.comments || ''}
                  onChange={(e) => {
                    if (canEdit) {
                      onContentUpdate(currentContent.id, { comments: e.target.value });
                    }
                  }}
                  placeholder="Add comments for your team here..."
                  disabled={!canEdit || currentContent._streaming}
                  rows={3}
                  className="bg-white/80 text-sm"
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Team Selector Modal */}
      {showTeamSelector && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setShowTeamSelector(false)}
          />
          <div className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
            <h3 className="text-lg font-bold text-slate-900 mb-4">Send Brief to Team</h3>
            <div className="space-y-2 mb-6 max-h-64 overflow-y-auto">
              {teamMembers.map(member => (
                <label
                  key={member.id}
                  className="flex items-center gap-3 p-3 hover:bg-slate-50 rounded-lg cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={selectedTeamMembers.includes(member.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedTeamMembers([...selectedTeamMembers, member.id]);
                      } else {
                        setSelectedTeamMembers(selectedTeamMembers.filter(id => id !== member.id));
                      }
                    }}
                    className="w-4 h-4"
                  />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-slate-900">{member.name}</p>
                    <p className="text-xs text-slate-500">{member.email}</p>
                  </div>
                </label>
              ))}
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setShowTeamSelector(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={handleConfirmSendBrief}
                disabled={selectedTeamMembers.length === 0}
                className="flex-1"
              >
                Send to {selectedTeamMembers.length} member(s)
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Expanded Brief Modal */}
      <ExpandedBriefModal
        isOpen={showExpandedBrief}
        onClose={() => setShowExpandedBrief(false)}
        expandedBrief={currentContent?.expanded_brief || currentContent?.final_brief || ''}
        observerFeedback={observerFeedback}
        onSendToDraft={handleSendExpandedToDraft}
      />

      {showPerfectWarning && (
        <div className="fixed inset-0 z-[101] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setShowPerfectWarning(false)}
          />
          <div className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
            <h3 className="text-lg font-bold text-slate-900 mb-4">This content is marked as perfect.</h3>
            <p className="text-sm text-slate-600 mb-6">
              Editing this content will mark it as imperfect. Are you sure you want to continue?
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setShowPerfectWarning(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={() => {
                  setShowPerfectWarning(false);
                  onContentUpdate(currentContent.id, { is_perfect: false });
                }}
                className="flex-1"
              >
                Edit Anyway
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
