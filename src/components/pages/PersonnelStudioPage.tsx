import React, { useEffect, useMemo, useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Brand, Character, CastGenerationOptions, AgeRange, CharacterPerfectFields } from '../../types';
import { Textarea } from '../common/Textarea';
import { Button } from '../common/Button';
import { CharacterFormWithAutosave } from '../plot/CharacterFormWithAutosave';
import { CharacterStudio } from '../studio/CharacterStudio';
import { CharacterStudioOnboarding } from '../studio/CharacterStudioOnboarding';
import { NoBrandPlaceholder } from '../common/NoBrandPlaceholder';
import { PyNotification } from '../common/PyNotification';
import { ANDORA_CHAR_LIMITS } from '../../utils/constants';
import { debounce } from '../../utils/debounce';
import { usePyNotification } from '../../hooks/usePyNotification';
import { useAIModelPreference } from '../../hooks/useAIModelPreference';
import { useAuth } from '../../hooks/useAuth';
import { apiClient } from '../../lib/api';
import { aiService } from '../../services/aiService';
import { Wand2, Save, Users, RefreshCw, Sparkles, CheckCircle, CheckCircle2, ArrowRight, ChevronLeft, ChevronRight, Copy, Star, Compass, ChevronDown, ChevronUp, Volume2, VolumeX } from 'lucide-react';
import type { CharacterFieldKey } from '../plot/CharacterFormField';
import { TOTAL_CHARACTER_FIELD_COUNT } from '../plot/characterFieldConstants';
import type { AIModel } from '../common/AIModelSwitcher';

interface PersonnelStudioPageProps {
  brand: Brand | null;
  onBrandUpdate: (updates: Partial<Brand>) => void;
  generateCast: (brandId: string, options: CastGenerationOptions) => Promise<Character[]>;
  prefillNarrative: (brandId: string) => void;
  isGenerating: boolean;
  onStudioStateChange?: (isOpen: boolean) => void;
}

