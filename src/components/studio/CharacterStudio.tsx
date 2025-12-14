/**
 * Character Studio Component
 *
 * Full-screen immersive modal for character creation
 * Redesigned with two-section layout: User Input → AI Generated
 */

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Character, AgeRange, CharacterPerfectFields } from '../../types';
import { CharacterFormField, CharacterFieldKey } from '../plot/CharacterFormField';
import { TOTAL_CHARACTER_FIELD_COUNT } from '../plot/characterFieldConstants';
import { Button } from '../common/Button';
import { PyAvatar } from '../common/PyAvatar';
import { ArrowLeft, Sparkles, Trash2, CheckCircle, Loader2, ChevronLeft, ChevronRight, Users, Volume2, VolumeX, Wand2, PenLine, Bot } from 'lucide-react';

interface CharacterStudioProps {
  character: Character;
  brandId: string;
  isOpen: boolean;
  onClose: () => void;
  onChange: (updates: Partial<Character>) => void;
  onSave: (character: Character) => Promise<void>;
  onDelete?: () => void;
  onToggleMute?: () => void;
  onAIGenerate?: () => void;
  isGenerating?: boolean;
  suggestions?: Partial<Record<CharacterFieldKey, string>>;
  onSuggestionApply?: (field: CharacterFieldKey, value: string) => void;
  onFieldRefine?: (characterId: string, field: CharacterFieldKey) => void;
  refiningField?: CharacterFieldKey | null;
  // Navigation props
  characters?: Character[];
  activeCharacterIndex?: number;
  onCharacterChange?: (index: number) => void;
  onPreviousCharacter?: () => void;
  onNextCharacter?: () => void;
  // Action button props
  onAddCharacter?: () => void;
  onSuggestCharacter?: () => void;
  onAllDone?: () => void;
  showAllDone?: boolean;
  isTraining?: boolean;
}

const WORK_MODES = [
  { value: 'onsite', label: 'Onsite' },
  { value: 'remote', label: 'Remote' },
  { value: 'hybrid', label: 'Hybrid' }
];

