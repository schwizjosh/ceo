import React, { useEffect, useMemo, useState, useRef, useCallback } from 'react';
import { Brand, Event, SeasonPlan, SeasonWeekPlan, MonthlyThemeRecord } from '../../types';
import { Button } from '../common/Button';
import { Textarea } from '../common/Textarea';
import { Input } from '../common/Input';
import { aiService } from '../../services/aiService';
import { debounce } from '../../utils/debounce';
import { useAuth } from '../../hooks/useAuth';
import { Wand2, Save, Calendar, Target, ShieldCheck, Bot, Compass, Sparkles, Copy } from 'lucide-react';
import { PyAvatar } from '../common/PyAvatar';
import { PyNotification } from '../common/PyNotification';

interface SeasonPageProps {
  brand: Brand;
  events: Event[];
  onBrandUpdate: (updates: Partial<Brand>) => void;
  onPageChange?: (page: 'monthly') => void;
  preferredModel?: string;
  canEdit?: boolean;
}

const DEFAULT_WEEK_COUNT = 4;

const createDefaultWeekPlan = (week: number): SeasonWeekPlan => ({
  week,
  subplot: '',
  subplotPerfect: false,
  custom_theme: ''
});

const createDefaultSeasonPlan = (month: string): SeasonPlan => {
  const weekly: Record<number, SeasonWeekPlan> = {};
  for (let i = 1; i <= DEFAULT_WEEK_COUNT; i += 1) {
    weekly[i] = createDefaultWeekPlan(i);
  }
  return {
    month,
    theme: '',
    themePerfect: false,
    themeNarrative: '',
    monthlyPlot: '',
    plotPerfect: false,
    weekly
  };
};

const normalizeThemeRecord = (record?: MonthlyThemeRecord) => {
  if (!record) {
    return { theme: '', narrative: '' };
  }

  if (typeof record === 'string') {
    return { theme: record, narrative: '' };
  }

  return {
    theme: record.theme || '',
    narrative: record.explanation || record.description || ''
  };
};

// Check if a character is considered "perfect" (has all essential fields marked as perfect)
const isCharacterPerfect = (character: any, brandType?: string) => {
  // For individual brands, be more lenient - just need persona to be ready
  if (brandType === 'individual') {
    // Check if persona field exists and is filled (not necessarily marked perfect)
    const hasPersona = Boolean(character.persona && character.persona.trim());
    const hasName = Boolean(character.name && character.name.trim());

    // For individual brands, just check if fields are filled, not if they're marked perfect
    return hasPersona && hasName;
  }

  // For organization brands, use stricter perfect field checking
  if (character.perfect_fields) {
    // For the new system, check that persona is marked perfect (the AI-generated field)
    // and at least the core identity fields are marked perfect
    return Boolean(
      character.perfect_fields.persona &&
      character.perfect_fields.name &&
      character.perfect_fields.role
    );
  }
  // Fallback to legacy isPerfect field
  return Boolean(character.isPerfect);
};

const hasPlanningPrerequisites = (brand: Brand) => {
  // Check core brand configuration is complete
  const hasCoreConfig = Boolean(
    brand.vision &&
    brand.mission &&
    brand.persona &&
    brand.buyer_profile &&
    brand.products
  );

  // Filter to ONLY unmuted characters - muted characters are completely skipped (perfect or not)
  const unmutedCharacters = brand.cast_management?.filter((char: any) => !char.is_muted) || [];

  // Check that we have at least one unmuted character
  const hasCast = unmutedCharacters.length > 0;

  // Check that ALL unmuted characters are marked as perfect
  const allCharactersPerfect = unmutedCharacters.every((char: any) => isCharacterPerfect(char, brand.brand_type));

  // Debug logging for individual brands
  if (brand.brand_type === 'individual') {
    console.log('🔍 Season Prerequisites Debug (Individual Brand):', {
      brand_name: brand.brand_name,
      brand_type: brand.brand_type,
      hasCoreConfig,
      checks: {
        hasVision: Boolean(brand.vision),
        hasMission: Boolean(brand.mission),
        hasPersona: Boolean(brand.persona),
        hasBuyerProfile: Boolean(brand.buyer_profile),
        hasProducts: Boolean(brand.products)
      },
      hasCast,
      totalCastCount: brand.cast_management?.length,
      unmutedCastCount: unmutedCharacters.length,
      allCharactersPerfect,
      characterChecks: unmutedCharacters.map((char: any) => ({
        name: char.name,
        hasName: Boolean(char.name && char.name.trim()),
        hasPersona: Boolean(char.persona && char.persona.trim()),
        isPerfect: isCharacterPerfect(char, brand.brand_type),
        isMuted: char.is_muted
      })),
      finalResult: hasCoreConfig && hasCast && allCharactersPerfect
    });
  }

  return hasCoreConfig && hasCast && allCharactersPerfect;
};