const generateUUID = () => {
  return `new-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

type CharacterSuggestionMap = Partial<Record<CharacterFieldKey, string>>;

const SUGGESTABLE_FIELDS: CharacterFieldKey[] = [
  'name',
  'character_name',
  'role',
  'about',
  'personality',
  'age_range',
  'work_mode',
  'persona',
  'backstory',
  'voice',
  'emotional_range',
  'personality_tags',
];

// Fields that show suggestion box below (with Copy/Apply/Refine buttons)
// All other fields are auto-applied directly
const FIELDS_REQUIRING_CONFIRMATION: CharacterFieldKey[] = [
  'persona',
  'personality',
  'backstory',
  'voice',
  'emotional_range',
  'personality_tags',
];

const LIST_FIELD_KEYS: CharacterFieldKey[] = ['emotional_range', 'personality_tags'];

const NON_THINKING_MODEL: AIModel = 'claude-haiku-4.5';

const formatPersonalityType = (value?: string, fallback?: string) => {
  if (!value) return fallback || '';

  const upper = value.toUpperCase();
  const patternMatch = upper.match(/[A-Z]{4}-[A-Z]/);
  if (patternMatch) {
    return patternMatch[0];
  }

  const lettersOnly = upper.replace(/[^A-Z]/g, '');
  if (lettersOnly.length >= 5) {
    return `${lettersOnly.slice(0, 4)}-${lettersOnly.slice(4, 5)}`;
  }

  return fallback || upper;
};

const parseListValue = (value: string): string[] => {
  return value
    .split(/[,\n]/)
    .map(entry => entry.trim())
    .filter(Boolean);
};

const stringifyListValue = (value: unknown): string | null => {
  if (Array.isArray(value)) {
    const cleaned = value
      .map(item => (typeof item === 'string' ? item.trim() : String(item || '').trim()))
      .filter(Boolean);
    return cleaned.length ? cleaned.join('\n') : null;
  }

  if (typeof value === 'string') {
    return value.trim() ? value : null;
  }

  return null;
};

const prepareCharacterForAI = (character: Character) => ({
  id: character.id,
  name: character.name,
  character_name: character.character_name || character.real_name, // Fallback to legacy real_name
  role: character.role,
  about: character.about,
  personality: character.personality,
  age_range: character.age_range,
  work_mode: character.work_mode,
  persona: character.persona,
  backstory: character.backstory,
  voice: character.voice,
  emotional_range: character.emotional_range,
  personality_tags: character.personality_tags,
  perfect_fields: character.perfect_fields || {}
});

const prepareCharactersForAI = (list: Character[]) => list.map(prepareCharacterForAI);

export const PersonnelStudioPage: React.FC<PersonnelStudioPageProps> = ({ brand, onBrandUpdate, generateCast, prefillNarrative, isGenerating, onStudioStateChange }) => {
  // AI model preference hook (default to FREE Gemini)
  const [selectedModel, setSelectedModel] = useAIModelPreference('gemini-2.5-flash');

  // Check if user has admin rights
  const { isAdmin, authUser } = useAuth();

  if (!brand) {
    return (
      <NoBrandPlaceholder
        title="Define Your Company's Mission and Structure"
        description="Outline your company's mission, vision, and structure. Generate AI-powered HR roles and job descriptions that align with your business needs."
      />
    );
  }

  // Character state management
  const [characters, setCharacters] = useState<Character[]>([]);
  const [characterSuggestions, setCharacterSuggestions] = useState<Record<string, CharacterSuggestionMap>>({});
  const [isGeneratingChar, setIsGeneratingChar] = useState(false);
  const [isTraining, setIsTraining] = useState(false);
  const [trainingComplete, setTrainingComplete] = useState(false);
  const [isLoadingCharacters, setIsLoadingCharacters] = useState(true);
  const [refiningFieldByCharacter, setRefiningFieldByCharacter] = useState<Record<string, CharacterFieldKey | null>>({});
  const [activeCharacterIndex, setActiveCharacterIndex] = useState(0);
  const [isStudioOpen, setIsStudioOpen] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  // Start narrative expanded by default so users can immediately edit imperfect fields
  const [isNarrativeExpanded, setIsNarrativeExpanded] = useState(true);
  const [isCastExpanded, setIsCastExpanded] = useState(true);
  const initialCharacterRequestRef = useRef(false);
  const navigate = useNavigate();

  // Check if user has seen onboarding
  useEffect(() => {
    const hasSeenOnboarding = localStorage.getItem('andora_character_studio_onboarded');
    if (!hasSeenOnboarding && characters.length === 0) {
      setShowOnboarding(true);
    }
  }, [characters.length]);

  const handleOnboardingComplete = () => {
    localStorage.setItem('andora_character_studio_onboarded', 'true');
    setShowOnboarding(false);
  };

  const ensureCharacterArray = useCallback((value: unknown): Character[] => {
    if (!value) return [];

    if (Array.isArray(value)) {
      return value as Character[];
    }

    if (typeof value === 'string') {
      try {
        const parsed = JSON.parse(value);
        return ensureCharacterArray(parsed);
      } catch (error) {
        console.warn('Unable to parse characters payload string from AI orchestrator:', {
          payload: value,
          error,
        });
        return [];
      }
    }

    if (typeof value === 'object') {
      const record = value as Record<string, unknown>;

      if (Array.isArray(record.characters)) {
        return ensureCharacterArray(record.characters);
      }

      if (typeof record.characters === 'string') {
        return ensureCharacterArray(record.characters);
      }

      if (Array.isArray(record.cast)) {
        return ensureCharacterArray(record.cast);
      }

      if (typeof record.cast === 'string') {
        return ensureCharacterArray(record.cast);
      }

      if (record.result !== undefined) {
        return ensureCharacterArray(record.result);
      }

      if (record.data !== undefined) {
        return ensureCharacterArray(record.data);
      }

      if (Array.isArray(record.items)) {
        return ensureCharacterArray(record.items);
      }

      const entries = Object.values(record);
      const objectValues = entries.filter(item => item && typeof item === 'object');

      if (
        objectValues.length > 0 &&
        objectValues.length === entries.length &&
        objectValues.every(item => !Array.isArray(item))
      ) {
        return objectValues as Character[];
      }

      const values = objectValues;
      for (const nested of values) {
        const normalized = ensureCharacterArray(nested);
        if (normalized.length > 0) {
          return normalized;
        }
      }
    }

    console.warn('Unexpected characters payload from AI orchestrator:', value);
    return [];
  }, []);

  // Py notification for loading states
  const { message: pyMessage, modelInfo: notificationModel, isVisible: showPyNotification, showNotification, hideNotification, updateMessage } = usePyNotification();

  // Refinement state
  const [refinementSuggestions, setRefinementSuggestions] = useState<{
    why?: string;
    problem?: string;
    solution?: string;
    cta?: string;
    failure?: string;
    success?: string;
  } | null>(null);
  const [isRefining, setIsRefining] = useState(false);

  // Load characters from database on mount
  useEffect(() => {
    const loadCharacters = async () => {
      if (!brand?.brand_id) return;

      try {
        setIsLoadingCharacters(true);
        const loadedCharacters = await apiClient.getCharacters(brand.brand_id);
        setCharacters(loadedCharacters);
        setCharacterSuggestions({});
        if (loadedCharacters.length > 0) {
          setActiveCharacterIndex(prev => Math.min(prev, loadedCharacters.length - 1));
        } else {
          setActiveCharacterIndex(0);
        }
      } catch (error) {
        console.error('Failed to load characters:', error);
      } finally {
        setIsLoadingCharacters(false);
      }
    };

    loadCharacters();
  }, [brand?.brand_id]);

  useEffect(() => {
    setActiveCharacterIndex(prev => {
      if (characters.length === 0) return 0;
      return Math.min(prev, characters.length - 1);
    });

    if (characters.length > 0) {
      initialCharacterRequestRef.current = false;
    }
  }, [characters.length]);

  // Remove stale suggestions when characters change or fields are marked perfect
  useEffect(() => {
    setCharacterSuggestions(prev => {
      let changed = false;
      const updated: Record<string, CharacterSuggestionMap> = {};

      characters.forEach(char => {
        const suggestions = prev[char.id];
        if (!suggestions) return;

        const perfect = char.perfect_fields || {};
        const filteredEntries = Object.entries(suggestions).filter(([field]) => !perfect[field as CharacterFieldKey]);

        if (filteredEntries.length === 0) {
          if (Object.keys(suggestions).length > 0) {
            changed = true;
          }
          return;
        }

        const nextSuggestions = Object.fromEntries(filteredEntries) as CharacterSuggestionMap;
        if (!changed) {
          const originalEntries = Object.entries(suggestions);
          if (filteredEntries.length !== originalEntries.length) {
            changed = true;
          } else {
            for (const [key, value] of originalEntries) {
              if (nextSuggestions[key as CharacterFieldKey] !== value) {
                changed = true;
                break;
              }
            }
          }
        }

        updated[char.id] = nextSuggestions;
      });

      Object.keys(prev).forEach(id => {
        if (!characters.some(char => char.id === id)) {
          changed = true;
        }
      });

      if (!changed) {
        const sameKeys = Object.keys(prev).length === Object.keys(updated).length && Object.keys(prev).every(id => !!updated[id]);
        if (sameKeys) {
          return prev;
        }
      }

      return updated;
    });
  }, [characters]);

  useEffect(() => {
    setRefiningFieldByCharacter(prev => {
      const updated: Record<string, CharacterFieldKey | null> = {};
      characters.forEach(char => {
        if (prev[char.id]) {
          updated[char.id] = prev[char.id];
        }
      });
      return updated;
    });
  }, [characters]);

  // Local state for narrative fields to prevent glitching
  const [localNarrative, setLocalNarrative] = useState({
    narrative_why: brand.narrative_why || '',
    narrative_problem: brand.narrative_problem || '',
    narrative_solution: brand.narrative_solution || '',
    narrative_cta: brand.narrative_cta || '',
    narrative_failure: brand.narrative_failure || '',
    narrative_success: brand.narrative_success || ''
  });

  // Track if user is currently typing to prevent cursor jumps
  const isUserTypingRef = useRef(false);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const prevBrandIdRef = useRef(brand.brand_id);

  // Debounced update function for narrative fields
  const debouncedNarrativeUpdate = useRef(
    debounce((updates: Partial<Brand>) => {
      onBrandUpdate(updates);
    }, 1000)
  ).current;

  // Local state for perfect fields
  const [perfectFields, setPerfectFields] = useState(brand.narrative_perfect_fields || {});

  // Update local narrative when brand ID changes (user switched brands)
  useEffect(() => {
    const brandIdChanged = brand.brand_id !== prevBrandIdRef.current;

    if (brandIdChanged) {
      console.log('🔄 PersonnelStudioPage: Brand switched, syncing data');
      setLocalNarrative({
        narrative_why: brand.narrative_why || '',
        narrative_problem: brand.narrative_problem || '',
        narrative_solution: brand.narrative_solution || '',
        narrative_cta: brand.narrative_cta || '',
        narrative_failure: brand.narrative_failure || '',
        narrative_success: brand.narrative_success || ''
      });
    }

    const newPerfectFields = brand.narrative_perfect_fields || {};
    setPerfectFields(newPerfectFields);
    prevBrandIdRef.current = brand.brand_id;
  }, [brand.brand_id, brand.narrative_perfect_fields]); // Only watch brand_id and perfect_fields - AI completion is handled separately

  // Sync when AI generation completes OR when brand narrative fields change (but not when user is typing)
  const prevIsGenerating = useRef(isGenerating);
  useEffect(() => {
    // Detect if AI just finished generating
    const aiJustFinished = prevIsGenerating.current && !isGenerating;

    // If user is currently typing AND AI hasn't just finished, don't sync (prevents cursor jumps)
    // But if AI just finished, ALWAYS sync to show the new generated content
    if (isUserTypingRef.current && !aiJustFinished) {
      prevIsGenerating.current = isGenerating;
      return;
    }

    if (aiJustFinished) {
      console.log('🔄 PersonnelStudioPage: AI generation complete, force syncing results');
      // Clear typing state since AI content takes priority
      isUserTypingRef.current = false;
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = null;
      }
    }

    // Always sync from brand prop to local state when not typing or when AI finished
    // This ensures AI-generated values are reflected immediately
    setLocalNarrative({
      narrative_why: brand.narrative_why || '',
      narrative_problem: brand.narrative_problem || '',
      narrative_solution: brand.narrative_solution || '',
      narrative_cta: brand.narrative_cta || '',
      narrative_failure: brand.narrative_failure || '',
      narrative_success: brand.narrative_success || ''
    });

    prevIsGenerating.current = isGenerating;
  }, [isGenerating, brand.narrative_why, brand.narrative_problem, brand.narrative_solution, brand.narrative_cta, brand.narrative_failure, brand.narrative_success]);


  // Show notification when generating narrative
  useEffect(() => {
    if (isGenerating) {
      showNotification('ai_prefill_narrative');
    } else {
      hideNotification();
    }
  }, [isGenerating, showNotification, hideNotification]);

  // Cleanup typing timeout on unmount
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, []);

  const handleNarrativeChange = useCallback((field: keyof Brand, value: string) => {
    // Mark that user is typing
    isUserTypingRef.current = true;

    // Clear any existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Update local state immediately for smooth typing
    setLocalNarrative(prev => ({ ...prev, [field]: value }));

    // Debounce the actual brand update
    debouncedNarrativeUpdate({ [field]: value });

    // Mark typing as complete after 1.5 seconds of no input
    typingTimeoutRef.current = setTimeout(() => {
      isUserTypingRef.current = false;
    }, 1500);
  }, [debouncedNarrativeUpdate]);

  const togglePerfectField = async (field: 'why' | 'problem' | 'solution' | 'cta' | 'failure' | 'success') => {
    console.log('🎯 togglePerfectField called for:', field);
    console.log('🎯 Current perfectFields:', perfectFields);

    // Map short field names to full narrative field names
    const fieldKey = `narrative_${field}` as keyof Brand['narrative_perfect_fields'];

    const newPerfectFields = {
      ...perfectFields,
      [fieldKey]: !perfectFields[fieldKey]
    };

    console.log('🎯 New perfectFields:', newPerfectFields);
    setPerfectFields(newPerfectFields);

    // Save immediately (don't use debounced update)
    try {
      console.log('🎯 Calling apiClient.updateBrand with:', { narrative_perfect_fields: newPerfectFields });
      const result = await apiClient.updateBrand(brand.brand_id, { narrative_perfect_fields: newPerfectFields });
      console.log('🎯 API response:', result);
      // Also update parent state
      onBrandUpdate({ narrative_perfect_fields: newPerfectFields });
      console.log('🎯 Perfect field saved successfully!');
    } catch (error) {
      console.error('❌ Failed to save perfect field:', error);
      // Revert on error
      setPerfectFields(perfectFields);
    }
  };

  const handleAIPrefillNarrative = () => {
    prefillNarrative(brand.brand_id);
    setRefinementSuggestions(null); // Clear refinements when generating fresh
  };

  // Check if all narrative fields are filled
  const allNarrativeFieldsFilled = useMemo(() => {
    return !!(
      localNarrative.narrative_why?.trim() &&
      localNarrative.narrative_problem?.trim() &&
      localNarrative.narrative_solution?.trim() &&
      localNarrative.narrative_cta?.trim() &&
      localNarrative.narrative_failure?.trim() &&
      localNarrative.narrative_success?.trim()
    );
  }, [localNarrative]);

  // Handle refinement
  const handleRefineNarrative = async () => {
    if (!allNarrativeFieldsFilled) return;

    setIsRefining(true);
    showNotification('ai_refine_narrative');
    try {
      const response = await apiClient.prefillNarrative({
        brandName: brand.brand_name,
        tagline: brand.taglines,
        about: brand.about,
        vision: brand.vision,
        mission: brand.mission,
        persona: brand.persona,
        buyerProfile: brand.buyer_profile,
        products: brand.products,
        voice: brand.voice,
        existingNarrative: {
          why: localNarrative.narrative_why,
          problem: localNarrative.narrative_problem,
          solution: localNarrative.narrative_solution,
          cta: localNarrative.narrative_cta,
          failure: localNarrative.narrative_failure,
          success: localNarrative.narrative_success
        },
        perfectFields: perfectFields
      });

      if (response?.narrative) {
        setRefinementSuggestions(response.narrative);
      }
    } catch (error) {
      console.error('Failed to refine narrative:', error);
    } finally {
      setIsRefining(false);
      hideNotification();
    }
  };

  const copySuggestion = (field: keyof typeof refinementSuggestions, value: string) => {
    const fieldMap: Record<string, keyof Brand> = {
      why: 'narrative_why',
      problem: 'narrative_problem',
      solution: 'narrative_solution',
      cta: 'narrative_cta',
      failure: 'narrative_failure',
      success: 'narrative_success'
    };
    handleNarrativeChange(fieldMap[field], value);
    // Remove the suggestion after copying
    setRefinementSuggestions(prev => prev ? { ...prev, [field]: undefined } : null);
  };

  // Copy all narrative fields to clipboard (admin only)
  const handleCopyAllStrategy = async () => {
    if (!isAdmin) {
      alert('This feature is only available for admin accounts');
      return;
    }

    const narrativeText = `=== COMPANY STRATEGY ===

Mission/Purpose: ${localNarrative.narrative_why || '(not set)'}

Challenge: ${localNarrative.narrative_problem || '(not set)'}

Approach: ${localNarrative.narrative_solution || '(not set)'}

Key Communication Phrases: ${localNarrative.narrative_cta || '(not set)'}

Potential Risks: ${localNarrative.narrative_failure || '(not set)'}

Success Metrics: ${localNarrative.narrative_success || '(not set)'}

Generated by Py Personnel Studio - ${new Date().toLocaleString()}`;

    try {
      await navigator.clipboard.writeText(narrativeText);
      alert('✨ All strategy fields copied to clipboard!');
    } catch (error) {
      console.error('Failed to copy:', error);
      alert('Failed to copy to clipboard');
    }
  };

  // Copy all characters and their fields to clipboard (admin only)
  const handleCopyAllTeamMembers = async () => {
    if (!isAdmin) {
      alert('This feature is only available for admin accounts');
      return;
    }

    if (characters.length === 0) {
      alert('No team members to copy');
      return;
    }

    let charactersText = `=== TEAM ROSTER ===\n\n`;

    characters.forEach((char, index) => {
      const perfectFieldCount = Object.values(char.perfect_fields || {}).filter(Boolean).length;

      charactersText += `TEAM MEMBER ${index + 1}: ${char.character_name || char.name || 'Untitled'}\n`;
      charactersText += `Status: ${char.is_muted ? 'INACTIVE' : 'ACTIVE'} | Defined Fields: ${perfectFieldCount}/${TOTAL_CHARACTER_FIELD_COUNT}\n`;
      charactersText += `${'='.repeat(60)}\n\n`;

      charactersText += `Role Label: ${char.name || '(not set)'}\n`;
      charactersText += `Name: ${char.character_name || '(not set)'}\n`;
      charactersText += `Role: ${char.role || '(not set)'}\n`;
      charactersText += `Age Range: ${char.age_range || '(not set)'}\n`;
      charactersText += `Work Mode: ${char.work_mode || '(not set)'}\n\n`;

      charactersText += `About:\n${char.about || '(not set)'}\n\n`;

      charactersText += `Personality Type: ${char.personality || '(not set)'}\n\n`;

      charactersText += `Persona:\n${char.persona || '(not set)'}\n\n`;

      if (char.backstory) {
        charactersText += `Professional Background:\n${char.backstory}\n\n`;
      }

      if (char.voice) {
        charactersText += `Communication Style:\n${char.voice}\n\n`;
      }

      if (char.emotional_range && char.emotional_range.length > 0) {
        charactersText += `Behavioral Traits:\n${char.emotional_range.join('\n')}\n\n`;
      }

      if (char.personality_tags && char.personality_tags.length > 0) {
        charactersText += `Skill Tags:\n${char.personality_tags.join('\n')}\n\n`;
      }

      charactersText += `\n`;
    });

    charactersText += `\nGenerated by Py Personnel Studio - ${new Date().toLocaleString()}`;

    try {
      await navigator.clipboard.writeText(charactersText);
      alert(`✨ All ${characters.length} team member(s) copied to clipboard!`);
    } catch (error) {
      console.error('Failed to copy:', error);
      alert('Failed to copy to clipboard');
    }
  };

  // Character management functions
  const addTeamMember = () => {
    // Check brand type and enforce character limit
    const isIndividual = (brand?.brand_type || 'organization') === 'individual';
    if (isIndividual && characters.length >= 1) {
      alert('Individual brands are limited to 1 team member (your personal brand profile). Switch to Organization brand type to add more team members.');
      return;
    }

    const newChar: Character = {
      id: generateUUID(),
      name: '',
      character_name: '',
      role: '',
      about: '',
      personality: '',
      persona: '',
      backstory: '',
      voice: '',
      emotional_range: [],
      personality_tags: [],
      perfect_fields: {}
    };
    const updated = [...characters, newChar];
    setCharacters(updated);
    setActiveCharacterIndex(updated.length - 1);
  };

  const handleEnterStudio = () => {
    if (characters.length === 0) {
      if (!initialCharacterRequestRef.current) {
        initialCharacterRequestRef.current = true;
        addTeamMember();
      }
      setIsStudioOpen(true);
      onStudioStateChange?.(true);
      return;
    }

    setIsStudioOpen(true);
    onStudioStateChange?.(true);
  };

  const goToPreviousMember = () => {
    if (characters.length <= 1) return;
    setActiveCharacterIndex(prev => (prev - 1 + characters.length) % characters.length);
  };

  const goToNextMember = () => {
    if (characters.length <= 1) return;
    setActiveCharacterIndex(prev => (prev + 1) % characters.length);
  };

  const handleSuggestionApply = (characterId: string, field: CharacterFieldKey, value: string) => {
    const index = characters.findIndex(c => c.id === characterId);
    if (index === -1) return;

    const updates: Partial<Character> = {};

    switch (field) {
      case 'age_range':
        updates.age_range = value as AgeRange;
        break;
      case 'work_mode':
        updates.work_mode = value as 'onsite' | 'remote' | 'hybrid';
        break;
      case 'personality':
        updates.personality = formatPersonalityType(value, characters[index].personality);
        break;
      case 'persona':
        updates.persona = value;
        break;
      case 'backstory':
        updates.backstory = value;
        break;
      case 'voice':
        updates.voice = value;
        break;
      case 'emotional_range':
        updates.emotional_range = parseListValue(value);
        break;
      case 'personality_tags':
        updates.personality_tags = parseListValue(value);
        break;
      case 'name':
        updates.name = value;
        break;
      case 'character_name':
        updates.character_name = value;
        break;
      case 'role':
        updates.role = value;
        break;
      case 'about':
        updates.about = value;
        break;
      default:
        break;
    }

    if (Object.keys(updates).length === 0) {
      return;
    }

    const nextCharacter: Character = { ...characters[index], ...updates };
    updateCharacter(index, updates);

    setCharacterSuggestions(prev => {
      const existing = prev[characterId];
      if (!existing) return prev;

      const nextSuggestions = { ...existing } as CharacterSuggestionMap;
      delete nextSuggestions[field];

      if (Object.keys(nextSuggestions).length === 0) {
        const { [characterId]: _removed, ...rest } = prev;
        return rest;
      }

      return {
        ...prev,
        [characterId]: nextSuggestions
      };
    });

    saveTeamMember(nextCharacter).catch(error => {
      console.error('Failed to save team member after applying suggestion:', error);
    });
  };

  const handleFieldRefine = async (characterId: string, field: CharacterFieldKey) => {
    const targetCharacter = characters.find(char => char.id === characterId);
    if (!targetCharacter) {
      return;
    }

    const perfect = targetCharacter.perfect_fields || {};
    if (perfect[field as keyof CharacterPerfectFields]) {
      return;
    }

    setRefiningFieldByCharacter(prev => ({ ...prev, [characterId]: field }));

    try {
      const suggestion = await aiService.refineCharacterField(
        brand,
        field,
        targetCharacter,
        characters,
        (authUser?.preferred_ai_model as AIModel) || 'gemini-2.5-flash'
      );

      if (!suggestion) {
        return;
      }

      setCharacterSuggestions(prev => ({
        ...prev,
        [characterId]: {
          ...(prev[characterId] || {}),
          [field]: suggestion,
        },
      }));
    } catch (error) {
      console.error('Failed to refine character field:', error);
    } finally {
      setRefiningFieldByCharacter(prev => ({ ...prev, [characterId]: null }));
    }
  };

  const updateCharacter = (index: number, updates: Partial<Character>) => {
    const updated = [...characters];
    updated[index] = { ...updated[index], ...updates };
    setCharacters(updated);
  };

const saveTeamMember = async (character: Character) => {
    try {
      console.log('🔍 PersonnelStudioPage.saveTeamMember CALLED:', {
        id: character.id,
        name: character.name,
        character_name: character.character_name,
        hasCharacterName: 'character_name' in character,
        allKeys: Object.keys(character)
      });

      if (character.id && character.id.startsWith('new-')) {
        // Create new character in database
        const response = await apiClient.createCharacter({
          brand_id: brand.brand_id,
          ...character
        });
        // Update local state with server ID
        const index = characters.findIndex(c => c.id === character.id);
        if (index >= 0) {
          const updated = [...characters];
          updated[index] = { ...updated[index], id: response.id };
          setCharacters(updated);
        }
      } else {
        // Update existing character in database
        await apiClient.updateCharacter(character.id, character);
      }
    } catch (error) {
      console.error('Failed to save team member:', error);
      throw error;
    }
  };

  const deleteTeamMember = async (index: number) => {
    const char = characters[index];
    try {
      if (char.id && !char.id.startsWith('new-')) {
        await apiClient.deleteCharacter(char.id);
      }
      const updated = characters.filter((_, i) => i !== index);
      setCharacters(updated);
      setActiveCharacterIndex(prev => {
        if (updated.length === 0) return 0;
        return Math.min(prev, updated.length - 1);
      });
      setCharacterSuggestions(prev => {
        if (!prev[char.id]) return prev;
        const { [char.id]: _removed, ...rest } = prev;
        return rest;
      });
    } catch (error) {
      console.error('Failed to delete team member:', error);
    }
  };

  const toggleMemberActivity = async (index: number) => {
    const char = characters[index];
    try {
      if (char.id && !char.id.startsWith('new-')) {
        const updated = await apiClient.toggleCharacterMute(char.id);
        const updatedCharacters = [...characters];
        updatedCharacters[index] = { ...updatedCharacters[index], is_muted: updated.is_muted };
        setCharacters(updatedCharacters);

        // Update brand state so SeasonPage gets the latest character mute state
        onBrandUpdate({ team_management: updatedCharacters });
      }
    } catch (error) {
      console.error('Failed to toggle member activity:', error);
    }
  };

  const generateMemberProfile = async (index: number) => {
    const char = characters[index];

    // Use character_name if available, otherwise fall back to name (dramatic role)
    // Backend will use this as the character reference in the generated persona
    const characterReference = char.character_name || char.name;
    if (!characterReference || !characterReference.trim()) {
      alert('Please enter at least a name for the team member');
      return;
    }

    setIsGeneratingChar(true);
    showNotification('ai_resolve_cast');
    try {
      // Send ALL characters for context, but mark which one is the target
      // This helps AI understand the ensemble while focusing on the target character
      const allCharactersForContext = prepareCharactersForAI(characters).map((c, idx) => ({
        ...c,
        _isTarget: idx === index  // Mark the target character
      }));

      console.log('🔍 FRONTEND: Sending request for team member profile', {
        targetIndex: index,
        targetName: char.name,
        targetCharacterName: char.character_name,
        totalCharacters: allCharactersForContext.length,
        targetFlagged: allCharactersForContext.find((c: any) => c._isTarget)?.name
      });

      const response = await apiClient.generateCastWithAI(
        {
          brandName: brand.brand_name,
          about: brand.about,
          persona: brand.persona,
          buyerProfile: brand.buyer_profile
        },
        allCharactersForContext,  // All characters for context
        selectedModel
      );

      console.log('🔍 FRONTEND: Response received', {
        model: response?.metadata?.model || selectedModel,
        tokens: response?.metadata?.tokensUsed,
        charactersReturned: response?.characters?.length,
        returnedCharacters: response?.characters?.map((c: any) => ({
          id: c.id,
          name: c.name,
          character_name: c.character_name,
          personaPreview: c.persona?.substring(0, 100)
        }))
      });

      const generatedList = ensureCharacterArray(
        response?.characters ?? response?.rawCharacters ?? response?.cast ?? response
      );

      // Find the character that matches our target
      const generated =
        generatedList.find(g => g?.id === char.id) ||
        generatedList.find(g => Boolean((g as any)?._isTarget)) ||
        generatedList.find(g => {
          const generatedName = typeof g?.name === 'string' ? g.name.toLowerCase() : '';
          const currentName = typeof char.name === 'string' ? char.name.toLowerCase() : '';
          return generatedName !== '' && generatedName === currentName;
        }) ||
        generatedList[index] ||
        generatedList[0];

      console.log('🔍 FRONTEND: Matched generated character:', {
        matchedById: generatedList.find(g => g.id === char.id) ? 'YES' : 'NO',
        matchedByIndex: !!generatedList[index],
        generatedId: generated?.id,
        generatedName: generated?.name,
        generatedPersonaPreview: generated?.persona?.substring(0, 100)
      });

      if (!generated) {
        console.warn('No character returned by AI for the requested persona help', {
          targetIndex: index,
          targetName: char.name,
          response
        });
        return;
      }

      const perfectFields = char.perfect_fields || {};
      const suggestion: CharacterSuggestionMap = {};

      SUGGESTABLE_FIELDS.forEach(field => {
        if (perfectFields[field as keyof CharacterPerfectFields]) {
          return;
        }

        if (field === 'personality') {
          const formatted = formatPersonalityType(generated.personality, char.personality);
          const existing = formatPersonalityType(char.personality, char.personality);
          if (formatted && formatted !== existing) {
            suggestion[field] = formatted;
          }
          return;
        }

        const generatedValue = (generated as any)[field];
        if (!generatedValue) return;

        if (LIST_FIELD_KEYS.includes(field)) {
          const suggestionString = stringifyListValue(generatedValue);
          if (!suggestionString) return;

          const currentString = stringifyListValue((char as any)[field]);
          if (currentString !== suggestionString) {
            suggestion[field] = suggestionString;
          }
          return;
        }

        const currentValue = (char as any)[field];
        if (typeof generatedValue === 'string' && generatedValue.trim().length > 0) {
          if ((currentValue || '').trim() !== generatedValue.trim()) {
            suggestion[field] = generatedValue;
          }
        }
      });

      const autoAppliedEntries = Object.entries(suggestion).filter(
        ([field]) => !FIELDS_REQUIRING_CONFIRMATION.includes(field as CharacterFieldKey)
      );

      if (autoAppliedEntries.length > 0) {
        const updates: Partial<Character> = {};

        autoAppliedEntries.forEach(([field, value]) => {
          const key = field as CharacterFieldKey;
          switch (key) {
            case 'age_range':
              updates.age_range = value as AgeRange;
              break;
            case 'work_mode':
              updates.work_mode = value as 'onsite' | 'remote' | 'hybrid';
              break;
            case 'persona':
              updates.persona = value;
              break;
            case 'name':
              updates.name = value;
              break;
            case 'character_name':
              updates.character_name = value;
              break;
            case 'role':
              updates.role = value;
              break;
            case 'about':
              updates.about = value;
              break;
            default:
              break;
          }
        });

        if (Object.keys(updates).length > 0) {
          const nextCharacter = { ...char, ...updates };
          updateCharacter(index, updates);
          await saveTeamMember(nextCharacter);
        }
      }

      const remainingSuggestions = Object.fromEntries(
        Object.entries(suggestion).filter(([field]) =>
          FIELDS_REQUIRING_CONFIRMATION.includes(field as CharacterFieldKey)
        )
      ) as CharacterSuggestionMap;

      setCharacterSuggestions(prev => {
        if (Object.keys(remainingSuggestions).length === 0) {
          if (!prev[char.id]) return prev;
          const { [char.id]: _removed, ...rest } = prev;
          return rest;
        }

        return {
          ...prev,
          [char.id]: remainingSuggestions
        };
      });
    } catch (error) {
      console.error('Failed to generate character:', error);
      alert('Failed to generate character. Please try again.');
    } finally {
      setIsGeneratingChar(false);
      hideNotification();
    }
  };

  // Removed regenerateAllImperfect function - users should use "Help with this" per character instead

  const suggestNextTeamMember = async () => {
    // Check brand type and enforce character limit
    const isIndividual = (brand?.brand_type || 'organization') === 'individual';
    if (isIndividual && characters.length >= 1) {
      alert('Individual brands are limited to 1 team member (your personal brand profile). Switch to Organization brand type to add more team members.');
      return;
    }

    setIsGeneratingChar(true);
    showNotification('ai_generate_cast');
    try {
      // Create a placeholder character for AI to fill
      const newChar: Character = {
        id: generateUUID(),
        name: '',
        character_name: '',
        role: '',
        perfect_fields: {}
      };

      // Get all existing characters (including perfect ones) for context
      const allChars = [...characters, newChar];

      const response = await apiClient.generateCastWithAI(
        {
          brandName: brand.brand_name,
          about: brand.about,
          persona: brand.persona,
          buyerProfile: brand.buyer_profile
        },
        prepareCharactersForAI(allChars),
        selectedModel
      );

      // Get the newly generated character (last one)
      const generatedList = ensureCharacterArray(
        response?.characters ?? response?.rawCharacters ?? response?.cast ?? response
      );
      const generated = generatedList[generatedList.length - 1];

      if (!generated) {
        throw new Error('No character returned by AI');
      }

      // Ensure the generated character has a proper ID for saving
      const memberToSave: Character = {
        ...generated,
        id: generated.id || generateUUID(),
      };

      const updated = [...characters, memberToSave];
      setCharacters(updated);
      setActiveCharacterIndex(updated.length - 1);

      // Save the generated character to the database
      await saveTeamMember(memberToSave);
    } catch (error) {
      console.error('Failed to suggest team member:', error);
      alert('Failed to suggest next team member. Please try again.');
    } finally {
      setIsGeneratingChar(false);
      hideNotification();
    }
  };

  const handleCharactersDone = async () => {
    setIsTraining(true);
          showNotification('ai_train_cast');
          try {
            // Train Py on the team members (backend endpoint to be created)
            await apiClient.request('/ai/train-team-members', {        method: 'POST',
        body: JSON.stringify({
          brandId: brand.brand_id,
          characters: characters.filter(c => {
            const pf = c.perfect_fields || {};
            return Object.values(pf).filter(Boolean).length === TOTAL_CHARACTER_FIELD_COUNT; // Only train on fully perfect characters
          })
        })
      });

      setTrainingComplete(true);
    } catch (error) {
      console.error('Failed to train Py:', error);
      alert('Failed to train Py. You can still continue to events.');
      setTrainingComplete(true); // Allow continuing even if training fails
    } finally {
      setIsTraining(false);
      hideNotification();
    }
  };

  // Check if we have any characters with ALL fields perfect
  const hasPerfectCharacters = characters.some(char => {
    const perfectFields = char.perfect_fields || {};
    return Object.values(perfectFields).filter(Boolean).length === TOTAL_CHARACTER_FIELD_COUNT;
  });

  // Check if we have imperfect characters (any character with less than the total perfect fields)
  const hasImperfectCharacters = characters.some(char => {
    const perfectFields = char.perfect_fields || {};
    return Object.values(perfectFields).filter(Boolean).length < TOTAL_CHARACTER_FIELD_COUNT;
  });

  const activeCharacter = characters[activeCharacterIndex] ?? null;

  const narrativeFieldKeys: Array<keyof typeof localNarrative> = [
    'narrative_why',
    'narrative_problem',
    'narrative_solution',
    'narrative_cta',
    'narrative_failure',
    'narrative_success',
  ];
  const filledNarrativeFields = narrativeFieldKeys.filter(key => localNarrative[key]?.trim()).length;
  const narrativeCompletion = Math.round((filledNarrativeFields / narrativeFieldKeys.length) * 100);

  const allNarrativeFieldsPerfect = narrativeFieldKeys.every(key => {
    return perfectFields[key as keyof typeof perfectFields];
  });

  // Auto-manage narrative section expansion:
  // - Collapse when all fields become perfect
  // - Stay expanded by default to encourage editing imperfect fields
  useEffect(() => {
    if (allNarrativeFieldsPerfect) {
      setIsNarrativeExpanded(false);
    }
  }, [allNarrativeFieldsPerfect]);

  // Check if all characters are perfect
  const allCharactersPerfect = characters.length > 0 && characters.every(char => {
    const perfectFields = char.perfect_fields || {};
    return Object.values(perfectFields).filter(Boolean).length === TOTAL_CHARACTER_FIELD_COUNT;
  });

  // Auto-collapse cast section if all characters are perfect
  useEffect(() => {
    if (allCharactersPerfect) {
      setIsCastExpanded(false);
    }
  }, [allCharactersPerfect]);

  const perfectCharacterCount = characters.filter(char => {
    const perfectFields = char.perfect_fields || {};
    return Object.values(perfectFields).filter(Boolean).length === TOTAL_CHARACTER_FIELD_COUNT;
  }).length;
  const castProgress = characters.length ? Math.round((perfectCharacterCount / characters.length) * 100) : 0;

  const plotJourney = useMemo(
    () => [
      {
        id: 'strategy',
        label: 'Strategy',
        description: 'Business strategy defined',
        complete: filledNarrativeFields === narrativeFieldKeys.length,
      },
      {
        id: 'team',
        label: 'Team',
        description: `${perfectCharacterCount}/${Math.max(characters.length, 1)} members defined`,
        complete: characters.length > 0 && perfectCharacterCount === characters.length,
      },
      {
        id: 'briefing',
        label: 'Briefing',
        description: hasPerfectCharacters ? 'Ready to brief Py' : 'Define team roles to unlock briefing',
        complete: trainingComplete,
      },
    ],
    [characters.length, filledNarrativeFields, hasPerfectCharacters, narrativeFieldKeys.length, perfectCharacterCount, trainingComplete]
  );


  return (
    <div className="relative">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-10">
        <PyNotification message={pyMessage} show={showPyNotification} modelInfo={notificationModel} />

        <section className="relative overflow-hidden rounded-3xl border border-primary-500/20 bg-gradient-to-br from-primary-600 via-purple-600 to-slate-900 text-white shadow-xl">
          <div
            className="absolute inset-0 opacity-40 mix-blend-screen bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.35),transparent_65%)]"
            aria-hidden
          />
          <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between p-6 sm:p-8">
            <div className="space-y-5 max-w-2xl">
              <span className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.4em] text-white/70">
                <Compass className="w-4 h-4" />
                Personnel studio
              </span>
              <div className="space-y-3">
                <h1 className="text-3xl sm:text-4xl font-semibold leading-tight">Develop Your Organizational Structure</h1>
                <p className="text-sm sm:text-base text-white/80 leading-relaxed">
                  Outline key roles, build your team, and prepare Py to assist with HR and operational tasks. Every detail here trains the personnel management system.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-3 text-xs sm:text-sm text-white/80">
                <span className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1">
                  <Sparkles className="w-3.5 h-3.5" />
                  Organizational intelligence
                </span>
                <span className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1">
                  <Users className="w-3.5 h-3.5" />
                  {characters.length || 'No'} team members defined
                </span>
                <span className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1">
                  <Save className="w-3.5 h-3.5" />
                  {isGenerating ? 'Generating…' : 'Changes saved'}
                </span>
              </div>
            </div>
          </div>
        </section>

        <div className="space-y-8">

          {/* Narrative Section */}
          <div className={`rounded-2xl border shadow-sm transition-all ${allNarrativeFieldsPerfect
            ? 'border-green-400/50 bg-green-50/30'
            : 'border-slate-200/80 bg-white/80'
            }`}>
            {/* Header */}
            <div className="flex items-center justify-between p-4 sm:p-6">
              <div className="flex items-center gap-3 flex-1">
                <button
                  onClick={() => setIsNarrativeExpanded(!isNarrativeExpanded)}
                  className="p-1 text-slate-500 hover:text-primary-600 transition-colors"
                  title={isNarrativeExpanded ? 'Collapse' : 'Expand to edit'}
                >
                  {isNarrativeExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                </button>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg sm:text-xl font-semibold text-primary-900">Company Vision & Strategy</h2>
                    {allNarrativeFieldsPerfect && (
                      <span className="text-xs text-green-600 font-medium bg-green-100 px-2 py-0.5 rounded-full">Perfect</span>
                    )}
                  </div>
                  {!isNarrativeExpanded && (
                    <p className="text-slate-500 mt-1 text-sm">
                      {allNarrativeFieldsPerfect ? 'Company strategy complete' : 'Click to expand and define your strategy'}
                    </p>
                  )}
                  {isNarrativeExpanded && (
                    <p className="text-slate-600 mt-1 text-sm sm:text-base">Define your company's core strategy using a proven business framework</p>
                  )}
                </div>
              </div>

              {isNarrativeExpanded && (
                <div className="flex items-center gap-2">
                  <Button
                    onClick={async () => {
                      if (allNarrativeFieldsPerfect) return;

                      const allPerfect = {
                        narrative_why: true,
                        narrative_problem: true,
                        narrative_solution: true,
                        narrative_cta: true,
                        narrative_failure: true,
                        narrative_success: true
                      };

                      setPerfectFields(allPerfect);
                      try {
                        await apiClient.updateBrand(brand.brand_id, { narrative_perfect_fields: allPerfect });
                        onBrandUpdate({ narrative_perfect_fields: allPerfect });
                        showNotification('success');
                        // Small delay to let user see the success message
                        setTimeout(() => hideNotification(), 2000);
                      } catch (err) {
                        console.error('Failed to mark all perfect', err);
                        // Revert on error - tough to do perfectly without tracking prev state, 
                        // but re-syncing from props in useEffect will handle it eventually
                      }
                    }}
                    variant="outline"
                    size="sm"
                    className={`flex items-center text-sm ${allNarrativeFieldsPerfect ? 'text-green-600 border-green-200 bg-green-50' : ''}`}
                    disabled={allNarrativeFieldsPerfect}
                    title="Mark all strategy fields as perfect"
                  >
                    <CheckCircle2 size={16} className="mr-1.5" />
                    <span className="hidden sm:inline">{allNarrativeFieldsPerfect ? 'All Perfect' : 'Mark All Perfect'}</span>
                    <span className="sm:hidden">All ✓</span>
                  </Button>

                  {isAdmin && (
                    <Button
                      onClick={handleCopyAllStrategy}
                      variant="outline"
                      size="sm"
                      className="flex items-center text-sm"
                      title="Copy all strategy fields to clipboard (Admin only)"
                    >
                      <Copy size={16} className="mr-1.5" />
                      <span className="hidden sm:inline">Copy All</span>
                    </Button>
                  )}
                  <Button
                    onClick={handleAIPrefillNarrative}
                    loading={isGenerating}
                    className="flex items-center text-sm"
                    size="sm"
                  >
                    <Wand2 size={16} className="mr-2" />
                    <span className="hidden sm:inline">Write for Me</span>
                    <span className="sm:hidden">AI Fill</span>
                  </Button>
                  {allNarrativeFieldsFilled && (
                    <Button
                      onClick={handleRefineNarrative}
                      loading={isRefining}
                      className="flex items-center text-sm bg-orange-500 hover:bg-orange-600"
                      size="sm"
                    >
                      <Sparkles size={16} className="mr-2" />
                      <span className="hidden sm:inline">Refine</span>
                      <span className="sm:hidden">✨</span>
                    </Button>
                  )}
                </div>
              )}
            </div>

            {/* Collapsible Content */}
            {isNarrativeExpanded && (
              <div className="px-4 sm:px-6 pb-4 sm:pb-6 border-t border-slate-200/50 pt-4 sm:pt-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                  <div className="space-y-4">
                    <div className={`relative ${perfectFields.narrative_why ? 'bg-green-50/30 rounded-lg p-2 -m-2' : ''}`}>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-sm font-medium text-slate-700">Mission/Purpose</label>
                        <button
                          onClick={() => togglePerfectField('why')}
                          className={`px-2 py-1 rounded text-xs font-medium transition-all ${perfectFields.narrative_why
                            ? 'text-green-600 border border-green-400/50 bg-green-50 hover:bg-green-100'
                            : 'text-slate-500 border border-slate-300 hover:border-slate-400'
                            }`}
                          type="button"
                          title={perfectFields.narrative_why ? 'Marked as perfect - AI will skip' : 'Mark as perfect'}
                        >
                          {perfectFields.narrative_why ? '✓ Perfect' : 'Mark'}
                        </button>
                      </div>
                      <Textarea
                        value={localNarrative.narrative_why}
                        onChange={(e) => handleNarrativeChange('narrative_why', e.target.value)}
                        placeholder="What is the core purpose or mission of your company?"
                        maxLength={ANDORA_CHAR_LIMITS.narrative_why}
                        showCharCount
                      />
                    </div>

                    <div className={`relative ${perfectFields.narrative_problem ? 'bg-green-50/30 rounded-lg p-2 -m-2' : ''}`}>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-sm font-medium text-slate-700">Key Challenges</label>
                        <button
                          onClick={() => togglePerfectField('problem')}
                          className={`px-2 py-1 rounded text-xs font-medium transition-all ${perfectFields.narrative_problem
                            ? 'text-green-600 border border-green-400/50 bg-green-50 hover:bg-green-100'
                            : 'text-slate-500 border border-slate-300 hover:border-slate-400'
                            }`}
                          type="button"
                          title={perfectFields.narrative_problem ? 'Marked as perfect - AI will skip' : 'Mark as perfect'}
                        >
                          {perfectFields.narrative_problem ? '✓ Perfect' : 'Mark'}
                        </button>
                      </div>
                      <Textarea
                        value={localNarrative.narrative_problem}
                        onChange={(e) => handleNarrativeChange('narrative_problem', e.target.value)}
                        placeholder="What key challenges does your company or its clients face?"
                        maxLength={ANDORA_CHAR_LIMITS.narrative_problem}
                        showCharCount
                      />
                    </div>

                    <div className={`relative ${perfectFields.narrative_solution ? 'bg-green-50/30 rounded-lg p-2 -m-2' : ''}`}>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-sm font-medium text-slate-700">Strategic Approach</label>
                        <button
                          onClick={() => togglePerfectField('solution')}
                          className={`px-2 py-1 rounded text-xs font-medium transition-all ${perfectFields.narrative_solution
                            ? 'text-green-600 border border-green-400/50 bg-green-50 hover:bg-green-100'
                            : 'text-slate-500 border border-slate-300 hover:border-slate-400'
                            }`}
                          type="button"
                          title={perfectFields.narrative_solution ? 'Marked as perfect - AI will skip' : 'Mark as perfect'}
                        >
                          {perfectFields.narrative_solution ? '✓ Perfect' : 'Mark'}
                        </button>
                      </div>
                      <Textarea
                        value={localNarrative.narrative_solution}
                        onChange={(e) => handleNarrativeChange('narrative_solution', e.target.value)}
                        placeholder="How does your company address these challenges or achieve its goals?"
                        maxLength={ANDORA_CHAR_LIMITS.narrative_solution}
                        showCharCount
                      />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className={`relative ${perfectFields.narrative_cta ? 'bg-green-50/30 rounded-lg p-2 -m-2' : ''}`}>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-sm font-medium text-slate-700">Key Communication Phrases</label>
                        <button
                          onClick={() => togglePerfectField('cta')}
                          className={`px-2 py-1 rounded text-xs font-medium transition-all ${perfectFields.narrative_cta
                            ? 'text-green-600 border border-green-400/50 bg-green-50 hover:bg-green-100'
                            : 'text-slate-500 border border-slate-300 hover:border-slate-400'
                            }`}
                          type="button"
                          title={perfectFields.narrative_cta ? 'Marked as perfect - AI will skip' : 'Mark as perfect'}
                        >
                          {perfectFields.narrative_cta ? '✓ Perfect' : 'Mark'}
                        </button>
                      </div>
                      <Textarea
                        value={localNarrative.narrative_cta}
                        onChange={(e) => handleNarrativeChange('narrative_cta', e.target.value)}
                        placeholder="e.g., 'Driving Innovation', 'Client-First Approach', 'Excellence in Execution'"
                        maxLength={ANDORA_CHAR_LIMITS.narrative_cta}
                        showCharCount
                      />
                    </div>

                    <div className={`relative ${perfectFields.narrative_failure ? 'bg-green-50/30 rounded-lg p-2 -m-2' : ''}`}>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-sm font-medium text-slate-700">Operational Risks</label>
                        <button
                          onClick={() => togglePerfectField('failure')}
                          className={`px-2 py-1 rounded text-xs font-medium transition-all ${perfectFields.narrative_failure
                            ? 'text-green-600 border border-green-400/50 bg-green-50 hover:bg-green-100'
                            : 'text-slate-500 border border-slate-300 hover:border-slate-400'
                            }`}
                          type="button"
                          title={perfectFields.narrative_failure ? 'Marked as perfect - AI will skip' : 'Mark as perfect'}
                        >
                          {perfectFields.narrative_failure ? '✓ Perfect' : 'Mark'}
                        </button>
                      </div>
                      <Textarea
                        value={localNarrative.narrative_failure}
                        onChange={(e) => handleNarrativeChange('narrative_failure', e.target.value)}
                        placeholder="What are the potential risks or negative outcomes if company objectives are not met?"
                        maxLength={ANDORA_CHAR_LIMITS.narrative_failure}
                        showCharCount
                      />
                    </div>

                    <div className={`relative ${perfectFields.narrative_success ? 'bg-green-50/30 rounded-lg p-2 -m-2' : ''}`}>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-sm font-medium text-slate-700">Key Performance Indicators (KPIs)</label>
                        <button
                          onClick={() => togglePerfectField('success')}
                          className={`px-2 py-1 rounded text-xs font-medium transition-all ${perfectFields.narrative_success
                            ? 'text-green-600 border border-green-400/50 bg-green-50 hover:bg-green-100'
                            : 'text-slate-500 border border-slate-300 hover:border-slate-400'
                            }`}
                          type="button"
                          title={perfectFields.narrative_success ? 'Marked as perfect - AI will skip' : 'Mark as perfect'}
                        >
                          {perfectFields.narrative_success ? '✓ Perfect' : 'Mark'}
                        </button>
                      </div>
                      <Textarea
                        value={localNarrative.narrative_success}
                        onChange={(e) => handleNarrativeChange('narrative_success', e.target.value)}
                        placeholder="What does success look like for your company? Define key metrics and outcomes."
                        maxLength={ANDORA_CHAR_LIMITS.narrative_success}
                        showCharCount
                      />
                    </div>
                  </div>
                </div>

                {/* Refinement Suggestions */}
                {refinementSuggestions && (
                  <div className="mt-6 space-y-3">
                    <h3 className="text-sm font-semibold text-orange-600 flex items-center gap-2">
                      <Sparkles size={16} />
                      Py's Suggestions
                    </h3>
                    <div className="space-y-2">
                      {refinementSuggestions.why && (
                        <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1">
                              <p className="text-xs font-medium text-orange-700 mb-1">Mission/Purpose</p>
                              <p className="text-sm text-slate-700">{refinementSuggestions.why}</p>
                            </div>
                            <button
                              onClick={() => copySuggestion('why', refinementSuggestions.why!)}
                              className="shrink-0 p-2 hover:bg-orange-100 rounded-lg transition-colors"
                              title="Copy to field"
                            >
                              <Copy size={16} className="text-orange-600" />
                            </button>
                          </div>
                        </div>
                      )}
                      {refinementSuggestions.problem && (
                        <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1">
                              <p className="text-xs font-medium text-orange-700 mb-1">Key Challenges</p>
                              <p className="text-sm text-slate-700">{refinementSuggestions.problem}</p>
                            </div>
                            <button
                              onClick={() => copySuggestion('problem', refinementSuggestions.problem!)}
                              className="shrink-0 p-2 hover:bg-orange-100 rounded-lg transition-colors"
                              title="Copy to field"
                            >
                              <Copy size={16} className="text-orange-600" />
                            </button>
                          </div>
                        </div>
                      )}
                      {refinementSuggestions.solution && (
                        <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1">
                              <p className="text-xs font-medium text-orange-700 mb-1">Strategic Approach</p>
                              <p className="text-sm text-slate-700">{refinementSuggestions.solution}</p>
                            </div>
                            <button
                              onClick={() => copySuggestion('solution', refinementSuggestions.solution!)}
                              className="shrink-0 p-2 hover:bg-orange-100 rounded-lg transition-colors"
                              title="Copy to field"
                            >
                              <Copy size={16} className="text-orange-600" />
                            </button>
                          </div>
                        </div>
                      )}
                      {refinementSuggestions.cta && (
                        <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1">
                              <p className="text-xs font-medium text-orange-700 mb-1">Key Communication Phrases</p>
                              <p className="text-sm text-slate-700">{refinementSuggestions.cta}</p>
                            </div>
                            <button
                              onClick={() => copySuggestion('cta', refinementSuggestions.cta!)}
                              className="shrink-0 p-2 hover:bg-orange-100 rounded-lg transition-colors"
                              title="Copy to field"
                            >
                              <Copy size={16} className="text-orange-600" />
                            </button>
                          </div>
                        </div>
                      )}
                      {refinementSuggestions.failure && (
                        <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1">
                              <p className="text-xs font-medium text-orange-700 mb-1">Operational Risks</p>
                              <p className="text-sm text-slate-700">{refinementSuggestions.failure}</p>
                            </div>
                            <button
                              onClick={() => copySuggestion('failure', refinementSuggestions.failure!)}
                              className="shrink-0 p-2 hover:bg-orange-100 rounded-lg transition-colors"
                              title="Copy to field"
                            >
                              <Copy size={16} className="text-orange-600" />
                            </button>
                          </div>
                        </div>
                      )}
                      {refinementSuggestions.success && (
                        <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1">
                              <p className="text-xs font-medium text-orange-700 mb-1">Key Performance Indicators (KPIs)</p>
                              <p className="text-sm text-slate-700">{refinementSuggestions.success}</p>
                            </div>
                            <button
                              onClick={() => copySuggestion('success', refinementSuggestions.success!)}
                              className="shrink-0 p-2 hover:bg-orange-100 rounded-lg transition-colors"
                              title="Copy to field"
                            >
                              <Copy size={16} className="text-orange-600" />
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <div className="flex justify-end mt-6 pt-4 border-t border-primary-200/40">
                  <span className="text-xs text-slate-400 flex items-center">
                    <Save size={12} className="mr-1" />
                    Changes saved automatically
                  </span>
                </div>

                <div className="mt-6">
                  <Button
                    onClick={handleEnterStudio}
                    className="w-full flex items-center justify-center gap-2 py-4 text-base"
                  >
                    <Sparkles size={18} />
                    Enter Team Studio
                  </Button>
                  <p className="mt-2 text-center text-xs text-slate-500">
                    Define detailed team roles once your strategic foundations are in place.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Team Structure Section */}
          <div className={`rounded-2xl border shadow-sm transition-all ${allCharactersPerfect
            ? 'border-green-400/50 bg-green-50/30'
            : 'border-slate-200/80 bg-white/80'
            }`}>
            {/* Header */}
            <div className="flex items-center justify-between p-4 sm:p-6">
              <div className="flex items-center gap-3 flex-1">
                <button
                  onClick={() => setIsCastExpanded(!isCastExpanded)}
                  className="p-1 text-slate-500 hover:text-primary-600 transition-colors"
                  title={isCastExpanded ? 'Collapse' : 'Expand'}
                >
                  {isCastExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                </button>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg sm:text-xl font-semibold text-primary-900">Team Structure</h2>
                    {allCharactersPerfect && (
                      <span className="text-xs text-green-600 font-medium bg-green-100 px-2 py-0.5 rounded-full">Perfect</span>
                    )}
                  </div>
                  {!isCastExpanded && characters.length > 0 && (
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      {characters.map((char, idx) => (
                        <div key={char.id} className="inline-flex items-center gap-1.5 px-2 py-1 bg-slate-50 rounded-lg border border-slate-200">
                          <span className="text-xs text-slate-700 font-medium">
                            {char.character_name || char.name || `Team Member ${idx + 1}`}
                          </span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleMemberActivity(idx);
                            }}
                            className={`p-0.5 rounded transition-colors ${char.is_muted
                              ? 'text-slate-400 hover:text-slate-600'
                              : 'text-primary-500 hover:text-primary-700'
                              }`}
                            title={char.is_muted ? 'Activate' : 'Deactivate'}
                          >
                            {char.is_muted ? <CheckCircle size={14} /> : <CheckCircle2 size={14} />}
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  {isCastExpanded && (
                    <p className="text-slate-600 mt-1 text-sm sm:text-base">
                      Define one team member role at a time. Mark every field as 'perfect' once it's complete, and Py will help refine any remaining areas.
                    </p>
                  )}
                </div>
              </div>
              {isCastExpanded && isAdmin && characters.length > 0 && (
                <Button
                  onClick={handleCopyAllTeamMembers}
                  variant="outline"
                  size="sm"
                  className="flex items-center text-sm"
                  title="Copy all team members and their fields to clipboard (Admin only)"
                >
                  <Copy size={16} className="mr-1.5" />
                  <span className="hidden sm:inline">Copy All</span>
                </Button>
              )}
            </div>

            {/* Collapsible Content */}
            {isCastExpanded && (
              <div className="px-4 sm:px-6 pb-4 sm:pb-6 border-t border-slate-200/50 pt-4 sm:pt-6">
                {/* Character Forms */}
                <div className="space-y-6">
                  {isLoadingCharacters ? (
                    <div className="flex items-center justify-center py-12">
                      <div className="text-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
                        <p className="text-slate-600">Loading your team members...</p>
                      </div>
                    </div>
                  ) : (
                    <>
                      {activeCharacter ? (
                        <div className="space-y-6">
                          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-sm text-slate-500">
                            <span>
                              Team Member {activeCharacterIndex + 1} of {characters.length}
                            </span>
                            <span className="font-medium text-primary-700">
                              {(activeCharacter.character_name && activeCharacter.character_name.trim().length > 0)
                                ? activeCharacter.character_name
                                : activeCharacter.name || 'Untitled Role'}
                            </span>
                          </div>

                          {/* Quick Preview Card */}
                          <div className="mt-4 p-6 bg-white/50 rounded-lg border border-purple-100">
                            <div className="flex items-center justify-between mb-4">
                              <h3 className="text-lg font-semibold text-slate-800">
                                {activeCharacter.name || 'Untitled Role'}
                              </h3>
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => toggleMemberActivity(activeCharacterIndex)}
                                  className={`p-2 rounded-lg transition-all ${activeCharacter.is_muted
                                    ? 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                    : 'bg-primary-50 text-primary-600 hover:bg-primary-100'
                                    }`}
                                  title={activeCharacter.is_muted ? 'Include in operations' : 'Exclude from operations'}
                                >
                                  {activeCharacter.is_muted ? <VolumeX size={18} /> : <Volume2 size={18} />}
                                </button>
                                <span className={`text-sm px-3 py-1 rounded-full ${Object.values(activeCharacter.perfect_fields || {}).filter(Boolean).length === TOTAL_CHARACTER_FIELD_COUNT
                                  ? 'bg-green-100 text-green-700'
                                  : 'bg-purple-100 text-purple-700'
                                  }`}>
                                  {Object.values(activeCharacter.perfect_fields || {}).filter(Boolean).length}/{TOTAL_CHARACTER_FIELD_COUNT} Perfect
                                </span>
                              </div>
                            </div>
                            {activeCharacter.is_muted && (
                              <div className="mb-3 inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 text-slate-700 rounded-full text-xs font-medium">
                                <VolumeX size={14} />
                                Excluded from operations
                              </div>
                            )}
                            {activeCharacter.character_name && (
                              <p className="text-sm text-slate-600 mb-2">
                                <span className="font-medium">Name:</span> {activeCharacter.character_name}
                              </p>
                            )}
                            {activeCharacter.role && (
                              <p className="text-sm text-slate-600 mb-2">
                                <span className="font-medium">Role:</span> {activeCharacter.role}
                              </p>
                            )}
                            {activeCharacter.persona && (
                              <p className="text-sm text-slate-700 mt-3 italic line-clamp-3">
                                {activeCharacter.persona}
                              </p>
                            )}
                          </div>

                          {characters.length > 1 && (
                            <div className="flex flex-col items-center gap-3">
                              <div className="flex items-center gap-4">
                                <Button
                                  onClick={goToPreviousMember}
                                  size="sm"
                                  variant="outline"
                                  className="flex items-center gap-1"
                                >
                                  <ChevronLeft size={16} />
                                  Previous
                                </Button>
                                <Button
                                  onClick={goToNextMember}
                                  size="sm"
                                  variant="outline"
                                  className="flex items-center gap-1"
                                >
                                  Next
                                  <ChevronRight size={16} />
                                </Button>
                              </div>

                              <div className="flex flex-wrap justify-center gap-2">
                                {characters.map((char, idx) => {
                                  const label = char.character_name?.trim() || char.name?.trim() || `Team Member ${idx + 1}`;
                                  const isActive = idx === activeCharacterIndex;
                                  return (
                                    <button
                                      key={char.id}
                                      onClick={() => setActiveCharacterIndex(idx)}
                                      className={`px-3 py-1 rounded-full text-xs font-medium border transition-all ${isActive
                                        ? 'bg-primary-600 text-white border-primary-600 shadow'
                                        : 'border-primary-200 text-primary-700 hover:bg-primary-100'
                                        }`}
                                      aria-label={`Switch to member ${label}`}
                                    >
                                      {label}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="border border-dashed border-primary-300/60 rounded-xl p-8 text-center bg-white/60">
                          <h3 className="text-lg font-semibold text-primary-900">No team members yet</h3>
                          <p className="text-sm text-slate-600 mt-2">
                            Draft your first team member profile or let Py suggest one tailored to your company's strategy.
                          </p>
                          <div className="mt-4 flex flex-col sm:flex-row items-center justify-center gap-3">
                            <Button onClick={addTeamMember} variant="outline" className="w-full sm:w-auto">
                              <Users size={16} className="mr-2" />
                              Add Team Member
                            </Button>
                            <Button onClick={suggestNextTeamMember} loading={isGeneratingChar} className="w-full sm:w-auto">
                              <Sparkles size={16} className="mr-2" />
                              Draft with Py
                            </Button>
                          </div>
                        </div>
                      )}
                    </>
                  )}

                  {/* Action Buttons */}
                  {!isLoadingCharacters && (
                    <>
                      {(() => {
                        const isIndividual = (brand?.brand_type || 'organization') === 'individual';
                        const hasMaxCharacters = isIndividual && characters.length >= 1;

                        if (hasMaxCharacters) {
                          return (
                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                              <p className="text-sm text-blue-900">
                                <strong>Individual Brand:</strong> You have your personal brand profile. To add more team members, switch to the <strong>Organization</strong> brand type in your Brand Profile settings.
                              </p>
                            </div>
                          );
                        }

                        return (
                          <div className="space-y-4">
                            {/* Manage in Character Studio Button - Moved here */}
                            <Button
                              onClick={handleEnterStudio}
                              size="lg"
                              className="w-full flex items-center justify-center gap-2 py-6 text-base"
                            >
                              <Sparkles size={20} />
                              Manage in Team Studio
                            </Button>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {/* Add Character Button (Manual) */}
                              <Button
                                onClick={addTeamMember}
                                className="w-full"
                                variant="outline"
                              >
                                <Users size={16} className="mr-2" />
                                {characters.length === 0 ? 'Add Team Member' : 'Add Another Team Member'}
                              </Button>

                              {/* Suggest Next Character or Draft First Character */}
                              <Button
                                onClick={suggestNextTeamMember}
                                loading={isGeneratingChar}
                                className="w-full"
                              >
                                <Sparkles size={16} className="mr-2" />
                                {characters.length === 0 ? 'Draft First Team Member' : 'Suggest Next Team Member'}
                              </Button>
                            </div>
                          </div>
                        );
                      })()}

                      {/* Characters Are Done Button */}
                      {hasPerfectCharacters && !trainingComplete && (
                        <Button
                          onClick={handleCharactersDone}
                          loading={isTraining}
                          className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
                        >
                          <CheckCircle size={16} className="mr-2" />
                          {isTraining ? 'Training Andora...' : 'Characters Are Done'}
                        </Button>
                      )}

                      {/* Continue to Events Button (Bouncing) */}
                      {trainingComplete && (
                        <Button
                          onClick={() => navigate('/dashboard/events')}
                          className="w-full bg-gradient-to-r from-primary-600 to-purple-600 hover:from-primary-700 hover:to-purple-700 animate-bounce"
                        >
                          <ArrowRight size={16} className="mr-2" />
                          Continue to Events
                        </Button>
                      )}
                    </>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Character Studio Modal */}
          {activeCharacter && (
            <CharacterStudio
              character={activeCharacter}
              brandId={brand.brand_id}
              isOpen={isStudioOpen}
              onClose={() => {
                setIsStudioOpen(false);
                onStudioStateChange?.(false);
              }}
              onChange={(updates) => updateCharacter(activeCharacterIndex, updates)}
              onSave={saveCharacter}
              onDelete={() => {
                deleteCharacter(activeCharacterIndex);
                setIsStudioOpen(false);
                onStudioStateChange?.(false);
              }}
              onToggleMute={() => toggleCharacterMute(activeCharacterIndex)}
              onAIGenerate={() => generateCharacterPersona(activeCharacterIndex)}
              isGenerating={isGeneratingChar}
              suggestions={characterSuggestions[activeCharacter.id]}
              onSuggestionApply={(field, value) => handleSuggestionApply(activeCharacter.id, field, value)}
              onFieldRefine={handleFieldRefine}
              refiningField={refiningFieldByCharacter[activeCharacter.id] ?? null}
              // Navigation props
              characters={characters}
              activeCharacterIndex={activeCharacterIndex}
              onCharacterChange={setActiveCharacterIndex}
              onPreviousCharacter={goToPreviousCharacter}
              onNextCharacter={goToNextCharacter}
              // Action button props
              onAddCharacter={addCharacter}
              onSuggestCharacter={suggestNextCharacter}
              onAllDone={handleCharactersDone}
              showAllDone={hasPerfectCharacters && !trainingComplete}
              isTraining={isTraining}
            />
          )}

          {/* Onboarding Flow */}
          {showOnboarding && (
            <CharacterStudioOnboarding onComplete={handleOnboardingComplete} />
          )}
        </div>
      </div>
    </div>
  );
};