export const CharacterStudio: React.FC<CharacterStudioProps> = ({
  character,
  brandId,
  isOpen,
  onClose,
  onChange,
  onSave,
  onDelete,
  onToggleMute,
  onAIGenerate,
  isGenerating = false,
  suggestions = {},
  onSuggestionApply,
  onFieldRefine,
  refiningField = null,
  characters = [],
  activeCharacterIndex = 0,
  onCharacterChange,
  onPreviousCharacter,
  onNextCharacter,
  onAddCharacter,
  onSuggestCharacter,
  onAllDone,
  showAllDone = false,
  isTraining = false
}) => {
  const [isSaving, setIsSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [personaCopied, setPersonaCopied] = useState(false);
  const aiSectionRef = useRef<HTMLDivElement>(null);

  // Handle escape key and arrow key navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
      // Arrow key navigation between characters
      if (characters.length > 1 && isOpen) {
        if (e.key === 'ArrowLeft' && onPreviousCharacter) {
          e.preventDefault();
          onPreviousCharacter();
        } else if (e.key === 'ArrowRight' && onNextCharacter) {
          e.preventDefault();
          onNextCharacter();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, characters.length, onPreviousCharacter, onNextCharacter]);

  // Auto-scroll to AI section when generation completes
  useEffect(() => {
    if (!isGenerating && (character.persona || character.personality || character.character_name)) {
      aiSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [isGenerating]);

  const handleSaveNow = async (nextCharacter?: Character) => {
    const characterToSave = nextCharacter ?? character;

    // Don't save if no ID
    if (!characterToSave.id) {
      setHasUnsavedChanges(false);
      return;
    }

    setIsSaving(true);
    try {
      await onSave(characterToSave);
      setHasUnsavedChanges(false);
    } catch (error) {
      console.error('Save failed:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const perfectFields = character.perfect_fields || {};
  const perfectFieldCount = Object.values(perfectFields).filter(Boolean).length;
  const hasAllPerfectFields = perfectFieldCount === TOTAL_CHARACTER_FIELD_COUNT;

  // Simple status calculation
  const getStatus = () => {
    if (hasAllPerfectFields) return { label: 'Perfect', color: 'emerald' };
    if (character.persona || character.personality) return { label: 'AI Generated', color: 'purple' };
    return { label: 'Draft', color: 'slate' };
  };
  const status = getStatus();

  // Check if user has provided enough input for AI generation
  const hasEnoughForAI = Boolean(character.name?.trim());
  const hasAIContent = Boolean(character.persona || character.personality || character.character_name);

  const togglePerfect = (field: keyof CharacterPerfectFields) => {
    const newPerfectFields = {
      ...perfectFields,
      [field]: !perfectFields[field]
    };
    const updatedCharacter = {
      ...character,
      perfect_fields: newPerfectFields
    };
    onChange({ perfect_fields: newPerfectFields });
    setHasUnsavedChanges(true);
    void handleSaveNow(updatedCharacter);
  };

  const handleChange = (updates: Partial<Character>) => {
    onChange(updates);
    setHasUnsavedChanges(true);
  };

  const handleSuggestionApply = (field: CharacterFieldKey, value: string) => {
    onSuggestionApply?.(field, value);
  };

  const handleSuggestionRefine = (field: CharacterFieldKey) => {
    if (!character.id) return;
    onFieldRefine?.(character.id, field);
  };

  const copyPersona = async () => {
    if (!character.persona) return;

    try {
      await navigator.clipboard.writeText(character.persona);
      setPersonaCopied(true);
      setTimeout(() => setPersonaCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 pb-24">
      {/* Simplified Sticky Header */}
      <div className="sticky top-0 z-50 w-full bg-gradient-to-r from-primary-700 via-purple-700 to-slate-900 border-b border-white/10 shadow-lg">
        <div
          className="absolute inset-0 opacity-25 mix-blend-screen bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.2),transparent_60%)]"
          aria-hidden
        />
        <div className="relative z-10 px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <button
                onClick={onClose}
                className="inline-flex items-center gap-2 rounded-full border border-white/30 bg-white/10 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.3em] text-white/90 transition hover:bg-white/20 hover:text-white"
              >
                <ArrowLeft size={16} />
                <span className="hidden sm:inline">Back</span>
              </button>

              {/* Character Name & Status */}
              <div className="flex items-center gap-3">
                <h1 className="text-lg sm:text-xl font-bold text-white truncate max-w-[200px] sm:max-w-none">
                  {character.name || 'New Character'}
                </h1>
                <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${status.color === 'emerald' ? 'bg-emerald-200/20 text-emerald-100' :
                  status.color === 'purple' ? 'bg-purple-200/20 text-purple-100' :
                    'bg-white/10 text-white/70'
                  }`}>
                  {status.color === 'emerald' && <CheckCircle size={12} />}
                  {status.color === 'purple' && <Sparkles size={12} />}
                  {status.label}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {onToggleMute && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onToggleMute();
                  }}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-white/30 text-white text-sm hover:bg-white/10 transition-colors"
                  title={character.is_muted ? 'Unmute' : 'Mute'}
                >
                  {character.is_muted ? <VolumeX size={16} /> : <Volume2 size={16} />}
                </button>
              )}
              {onDelete && (
                <button
                  onClick={onDelete}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-white/30 text-white text-sm hover:bg-white/10 transition-colors"
                  title="Delete"
                >
                  <Trash2 size={16} />
                </button>
              )}
              {isSaving && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-xs text-white/90">
                  <Loader2 size={14} className="animate-spin" />
                </span>
              )}
              {hasUnsavedChanges && !isSaving && (
                <span className="hidden sm:inline-flex items-center gap-1.5 rounded-full bg-amber-200/20 px-3 py-1.5 text-xs text-amber-100">
                  Unsaved
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Cast Navigation (if multiple characters) */}
      {characters.length > 1 && (
        <div className="sticky top-[64px] z-40 w-full bg-white border-b border-slate-200 shadow-sm">
          <div className="px-4 sm:px-6 lg:px-8 py-3">
            <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide">
              {onPreviousCharacter && (
                <button
                  onClick={onPreviousCharacter}
                  className="flex-shrink-0 rounded-full bg-slate-100 p-2 text-slate-600 transition hover:bg-slate-200"
                  title="Previous (←)"
                >
                  <ChevronLeft size={18} />
                </button>
              )}
              <div className="flex items-center gap-2">
                {characters.map((char, idx) => {
                  const label = char.name?.trim() || `Character ${idx + 1}`;
                  const isActive = idx === activeCharacterIndex;
                  return (
                    <button
                      key={char.id}
                      onClick={() => onCharacterChange?.(idx)}
                      className={`flex-shrink-0 rounded-full px-4 py-2 text-xs sm:text-sm font-medium transition-all ${isActive
                        ? 'bg-primary-600 text-white shadow-md'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                        }`}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
              {onNextCharacter && (
                <button
                  onClick={onNextCharacter}
                  className="flex-shrink-0 rounded-full bg-slate-100 p-2 text-slate-600 transition hover:bg-slate-200"
                  title="Next (→)"
                >
                  <ChevronRight size={18} />
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ==================== SECTION 1: USER INPUT ==================== */}
      <div className="w-full px-4 sm:px-6 lg:px-8 py-8">
        <div className="max-w-3xl mx-auto">
          {/* Section Header */}
          <div className="flex items-center gap-3 mb-6">
            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-slate-100">
              <PenLine size={20} className="text-slate-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Tell Andora About This Person</h2>
              <p className="text-sm text-slate-500">Share the basics — Andora will craft the rest</p>
            </div>
          </div>

          <div className="space-y-5 bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
            {/* Name - Required */}
            <CharacterFormField
              label="Name"
              value={character.name || ''}
              onChange={(value) => handleChange({ name: value })}
              onPerfectToggle={() => togglePerfect('name')}
              onBlur={handleSaveNow}
              isPerfect={!!perfectFields.name}
              placeholder="e.g., Josh, Starr, Oma"
              helpText="The person's actual name"
              required
              fieldKey="name"
              hideAIButtons={true}
            />

            {/* Role */}
            <CharacterFormField
              label="Role"
              value={character.role || ''}
              onChange={(value) => handleChange({ role: value })}
              onPerfectToggle={() => togglePerfect('role')}
              onBlur={handleSaveNow}
              isPerfect={!!perfectFields.role}
              placeholder="e.g., CEO, CTO, Marketing Lead"
              helpText="Their position or title"
              fieldKey="role"
              hideAIButtons={true}
            />

            {/* Work Mode */}
            <CharacterFormField
              label="Work Mode"
              value={character.work_mode || ''}
              onChange={(value) => handleChange({ work_mode: value as 'onsite' | 'remote' | 'hybrid' })}
              onPerfectToggle={() => togglePerfect('work_mode')}
              onBlur={handleSaveNow}
              isPerfect={!!perfectFields.work_mode}
              type="select"
              options={WORK_MODES}
              fieldKey="work_mode"
              hideAIButtons={true}
            />

            {/* Gender */}
            <CharacterFormField
              label="Gender"
              value={character.gender || ''}
              onChange={(value) => handleChange({ gender: value })}
              onPerfectToggle={() => togglePerfect('gender')}
              onBlur={handleSaveNow}
              isPerfect={!!perfectFields.gender}
              type="select"
              options={[
                { value: 'Male', label: 'Male' },
                { value: 'Female', label: 'Female' },
                { value: 'Non-binary', label: 'Non-binary' },
                { value: 'Prefer not to say', label: 'Prefer not to say' }
              ]}
              helpText="Helps Andora use correct pronouns"
              fieldKey="gender"
              hideAIButtons={true}
            />

            {/* Highlights/About */}
            <CharacterFormField
              label={`What makes ${character.name || 'them'} special?`}
              value={character.about || ''}
              onChange={(value) => handleChange({ about: value })}
              onPerfectToggle={() => togglePerfect('about')}
              onBlur={handleSaveNow}
              isPerfect={!!perfectFields.about}
              type="textarea"
              placeholder="Strengths, quirks, key facts, communication style, anything memorable..."
              rows={4}
              helpText="The more you share, the better Andora understands them"
              fieldKey="about"
              hideAIButtons={true}
            />

            {/* Optional Notes - User can add extra context */}
            <details className="group pt-4 border-t border-slate-200">
              <summary className="cursor-pointer text-sm font-medium text-slate-600 hover:text-primary-600 transition-colors flex items-center gap-2">
                <span>Optional notes</span>
                <span className="text-xs font-normal text-slate-400">
                  ({[character.backstory, character.voice].filter(Boolean).length > 0
                    ? `${[character.backstory, character.voice].filter(Boolean).length} filled`
                    : 'Backstory, Voice'})
                </span>
              </summary>
              <div className="mt-4 space-y-4">
                <CharacterFormField
                  label="Backstory Notes"
                  value={character.backstory || ''}
                  onChange={(value) => handleChange({ backstory: value })}
                  onPerfectToggle={() => { }}
                  onBlur={handleSaveNow}
                  isPerfect={false}
                  type="textarea"
                  placeholder="Optional: Any backstory notes..."
                  rows={2}
                  helpText="For your own reference"
                  fieldKey="backstory"
                  hideAIButtons={true}
                  hidePerfectToggle={true}
                />

                <CharacterFormField
                  label="Voice & Tone Notes"
                  value={character.voice || ''}
                  onChange={(value) => handleChange({ voice: value })}
                  onPerfectToggle={() => { }}
                  onBlur={handleSaveNow}
                  isPerfect={false}
                  type="textarea"
                  placeholder="Optional: Notes about speaking style..."
                  rows={2}
                  helpText="Reminders about tone or phrases"
                  fieldKey="voice"
                  hideAIButtons={true}
                  hidePerfectToggle={true}
                />
              </div>
            </details>
          </div>
        </div>
      </div>

      {/* ==================== AI GENERATION CTA ==================== */}
      <div className="w-full px-4 sm:px-6 lg:px-8 py-4">
        <div className="max-w-3xl mx-auto">
          <div className={`relative overflow-hidden rounded-2xl border-2 transition-all ${hasEnoughForAI
            ? 'border-primary-300 bg-gradient-to-br from-primary-50 via-purple-50 to-white'
            : 'border-slate-200 bg-slate-50'
            }`}>
            <div
              className="absolute inset-0 opacity-30 bg-[radial-gradient(circle_at_top_right,_rgba(139,92,246,0.3),transparent_50%)]"
              aria-hidden
            />
            <div className="relative z-10 p-6 sm:p-8 flex flex-col sm:flex-row items-center gap-6">
              <div className="flex-shrink-0">
                <PyAvatar size="lg" animate={isGenerating} />
              </div>
              <div className="flex-1 text-center sm:text-left">
                <h3 className="text-lg font-semibold text-slate-900 flex items-center justify-center sm:justify-start gap-2">
                  <Wand2 size={20} className="text-primary-600" />
                  Let Andora Build the Persona
                </h3>
                <p className="mt-1 text-sm text-slate-600">
                  {hasEnoughForAI
                    ? "Based on what you've shared, Andora will suggest their character name, personality, and cinematic persona. Mark any field as perfect to lock it—Andora will only update fields that aren't perfect."
                    : "Add the person's name above to get started."}
                </p>
              </div>
              {onAIGenerate && (
                <Button
                  onClick={onAIGenerate}
                  loading={isGenerating}
                  disabled={!hasEnoughForAI}
                  size="lg"
                  className="flex-shrink-0 px-6 py-3 bg-gradient-to-r from-primary-600 to-purple-600 text-white hover:from-primary-700 hover:to-purple-700 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Sparkles size={18} className="mr-2" />
                  {isGenerating ? 'Suggesting...' : 'Suggest'}
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ==================== SECTION 2: AI-GENERATED CONTENT ==================== */}
      <div ref={aiSectionRef} className="w-full px-4 sm:px-6 lg:px-8 py-8">
        <div className="max-w-3xl mx-auto">
          {/* Section Header */}
          <div className="flex items-center gap-3 mb-6">
            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-br from-primary-100 to-purple-100">
              <Bot size={20} className="text-primary-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                Andora's Generated Persona
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary-100 text-primary-700 text-xs font-medium">
                  <Sparkles size={12} />
                  AI
                </span>
              </h2>
              <p className="text-sm text-slate-500">Review Andora's suggestions — mark fields as perfect to lock them in</p>
            </div>
          </div>

          <div className="space-y-5 bg-gradient-to-br from-primary-50/50 via-purple-50/50 to-white rounded-2xl border border-primary-200/50 p-6 shadow-sm">
            {/* Character Name - The dramatic storytelling role */}
            <CharacterFormField
              label="Character Name"
              value={character.character_name || ''}
              onChange={(value) => handleChange({ character_name: value })}
              onPerfectToggle={() => togglePerfect('character_name')}
              onBlur={handleSaveNow}
              isPerfect={!!perfectFields.character_name}
              placeholder="e.g., The Guardian, The Maverick, The Sage"
              helpText="Their role in your brand's story — the name that captures who they are in the narrative"
              fieldKey="character_name"
              suggestion={suggestions?.character_name}
              onSuggestionApply={handleSuggestionApply}
              onSuggestionRefine={handleSuggestionRefine}
              isRefining={refiningField === 'character_name'}
            />

            {/* Personality Type - How they approach work and life */}
            <CharacterFormField
              label="Personality Type"
              value={character.personality || ''}
              onChange={(value) => handleChange({ personality: value })}
              onPerfectToggle={() => togglePerfect('personality')}
              onBlur={handleSaveNow}
              isPerfect={!!perfectFields.personality}
              type="input"
              placeholder="e.g., Strategic visionary (INTJ), Creative catalyst, Empathetic connector"
              helpText="How they approach work and life — their professional and personal operating style"
              fieldKey="personality"
              suggestion={suggestions?.personality}
              onSuggestionApply={handleSuggestionApply}
              onSuggestionRefine={handleSuggestionRefine}
              isRefining={refiningField === 'personality'}
            />

            {/* Cinematic Persona */}
            <div className="space-y-2">
              <CharacterFormField
                label="Cinematic Persona"
                value={character.persona || ''}
                onChange={(value) => handleChange({ persona: value })}
                onPerfectToggle={() => togglePerfect('persona')}
                onBlur={handleSaveNow}
                isPerfect={!!perfectFields.persona}
                type="textarea"
                placeholder="Andora will craft a rich, detailed persona description here..."
                rows={6}
                helpText="The full persona — edit anything that doesn't feel right"
                fieldKey="persona"
                suggestion={suggestions?.persona}
                onSuggestionApply={handleSuggestionApply}
                onSuggestionRefine={handleSuggestionRefine}
                isRefining={refiningField === 'persona'}
              />

              {character.persona && (
                <button
                  onClick={copyPersona}
                  className="px-4 py-2 text-sm bg-primary-50 hover:bg-primary-100 text-primary-700 rounded-lg transition-colors"
                >
                  {personaCopied ? '✓ Copied!' : 'Copy Persona'}
                </button>
              )}
            </div>


          </div>
        </div>
      </div>

      {/* Bottom Action Bar */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-slate-200 shadow-lg">
        <div className="px-4 sm:px-6 lg:px-8 py-4">
          <div className="max-w-3xl mx-auto flex items-center justify-between gap-4">
            <div className="text-sm text-slate-600">
              {hasAllPerfectFields
                ? '✓ All fields perfect — ready to train'
                : `${perfectFieldCount}/${TOTAL_CHARACTER_FIELD_COUNT} fields marked perfect`}
            </div>
            <div className="flex items-center gap-2">
              {onAddCharacter && (
                <Button
                  onClick={onAddCharacter}
                  size="sm"
                  variant="outline"
                  className="border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                >
                  <Users size={16} className="mr-1.5" />
                  <span className="hidden sm:inline">{characters.length === 0 ? 'Add Persona' : 'Add Another'}</span>
                  <span className="inline sm:hidden">Add</span>
                </Button>
              )}

              {showAllDone && onAllDone && (
                <Button
                  onClick={onAllDone}
                  loading={isTraining}
                  size="sm"
                  className="bg-emerald-600 text-white hover:bg-emerald-700"
                >
                  <CheckCircle size={16} className="mr-1.5" />
                  {isTraining ? 'Training...' : 'All Done'}
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