export const SeasonPage: React.FC<SeasonPageProps> = ({
  brand,
  events,
  onBrandUpdate,
  onPageChange,
  preferredModel,
  canEdit = true
}) => {
  // Check if user has admin rights
  const { isAdmin, authUser } = useAuth();

  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [localPlan, setLocalPlan] = useState<SeasonPlan>(() => {
    const existingPlan = brand.season_plans?.[selectedMonth];
    const defaultPlan = createDefaultSeasonPlan(selectedMonth);
    const { theme: recordTheme, narrative: recordNarrative } = normalizeThemeRecord(
      brand.monthly_themes?.[selectedMonth]
    );
    if (!existingPlan) {
      return {
        ...defaultPlan,
        theme: recordTheme || defaultPlan.theme,
        themeNarrative: recordNarrative || defaultPlan.themeNarrative
      };
    }
    const merged = {
      ...defaultPlan,
      ...existingPlan,
      weekly: { ...defaultPlan.weekly, ...existingPlan.weekly }
    };
    return {
      ...merged,
      theme: merged.theme || recordTheme,
      themeNarrative: merged.themeNarrative || recordNarrative
    };
  });

  const [isGeneratingTheme, setIsGeneratingTheme] = useState(false);
  const [isGeneratingPlot, setIsGeneratingPlot] = useState(false);
  const [generatingWeek, setGeneratingWeek] = useState<number | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [previewContent, setPreviewContent] = useState<{
    theme: string;
    monthlyPlot: string;
    fullResponse: string;
    weeks?: Record<number, { theme: string; subplot: string }>;
  } | null>(null);

  // Smart autosave system - use debounced update similar to ConfigPage
  const isUserEditingRef = useRef(false);
  const lastEditTimeRef = useRef<number>(0);

  // Helper function to build monthly theme record
  const buildMonthlyThemeRecord = useCallback((themeValue: string, narrative?: string | null): MonthlyThemeRecord => {
    const trimmedTheme = themeValue.trim();
    const trimmedNarrative = narrative?.trim();

    if (!trimmedTheme) {
      return '';
    }

    if (trimmedNarrative) {
      return {
        theme: trimmedTheme,
        explanation: trimmedNarrative,
        description: trimmedNarrative,
      };
    }

    return trimmedTheme;
  }, []);

  // Debounced update function - saves 1 second after user stops typing
  const debouncedUpdate = useRef(
    debounce((planUpdates: SeasonPlan) => {
      console.log('💾 Saving season plan updates for', selectedMonth);
      onBrandUpdate({
        season_plans: {
          ...brand.season_plans,
          [selectedMonth]: planUpdates
        },
        monthly_themes: {
          ...brand.monthly_themes,
          [selectedMonth]: buildMonthlyThemeRecord(planUpdates.theme, planUpdates.themeNarrative)
        }
      });
      isUserEditingRef.current = false;
    }, 1000)
  ).current;

  // Immediate save function (for toggles and explicit saves)
  const saveImmediately = useCallback((planUpdates: SeasonPlan) => {
    if (!canEdit) return;
    console.log('💾 Immediate save for', selectedMonth);
    onBrandUpdate({
      season_plans: {
        ...brand.season_plans,
        [selectedMonth]: planUpdates
      },
      monthly_themes: {
        ...brand.monthly_themes,
        [selectedMonth]: buildMonthlyThemeRecord(planUpdates.theme, planUpdates.themeNarrative)
      }
    });
  }, [canEdit, selectedMonth, brand.season_plans, brand.monthly_themes, onBrandUpdate, buildMonthlyThemeRecord]);

  const monthName = useMemo(() => new Date(selectedMonth + '-01').toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric'
  }), [selectedMonth]);

  // Update local state when brand changes, but respect active edits
  useEffect(() => {
    const timeSinceLastEdit = Date.now() - lastEditTimeRef.current;
    const isRecentEdit = timeSinceLastEdit < 2000; // 2 second grace period

    if (!isRecentEdit) {
      console.log('📂📂📂 LOADING CACHED DATA FROM DATABASE 📂📂📂');
      console.log('🔍 Month:', selectedMonth);
      const existingPlan = brand.season_plans?.[selectedMonth];
      const defaultPlan = createDefaultSeasonPlan(selectedMonth);
      const { theme: recordTheme, narrative: recordNarrative } = normalizeThemeRecord(
        brand.monthly_themes?.[selectedMonth]
      );
      const plan = existingPlan
        ? {
            ...defaultPlan,
            ...existingPlan,
            weekly: { ...defaultPlan.weekly, ...existingPlan.weekly }
          }
        : defaultPlan;

      const enrichedPlan = {
        ...plan,
        theme: plan.theme || recordTheme,
        themeNarrative: plan.themeNarrative || recordNarrative
      };

      if (brand.season_plans?.[selectedMonth]) {
        console.log('💾 Found existing plan in database:');
        console.log('  - Theme:', plan.theme?.substring(0, 80) + '...');
        console.log('  - Monthly Plot:', plan.monthlyPlot?.substring(0, 80) + '...');
        console.log('  - Theme Perfect:', plan.themePerfect);
        console.log('  - Plot Perfect:', plan.plotPerfect);
        console.log('⚠️  This is OLD DATA - Click "Generate for Me" to use new multi-agent system!');
      } else {
        console.log('🆕 No existing plan - starting fresh');
      }

      setLocalPlan(enrichedPlan);
    }
  }, [brand.season_plans, brand.monthly_themes, selectedMonth]);

  // Auto-refresh brand data when AI generation is in progress
  useEffect(() => {
    const isGenerating = isGeneratingTheme || isGeneratingPlot || generatingWeek !== null;

    if (!isGenerating) {
      return; // No polling needed when not generating
    }

    console.log('🔄 Starting auto-refresh polling (AI generation in progress)');

    const pollInterval = setInterval(async () => {
      try {
        // Import apiClient dynamically to avoid circular dependencies
        const { apiClient } = await import('../../lib/api');

        // Fetch fresh brand data from the server
        const freshBrand = await apiClient.getBrand(brand.brand_id);

        // Update parent component with fresh data
        onBrandUpdate(freshBrand);

        console.log('✅ Auto-refreshed brand data');
      } catch (error) {
        console.error('❌ Failed to auto-refresh brand data:', error);
      }
    }, 3000); // Poll every 3 seconds

    // Cleanup: stop polling when generation completes or component unmounts
    return () => {
      console.log('🛑 Stopping auto-refresh polling');
      clearInterval(pollInterval);
    };
  }, [isGeneratingTheme, isGeneratingPlot, generatingWeek, brand.brand_id, onBrandUpdate]);

  // Intelligent Timeline Context: Get events from previous, current, and next month
  // This embeds Andora in the user's full timeline for richer narrative context
  const timelineEvents = useMemo(() => {
    const [year, month] = selectedMonth.split('-').map(Number);
    const currentDate = new Date(year, month - 1, 1);

    // Previous month
    const prevMonth = new Date(year, month - 2, 1);
    const prevMonthStr = `${prevMonth.getFullYear()}-${String(prevMonth.getMonth() + 1).padStart(2, '0')}`;

    // Next month
    const nextMonth = new Date(year, month, 1);
    const nextMonthStr = `${nextMonth.getFullYear()}-${String(nextMonth.getMonth() + 1).padStart(2, '0')}`;

    return {
      previous: events.filter(event => event.event_date.startsWith(prevMonthStr)),
      current: events.filter(event => event.event_date.startsWith(selectedMonth)),
      next: events.filter(event => event.event_date.startsWith(nextMonthStr)),
      // Combined timeline for AI context
      all: events.filter(event =>
        event.event_date.startsWith(prevMonthStr) ||
        event.event_date.startsWith(selectedMonth) ||
        event.event_date.startsWith(nextMonthStr)
      )
    };
  }, [events, selectedMonth]);

  const cast = brand.cast_management || [];

  const handlePlanUpdate = useCallback((updates: Partial<SeasonPlan>, immediate = false) => {
    if (!canEdit) return;

    lastEditTimeRef.current = Date.now();
    isUserEditingRef.current = true;

    setLocalPlan(prevPlan => {
      const updatedPlan = {
        ...prevPlan,
        ...updates,
        weekly: updates.weekly ? { ...prevPlan.weekly, ...updates.weekly } : prevPlan.weekly
      };

      // Trigger save with the updated plan
      if (immediate) {
        saveImmediately(updatedPlan);
      } else {
        debouncedUpdate(updatedPlan);
      }

      return updatedPlan;
    });
  }, [canEdit, saveImmediately, debouncedUpdate]);

  const handleThemeChange = useCallback((value: string, options?: { explanation?: string | null }) => {
    if (!canEdit) return;
    console.log('🔄 Theme changing to:', value.substring(0, 50));

    lastEditTimeRef.current = Date.now();
    isUserEditingRef.current = true;

    setLocalPlan(prevPlan => {
      const resetWeekly: Record<number, SeasonWeekPlan> = Object.keys(prevPlan.weekly).reduce((acc, key) => {
        const weekKey = Number(key);
        acc[weekKey] = { ...prevPlan.weekly[weekKey], subplotPerfect: false };
        return acc;
      }, {} as Record<number, SeasonWeekPlan>);

      const updatedPlan = {
        ...prevPlan,
        theme: value,
        themePerfect: false,
        themeNarrative: options?.explanation?.trim() || '',
        monthlyPlot: '',
        plotPerfect: false,
        weekly: resetWeekly
      };

      // Trigger debounced save
      debouncedUpdate(updatedPlan);

      return updatedPlan;
    });
  }, [canEdit, debouncedUpdate]);

  const handleThemePerfectToggle = useCallback(() => {
    if (!canEdit) return;

    lastEditTimeRef.current = Date.now();
    isUserEditingRef.current = true;

    setLocalPlan(prevPlan => {
      const updatedPlan = { ...prevPlan, themePerfect: !prevPlan.themePerfect };
      saveImmediately(updatedPlan);
      return updatedPlan;
    });
  }, [canEdit, saveImmediately]);

  const handlePlotPerfectToggle = useCallback(() => {
    if (!canEdit) return;

    lastEditTimeRef.current = Date.now();
    isUserEditingRef.current = true;

    setLocalPlan(prevPlan => {
      const updatedPlan = { ...prevPlan, plotPerfect: !prevPlan.plotPerfect };
      saveImmediately(updatedPlan);
      return updatedPlan;
    });
  }, [canEdit, saveImmediately]);

  const handleWeekUpdate = useCallback((week: number, updates: Partial<SeasonWeekPlan>, immediate = false) => {
    if (!canEdit) return;

    lastEditTimeRef.current = Date.now();
    isUserEditingRef.current = true;

    setLocalPlan(prevPlan => {
      const updatedWeek: SeasonWeekPlan = {
        ...prevPlan.weekly[week],
        ...updates,
        subplotPerfect: updates.subplotPerfect !== undefined ? updates.subplotPerfect : prevPlan.weekly[week]?.subplotPerfect || false
      };
      const updatedPlan = {
        ...prevPlan,
        weekly: { ...prevPlan.weekly, [week]: updatedWeek }
      };

      // Trigger save with the updated plan
      if (immediate) {
        saveImmediately(updatedPlan);
      } else {
        debouncedUpdate(updatedPlan);
      }

      return updatedPlan;
    });
  }, [canEdit, saveImmediately, debouncedUpdate]);

  const handleGenerateTheme = async () => {
    if (!canEdit) return;
    setIsGeneratingTheme(true);
    setStatusMessage(null);
    try {
      const userThemeInput = localPlan.theme;

      const { theme, explanation, weeks } = await aiService.generateTheme(
        brand,
        selectedMonth,
        timelineEvents.all,
        preferredModel || authUser?.preferred_ai_model || 'gemini-2.5-flash',
        userThemeInput
      );

      // Use weeks directly from backend if available
      const fullText = explanation || '';
      let monthlyPlot = '';
      const weeklyData: Record<number, { theme: string; subplot: string }> = {};

      // If backend already parsed weeks, use them directly
      if (weeks && Object.keys(weeks).length > 0) {
        console.log('✅ Using pre-parsed weeks from backend:', Object.keys(weeks));

        // Extract monthly plot (first paragraph before any week mentions)
        const firstParagraph = fullText.split(/\n\n+/)[0]?.trim() || '';
        monthlyPlot = firstParagraph || `This month focuses on ${theme.toLowerCase()}. The narrative arc spans four weeks, building from initial engagement through rising action to climax and resolution.`;

        // Use the weeks directly from backend
        Object.entries(weeks).forEach(([weekNum, content]) => {
          const weekNumber = parseInt(weekNum, 10);
          if (weekNumber >= 1 && weekNumber <= 4 && content) {
            // Extract theme from content if it starts with "WEEK N - THEME:"
            const themeMatch = content.match(/^WEEK\s+\d+\s+-\s+([^:]+):/i);
            const weekTheme = themeMatch ? themeMatch[1].trim() : `Week ${weekNumber}`;

            weeklyData[weekNumber] = {
              theme: weekTheme,
              subplot: content.trim()
            };
          }
        });

        console.log('📦 Extracted weekly data:', Object.keys(weeklyData).map(k => `Week ${k}: ${weeklyData[parseInt(k)].theme}`));
      } else {
        console.log('⚠️ No pre-parsed weeks from backend, falling back to text parsing');

        /* FALLBACK: Parse from explanation text if backend didn't provide weeks
         * AI can return two formats:
         * Format A (Paragraphs): Each week in separate paragraph with "(Week N)"
         * Format B (Inline): All weeks in one text block with **WEEK N - TITLE (Stage):**
         */

      // Check if using inline format with **WEEK N** markers
      const inlineWeekPattern = /\*\*WEEK\s+(\d+)\s+-\s+([^(]+)\s*\([^)]+\)\s*:\*\*/gi;
      const hasInlineFormat = inlineWeekPattern.test(fullText);

      if (hasInlineFormat) {
        // INLINE FORMAT: **WEEK 1 - THE AWAKENING (Opening Hook):** content **WEEK 2 - ...
        console.log('📖 Detected inline week format with **WEEK N - TITLE**');
        console.log('📄 Full text length:', fullText.length);

        // Split by **WEEK markers to get sections
        const sections = fullText.split(/\*\*WEEK\s+\d+/i);

        // First section (before any WEEK) is monthly plot
        monthlyPlot = sections[0]?.trim() || '';

        // Remove any trailing content markers from monthly plot
        monthlyPlot = monthlyPlot.split(/\*\*Visual|Visual & Tonal|Content Sparks/i)[0]?.trim() || monthlyPlot;
        console.log('📝 Monthly plot extracted:', monthlyPlot.substring(0, 100) + '...');

        // IMPROVED REGEX: Match **WEEK N - TITLE (Stage):** and capture everything until next **WEEK or ** section marker
        const weekMatches = [...fullText.matchAll(/\*\*WEEK\s+(\d+)\s+-\s+([^(]+?)\s*\(([^)]+)\)\s*:\*\*\s*((?:(?!\*\*WEEK|\*\*Visual|\*\*Content Sparks)[\s\S])*)/gi)];

        console.log(`🔍 Found ${weekMatches.length} week matches`);

        weekMatches.forEach((match, index) => {
          const [fullMatch, weekNum, title, stage, content] = match;
          const weekNumber = parseInt(weekNum, 10);

          console.log(`\n📌 Week ${weekNumber}:`);
          console.log('  Title:', title.trim());
          console.log('  Stage:', stage.trim());
          console.log('  Content preview:', content.trim().substring(0, 100) + '...');
          console.log('  Content length:', content.trim().length);

          if (weekNumber >= 1 && weekNumber <= 4) {
            weeklyData[weekNumber] = {
              theme: title.trim(), // e.g., "THE AWAKENING"
              subplot: content.trim()
            };
          }
        });

        // Double-check what we extracted
        console.log('\n✅ Final weekly data:', Object.keys(weeklyData).map(k => `Week ${k}: ${weeklyData[parseInt(k)].theme}`));

      } else {
        // PARAGRAPH FORMAT: Separate paragraphs with (Week N) in them
        console.log('📖 Detected paragraph week format with (Week N)');

        const paragraphs = fullText.split(/\n\n+/).filter(p => p.trim());
        const weeklyParagraphs: string[] = [];

        paragraphs.forEach((p) => {
          const isWeekParagraph = /\(Week\s+\d+\)/i.test(p);
          if (isWeekParagraph) {
            weeklyParagraphs.push(p);
          } else if (!monthlyPlot && !p.match(/VISUAL CONTENT|visual content/i)) {
            // First non-week paragraph is monthly plot
            monthlyPlot = p.trim();
          }
        });

        // Parse each week paragraph
        weeklyParagraphs.forEach((paragraph) => {
          if (paragraph && !paragraph.match(/VISUAL CONTENT|visual content/i)) {
            // Match pattern: "LABEL (Week N): content" or "LABEL (Stage): content"
            const weekMatch = paragraph.match(/^([A-Z\s]+)\s*\((?:Week\s+)?(\d+)\)\s*:\s*([\s\S]+)$/i);

            if (weekMatch) {
              const [, themeLabel, weekNum, content] = weekMatch;
              const weekNumber = parseInt(weekNum, 10);

              if (weekNumber >= 1 && weekNumber <= 4) {
                weeklyData[weekNumber] = {
                  theme: themeLabel.trim(),
                  subplot: content.trim()
                };
              }
            } else {
              // Fallback: extract week number from anywhere
              const weekNumMatch = paragraph.match(/Week\s+(\d+)/i);
              if (weekNumMatch) {
                const weekNumber = parseInt(weekNumMatch[1], 10);
                if (weekNumber >= 1 && weekNumber <= 4) {
                  const colonIndex = paragraph.indexOf(':');
                  const theme = paragraph.substring(0, colonIndex > -1 ? colonIndex : 50).replace(/Week\s+\d+/i, '').trim();
                  const subplot = colonIndex > -1 ? paragraph.substring(colonIndex + 1).trim() : paragraph;

                  weeklyData[weekNumber] = {
                    theme: theme || `Week ${weekNumber}`,
                    subplot: subplot
                  };
                }
              }
            }
          }
        });
      }
      }  // Close the else block for fallback text parsing

      // Fallback if no monthly plot found
      if (!monthlyPlot) {
        monthlyPlot = `This month focuses on ${theme.toLowerCase()}. The narrative arc spans four weeks, building from initial engagement through rising action to climax and resolution.`;
      }

      // Log what we're about to save
      console.log('\n💾 Saving to state:');
      console.log('Theme:', theme);
      console.log('Monthly Plot:', monthlyPlot.substring(0, 100) + '...');
      console.log('Week 1:', { theme: weeklyData[1]?.theme || '(empty)', subplotLength: weeklyData[1]?.subplot?.length || 0 });
      console.log('Week 2:', { theme: weeklyData[2]?.theme || '(empty)', subplotLength: weeklyData[2]?.subplot?.length || 0 });
      console.log('Week 3:', { theme: weeklyData[3]?.theme || '(empty)', subplotLength: weeklyData[3]?.subplot?.length || 0 });
      console.log('Week 4:', { theme: weeklyData[4]?.theme || '(empty)', subplotLength: weeklyData[4]?.subplot?.length || 0 });

      // Update state
      handlePlanUpdate({
        theme: theme, // AI theme title → Monthly Theme field
        themePerfect: false,
        themeNarrative: explanation || '', // Keep full response for preview
        monthlyPlot: monthlyPlot, // First paragraph → Monthly Plot field
        plotPerfect: false,
        weekly: {
          1: { week: 1, custom_theme: weeklyData[1]?.theme || '', subplot: weeklyData[1]?.subplot || '', subplotPerfect: false },
          2: { week: 2, custom_theme: weeklyData[2]?.theme || '', subplot: weeklyData[2]?.subplot || '', subplotPerfect: false },
          3: { week: 3, custom_theme: weeklyData[3]?.theme || '', subplot: weeklyData[3]?.subplot || '', subplotPerfect: false },
          4: { week: 4, custom_theme: weeklyData[4]?.theme || '', subplot: weeklyData[4]?.subplot || '', subplotPerfect: false }
        }
      }, true); // Immediate save

      console.log('✅ State update triggered');

      // Show preview with weeks
      setPreviewContent({
        theme,
        monthlyPlot,
        fullResponse: explanation || '',
        weeks: weeklyData
      });
      setShowPreviewModal(true);
    } catch (error) {
      console.error('Error generating theme:', error);
      setStatusMessage('Unable to generate a theme. Please try again.');
    } finally {
      setIsGeneratingTheme(false);
    }
  };

  const handleGeneratePlot = async () => {
    if (!localPlan.theme || !canEdit) return;
    setIsGeneratingPlot(true);
    setStatusMessage(null);
    try {
      // Pass timeline context for narrative continuity across months
      const { plot, fullPreview, weeks } = await aiService.generateMonthlyPlot(
        brand,
        selectedMonth,
        localPlan.theme,
        timelineEvents.all,
        cast,
        preferredModel || authUser?.preferred_ai_model || 'gemini-2.5-flash'
      );

      // Update monthly plot
      handlePlanUpdate({ monthlyPlot: plot?.trim() || '', plotPerfect: false });

      // Auto-populate weekly subplots from the AI breakdown
      console.log('📅 Weeks data received:', weeks);
      if (weeks) {
        console.log('📅 Processing weeks...');
        Object.entries(weeks).forEach(([weekNum, weekContent]) => {
          console.log(`📅 Week ${weekNum}:`, {
            hasContent: !!weekContent,
            length: weekContent?.length || 0,
            preview: weekContent?.substring(0, 50)
          });
          if (weekContent && weekContent.trim()) {
            const week = Number(weekNum);
            console.log(`✅ Updating week ${week} with content`);
            handleWeekUpdate(week, {
              subplot: weekContent.trim(),
              subplotPerfect: false
            });
          }
        });
      } else {
        console.warn('⚠️ No weeks data in response');
      }

      // Show preview if available
      if (fullPreview) {
        setPreviewContent({
          theme: localPlan.theme,
          monthlyPlot: plot?.trim() || '',
          fullResponse: fullPreview
        });
        setShowPreviewModal(true);
      }
    } catch (error) {
      console.error('Error generating plot:', error);
      setStatusMessage('Unable to generate a monthly plot. Adjust the theme or try again.');
    } finally {
      setIsGeneratingPlot(false);
    }
  };

  const handleGenerateWeek = async (week: number) => {
    if (!canEdit) return;
    const weekPlan = localPlan.weekly[week];
    if (!localPlan.theme || !localPlan.monthlyPlot) return;

    setGeneratingWeek(week);
    setStatusMessage(null);
    try {
      const previousWeekPlan = week > 1 ? localPlan.weekly[week - 1] : undefined;
      // Use full timeline context so weekly subplots understand the broader narrative arc
      const { subplot, weekTheme } = await aiService.generateWeeklySubplot(
        brand,
        selectedMonth,
        week,
        localPlan.theme,
        localPlan.monthlyPlot || '',
        timelineEvents.all,
        previousWeekPlan?.subplot,
        weekPlan.custom_theme || '',
        cast,
        undefined  // Let orchestrator choose the model
      );
      // If AI generated a week theme and user didn't provide one, use it
      const updates: Partial<SeasonWeekPlan> = { subplot };
      if (weekTheme && !weekPlan.custom_theme) {
        updates.custom_theme = weekTheme;
      }
      handleWeekUpdate(week, updates);
    } catch (error) {
      console.error('Error generating subplot:', error);
      setStatusMessage(`Unable to generate Week ${week}. Try adjusting the weekly focus.`);
    } finally {
      setGeneratingWeek(null);
    }
  };

  // Copy all season plan to clipboard (admin only)
  const handleCopyAllSeasons = async () => {
    if (!isAdmin) {
      setStatusMessage('This feature is only available for admin accounts');
      setTimeout(() => setStatusMessage(null), 3000);
      return;
    }

    let seasonText = `=== SEASON PLAN - ${monthName} ===\n\n`;

    seasonText += `MONTHLY THEME:\n${localPlan.theme || '(not set)'}\n\n`;

    if (localPlan.themeNarrative) {
      seasonText += `THEME NARRATIVE:\n${localPlan.themeNarrative}\n\n`;
    }

    seasonText += `MONTHLY PLOT:\n${localPlan.monthlyPlot || '(not set)'}\n\n`;

    seasonText += `${'='.repeat(60)}\nWEEKLY SUBPLOTS\n${'='.repeat(60)}\n\n`;

    [1, 2, 3, 4].forEach(weekNum => {
      const week = localPlan.weekly[weekNum];
      if (week) {
        seasonText += `WEEK ${weekNum}${week.custom_theme ? ` - ${week.custom_theme}` : ''}\n`;
        seasonText += `Status: ${week.subplotPerfect ? 'Perfect ✓' : 'In Progress'}\n`;
        seasonText += `${'─'.repeat(40)}\n`;
        seasonText += `${week.subplot || '(not set)'}\n\n`;
      }
    });

    seasonText += `\nGenerated by Py Season Planning - ${new Date().toLocaleString()}`;

    try {
      await navigator.clipboard.writeText(seasonText);
      setStatusMessage('✨ Season plan copied to clipboard!');
      setTimeout(() => setStatusMessage(null), 3000);
    } catch (error) {
      console.error('Failed to copy:', error);
      setStatusMessage('Failed to copy to clipboard');
      setTimeout(() => setStatusMessage(null), 3000);
    }
  };

  const prerequisitesMet = hasPlanningPrerequisites(brand);

  if (!prerequisitesMet) {
    const hasCoreConfig = Boolean(
      brand.vision &&
      brand.mission &&
      brand.persona &&
      brand.buyer_profile &&
      brand.products
    );
    // Filter to ONLY unmuted characters - muted characters are completely skipped (perfect or not)
    const unmutedCharacters = brand.cast_management?.filter((char: any) => !char.is_muted) || [];
    const hasCast = unmutedCharacters.length > 0;
    const allCharactersPerfect = unmutedCharacters.every((char: any) => isCharacterPerfect(char, brand.brand_type));

    return (
      <div className="max-w-3xl mx-auto p-6 sm:p-10">
        <div className="rounded-2xl border border-accent-500/40 bg-accent-500/10 p-6 sm:p-8">
          <div className="flex flex-col sm:flex-row sm:items-center gap-5">
            <PyAvatar size="lg" className="shadow-xl ring-2 ring-accent-500/50" />
            <div>
              <p className="text-xs uppercase tracking-wide text-accent-300 font-semibold">Season planning locked</p>
              <h2 className="text-xl sm:text-2xl font-semibold text-primary-900 mt-1">Let me gather the strategic context first</h2>
              <p className="text-sm text-primary-900/80 mt-3 leading-relaxed">
                I need your complete company foundation before we can build seasonal strategies. Here's what's needed:
              </p>
              <ul className="text-sm text-primary-900/80 mt-3 space-y-2 list-disc list-inside">
                {!hasCoreConfig && (
                  <li>Complete your <strong>Company Profile</strong> (vision, mission, persona, buyer profile, and products)</li>
                )}
                {!hasCast && (
                  <li>Create at least one <strong>Team Member</strong> in your Personnel Studio</li>
                )}
                {hasCast && !allCharactersPerfect && (
                  <li>Mark all <strong>unmuted team members as perfect</strong> in the Personnel Studio (ensure name, role, and persona are complete). Muted members are excluded from this check.</li>
                )}
              </ul>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const isSeasonComplete = localPlan.themePerfect && localPlan.plotPerfect && [1, 2, 3, 4].every(week => localPlan.weekly[week]?.subplotPerfect && localPlan.weekly[week]?.subplot);

  // Notification messages
  const getNotificationMessage = () => {
    if (isGeneratingTheme) return 'Crafting your monthly theme...';
    if (isGeneratingPlot) return 'Writing your monthly plot with character context...';
    if (generatingWeek) return `Generating week ${generatingWeek} subplot...`;
    return '';
  };

  const showNotification = isGeneratingTheme || isGeneratingPlot || generatingWeek !== null;

  return (
    <div className="relative min-w-0 overflow-x-hidden">
      <div className="max-w-6xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-4 sm:py-6 lg:py-8 space-y-6 sm:space-y-8 lg:space-y-10">
        {/* Andora Notification Card */}
        <PyNotification
          show={showNotification}
          message={getNotificationMessage()}
        />

        {/* Hero Section */}
        <section className="relative overflow-hidden rounded-2xl sm:rounded-3xl border border-primary-500/20 bg-gradient-to-br from-primary-600 via-purple-600 to-slate-900 text-white shadow-xl">
          <div
            className="absolute inset-0 opacity-40 mix-blend-screen bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.35),transparent_65%)]"
            aria-hidden
          />
          <div className="relative z-10 flex flex-col gap-4 sm:gap-6 lg:flex-row lg:items-center lg:justify-between p-4 sm:p-6 lg:p-8">
            <div className="space-y-3 sm:space-y-5 max-w-2xl min-w-0">
              <span className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.4em] text-white/70">
                <Compass className="w-4 h-4" />
                Season planning
              </span>
              <div className="space-y-2 sm:space-y-3">
                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-semibold leading-tight break-words">Architect the narrative arc</h1>
                <p className="text-xs sm:text-sm lg:text-base text-white/80 leading-relaxed">
                  Shape monthly themes and weekly subplots that turn your brand story into structured, engaging content journeys.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs sm:text-sm text-white/80">
                <span className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1">
                  <Sparkles className="w-3.5 h-3.5" />
                  Strategic storytelling
                </span>
                <span className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1">
                  <Calendar className="w-3.5 h-3.5" />
                  {monthName}
                </span>
                <span className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1">
                  <Save className="w-3.5 h-3.5" />
                  Autosaved
                </span>
              </div>
            </div>
          </div>
        </section>

        {!canEdit && (
          <div className="rounded-xl sm:rounded-2xl border border-orange-200 bg-orange-50/50 p-3 sm:p-4 flex items-center gap-2 sm:gap-3 min-w-0">
            <ShieldCheck size={18} className="text-orange-600 shrink-0 sm:w-5 sm:h-5" />
            <p className="text-xs sm:text-sm text-orange-900 break-words">
              You currently have view-only access. Ask your workspace admin to grant editing rights to adjust the season plan.
            </p>
          </div>
        )}

        {statusMessage && (
          <div className="rounded-xl sm:rounded-2xl border border-accent-500/30 bg-accent-500/10 p-3 sm:p-4 flex items-start gap-2 sm:gap-3 min-w-0">
            <PyAvatar size="sm" className="shadow-lg ring-2 ring-accent-500/40 shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="text-xs uppercase tracking-wide text-accent-600 font-semibold mb-1">Py heads-up</p>
              <p className="text-xs sm:text-sm text-slate-700 leading-relaxed break-words">{statusMessage}</p>
            </div>
          </div>
        )}

        <div className="space-y-4 sm:space-y-6 lg:space-y-8 min-w-0">

      {/* Month Selector */}
      <div className="rounded-xl sm:rounded-2xl border border-slate-200/80 bg-white/80 backdrop-blur-sm shadow-sm p-3 sm:p-4 lg:p-6 min-w-0">
        <div className="flex items-center justify-between gap-2 mb-3 sm:mb-4 min-w-0">
          <h2 className="text-base sm:text-lg lg:text-xl font-semibold text-slate-900 truncate">Select Planning Month</h2>
          <div className="flex items-center space-x-2">
            {isAdmin && (
              <Button
                onClick={handleCopyAllSeasons}
                variant="outline"
                size="sm"
                className="flex items-center text-sm"
                title="Copy entire season plan to clipboard (Admin only)"
              >
                <Copy size={16} className="mr-1.5" />
                <span className="hidden sm:inline">Copy All</span>
              </Button>
            )}
            <Calendar size={20} className="text-primary-600" />
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="px-3 py-2 rounded-lg border border-slate-200 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>
        </div>
      </div>

      {/* Monthly Theme */}
      <div className="rounded-xl sm:rounded-2xl border border-slate-200/80 bg-white/80 backdrop-blur-sm shadow-sm p-3 sm:p-4 lg:p-6 space-y-3 sm:space-y-4 min-w-0">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg sm:text-xl font-semibold text-primary-900">Monthly Theme: {monthName}</h2>
            <p className="text-xs text-slate-500">Define the overarching theme and messaging strategy. I'll use this everywhere.</p>
          </div>
          <div className="flex items-center space-x-2">
            {localPlan.themeNarrative && (
              <Button
                onClick={() => {
                  // Convert weekly plan to preview format
                  const weeksForPreview: Record<number, { theme: string; subplot: string }> = {};
                  [1, 2, 3, 4].forEach(weekNum => {
                    const week = localPlan.weekly[weekNum];
                    if (week && week.subplot) {
                      weeksForPreview[weekNum] = {
                        theme: week.custom_theme || '',
                        subplot: week.subplot
                      };
                    }
                  });

                  setPreviewContent({
                    theme: localPlan.theme,
                    monthlyPlot: localPlan.monthlyPlot || '',
                    fullResponse: localPlan.themeNarrative,
                    weeks: Object.keys(weeksForPreview).length > 0 ? weeksForPreview : undefined
                  });
                  setShowPreviewModal(true);
                }}
                variant="outline"
                size="sm"
                className="flex items-center text-sm"
              >
                <Bot size={16} className="mr-2" />
                View Preview
              </Button>
            )}
            <Button
              onClick={handleGenerateTheme}
              loading={isGeneratingTheme}
              className="flex items-center text-sm"
              size="sm"
              disabled={!canEdit}
            >
              <Wand2 size={16} className="mr-2" />
              Generate for Me
            </Button>
            <Button
              variant={localPlan.themePerfect ? 'default' : 'outline'}
              onClick={handleThemePerfectToggle}
              size="sm"
              className="flex items-center"
              disabled={!canEdit}
            >
              <ShieldCheck size={16} className="mr-2" />
              {localPlan.themePerfect ? 'Marked Perfect' : 'Mark as Perfect'}
            </Button>
          </div>
        </div>

        <Textarea
          value={localPlan.theme}
          onChange={(e) => handleThemeChange(e.target.value)}
          placeholder="Define the overarching theme and messaging strategy for this month..."
          rows={6}
          disabled={!canEdit}
        />

        <div className="flex items-center justify-end gap-2">
          <span className="text-xs text-slate-500">Auto-saves as you type</span>
        </div>
      </div>

      {/* Monthly Plot */}
      {localPlan.theme && (
        <div className="rounded-xl sm:rounded-2xl border border-slate-200/80 bg-white/80 backdrop-blur-sm shadow-sm p-3 sm:p-4 lg:p-6 space-y-3 sm:space-y-4 min-w-0">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg sm:text-xl font-semibold text-primary-900">Monthly Plot</h2>
              <p className="text-xs text-slate-500">Transform your theme into a narrative arc that unlocks the weekly subplots.</p>
            </div>
            <div className="flex items-center space-x-2">
              <Button
                onClick={handleGeneratePlot}
                loading={isGeneratingPlot}
                className="flex items-center text-sm"
                size="sm"
                disabled={!canEdit}
              >
                <Wand2 size={16} className="mr-2" />
                Generate for Me
              </Button>
              <Button
                variant={localPlan.plotPerfect ? 'default' : 'outline'}
                onClick={handlePlotPerfectToggle}
                size="sm"
                className="flex items-center"
                disabled={!canEdit}
              >
                <ShieldCheck size={16} className="mr-2" />
                {localPlan.plotPerfect ? 'Marked Perfect' : 'Mark as Perfect'}
              </Button>
            </div>
          </div>

          <Textarea
            value={localPlan.monthlyPlot || ''}
            onChange={(e) => handlePlanUpdate({ monthlyPlot: e.target.value, plotPerfect: false })}
            placeholder="Describe the suspenseful monthly overview I'll use to craft each week."
            rows={5}
            disabled={!canEdit}
          />
          <div className="flex items-center justify-end gap-2">
            <span className="text-xs text-slate-500">Auto-saves as you type</span>
          </div>
        </div>
      )}

      {/* Weekly Subplots */}
      {localPlan.monthlyPlot && (
        <div className="rounded-xl sm:rounded-2xl border border-slate-200/80 bg-white/80 backdrop-blur-sm shadow-sm p-3 sm:p-4 lg:p-6 space-y-3 sm:space-y-4 min-w-0">
          <h2 className="text-lg sm:text-xl font-semibold text-slate-900">Weekly Subplots</h2>
          <p className="text-xs text-slate-500">Unlock each week sequentially. Mark a week as perfect to progress to the next.</p>
          <div className="space-y-6">
            {[1, 2, 3, 4].map((week) => {
              const weekPlan = localPlan.weekly[week] || createDefaultWeekPlan(week);
              const previousPerfect = week === 1 ? localPlan.plotPerfect : localPlan.weekly[week - 1]?.subplotPerfect;
              const isLocked = !previousPerfect;
              const isLoading = generatingWeek === week;

              return (
                <div key={week} className={`border rounded-xl p-4 transition-all ${isLocked ? 'opacity-70 pointer-events-none border-slate-200 bg-slate-50/50' : 'border-slate-200 bg-white'}`}>
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-3">
                    <div>
                      <h3 className="font-medium text-primary-900">Week {week}</h3>
                      <p className="text-xs text-slate-500">Focus the story for this week and I'll generate the rest for you.</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        onClick={() => handleGenerateWeek(week)}
                        loading={isLoading}
                        className="flex items-center text-xs"
                        disabled={!canEdit || isLocked}
                      >
                        <Wand2 size={14} className="mr-1" />
                        Generate for Me
                      </Button>
                      <Button
                        variant={weekPlan.subplotPerfect ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => handleWeekUpdate(week, { subplotPerfect: !weekPlan.subplotPerfect }, true)}
                        className="flex items-center text-xs"
                        disabled={!canEdit || isLocked}
                      >
                        <ShieldCheck size={14} className="mr-1" />
                        {weekPlan.subplotPerfect ? 'Perfect' : 'Mark Perfect'}
                      </Button>
                    </div>
                  </div>

                  <Input
                    label="Theme for the Week (optional)"
                    value={weekPlan.custom_theme || ''}
                    onChange={(e) => handleWeekUpdate(week, { custom_theme: e.target.value })}
                    placeholder="e.g. Customer wins with product-led innovation"
                    disabled={!canEdit || isLocked}
                  />

                  <Textarea
                    label="Weekly Subplot"
                    value={weekPlan.subplot || ''}
                    onChange={(e) => handleWeekUpdate(week, { subplot: e.target.value })}
                    placeholder={`Describe the story beat for week ${week}.`}
                    rows={4}
                    className="mt-3"
                    disabled={!canEdit || isLocked}
                  />
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Season Complete Section */}
      {isSeasonComplete && (
        <div className="rounded-2xl border border-green-500/30 bg-green-500/10 p-6 shadow-sm">
          <div className="text-center">
            <div className="flex items-center justify-center mb-4">
              <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center">
                <Target className="w-8 h-8 text-green-400" />
              </div>
            </div>
            <h3 className="text-xl font-semibold text-green-300 mb-2">Season Planning Complete! 🎉</h3>
            <p className="text-green-200 mb-6">
              Your monthly theme, plot, and weekly subplots are ready. Time to create your detailed content calendar!
            </p>
            {onPageChange && (
              <Button
                onClick={() => onPageChange('monthly')}
                size="lg"
                className="bg-green-600 hover:bg-green-500"
              >
                Go to Content Calendar →
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Preview Modal */}
      {showPreviewModal && previewContent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="rounded-2xl border border-primary-200 bg-white max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
            {/* Modal Header */}
            <div className="bg-gradient-to-br from-primary-600 via-purple-600 to-slate-900 text-white p-6 flex items-start gap-4">
              <PyAvatar size="lg" className="ring-2 ring-white/30 shadow-lg" />
              <div className="flex-1">
                <h3 className="text-xl sm:text-2xl font-semibold mb-2">Here's the month's scripting</h3>
                <p className="text-sm text-white/80 leading-relaxed">
                  {previewContent.monthlyPlot.substring(0, 150)}...
                </p>
              </div>
              <button
                onClick={() => setShowPreviewModal(false)}
                className="text-white/80 hover:text-white transition p-1"
                aria-label="Close preview"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-white">
              <div>
                <h4 className="text-sm font-semibold uppercase tracking-wide text-slate-500 mb-2">Monthly Theme</h4>
                <p className="text-lg font-semibold text-primary-900">{previewContent.theme}</p>
              </div>

              <div>
                <h4 className="text-sm font-semibold uppercase tracking-wide text-slate-500 mb-2">Monthly Plot</h4>
                <p className="text-base text-slate-700 leading-relaxed">{previewContent.monthlyPlot}</p>
              </div>

              {/* Weekly Breakdown */}
              {previewContent.weeks && Object.keys(previewContent.weeks).length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold uppercase tracking-wide text-slate-500 mb-3">Weekly Subplots</h4>
                  <div className="space-y-4">
                    {[1, 2, 3, 4].map(weekNum => {
                      const week = previewContent.weeks?.[weekNum];
                      if (!week || !week.subplot) return null;
                      return (
                        <div key={weekNum} className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                          <h5 className="text-sm font-semibold text-primary-900 mb-2">
                            Week {weekNum}{week.theme ? `: ${week.theme}` : ''}
                          </h5>
                          <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
                            {week.subplot}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <div>
                <h4 className="text-sm font-semibold uppercase tracking-wide text-slate-500 mb-3">Full Narrative Breakdown</h4>
                <div className="prose prose-sm max-w-none text-slate-700 whitespace-pre-wrap bg-slate-50 rounded-lg p-4 border border-slate-200">
                  {previewContent.fullResponse}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="border-t border-slate-200 p-4 bg-slate-50 flex items-center justify-between gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowPreviewModal(false)}
              >
                Close
              </Button>
              <Button
                size="sm"
                onClick={async () => {
                  try {
                    // Build weekly subplots text
                    let weeksText = '';
                    if (previewContent.weeks && Object.keys(previewContent.weeks).length > 0) {
                      weeksText = '\n\nWEEKLY SUBPLOTS:\n';
                      [1, 2, 3, 4].forEach(weekNum => {
                        const week = previewContent.weeks?.[weekNum];
                        if (week && week.subplot) {
                          weeksText += `\nWEEK ${weekNum}${week.theme ? ` - ${week.theme}` : ''}:\n${week.subplot}\n`;
                        }
                      });
                    }

                    await navigator.clipboard.writeText(
                      `MONTHLY THEME: ${previewContent.theme}\n\n` +
                      `MONTHLY PLOT:\n${previewContent.monthlyPlot}` +
                      weeksText +
                      `\n\nFULL BREAKDOWN:\n${previewContent.fullResponse}`
                    );
                    setStatusMessage('✨ Copied to clipboard!');
                    setTimeout(() => setStatusMessage(null), 3000);
                  } catch (error) {
                    console.error('Failed to copy:', error);
                    setStatusMessage('Failed to copy to clipboard');
                  }
                }}
                className="flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                Copy to Clipboard
              </Button>
            </div>
          </div>
        </div>
      )}
        </div>
      </div>
    </div>
  );
};
