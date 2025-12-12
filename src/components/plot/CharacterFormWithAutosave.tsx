/**
 * CharacterFormWithAutosave Component
 *
 * Complete character form with field-level perfect toggles and autosave.
 * Users cooperate with Andora - fill what they know, mark fields as perfect.
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Character, AgeRange, CharacterPerfectFields } from '../../types';
import { CharacterFormField, CharacterFieldKey } from './CharacterFormField';
import { TOTAL_CHARACTER_FIELD_COUNT } from './characterFieldConstants';
import { Button } from '../common/Button';
import { AndoraAvatar } from '../common/AndoraAvatar';
import { Sparkles, Save, Trash2 } from 'lucide-react';
import { debounce } from '../../utils/debounce';

interface CharacterFormWithAutosaveProps {
  character: Character;
  brandId: string;
  onChange: (updates: Partial<Character>) => void;
  onSave: (character: Character) => Promise<void>;
  onDelete?: () => void;
  onAIGenerate?: () => void;
  isGenerating?: boolean;
  suggestions?: Partial<Record<CharacterFieldKey, string>>;
  onSuggestionApply?: (field: CharacterFieldKey, value: string) => void;
  onFieldRefine?: (characterId: string, field: CharacterFieldKey) => void;
  refiningField?: CharacterFieldKey | null;
}

const AGE_RANGES: AgeRange[] = [
  'teen',
  'early-20s',
  'mid-20s',
  'late-20s',
  'early-30s',
  'mid-30s',
  'late-30s',
  'early-40s',
  'mid-40s',
  'late-40s',
  '50s',
  '60s+'
];

const WORK_MODES = [
  { value: 'onsite', label: 'Onsite' },
  { value: 'remote', label: 'Remote' },
  { value: 'hybrid', label: 'Hybrid' }
];

const formatListForTextarea = (values?: string[]): string => {
  if (!values || values.length === 0) return '';
  return values.join('\n');
};

const parseListFromTextarea = (value: string): string[] => {
  return value
    .split(/[,\n]/)
    .map(entry => entry.trim())
    .filter(Boolean);
};

export const CharacterFormWithAutosave: React.FC<CharacterFormWithAutosaveProps> = ({
  character,
  brandId,
  onChange,
  onSave,
  onDelete,
  onAIGenerate,
  isGenerating = false,
  suggestions = {},
  onSuggestionApply,
  onFieldRefine,
  refiningField = null
}) => {
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const lastSavedCharacterRef = useRef<Character | null>(null);
  const [personaCopied, setPersonaCopied] = useState(false);
  const [localCharacter, setLocalCharacter] = useState<Character>(character);

  const copyToClipboard = useCallback(async (text: string, onSuccess: () => void) => {
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.setAttribute('readonly', '');
        textarea.style.position = 'absolute';
        textarea.style.left = '-9999px';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      onSuccess();
    } catch (error) {
      console.error('Failed to copy text to clipboard:', error);
    }
  }, []);

  // Save function (not debounced, called on blur)
  const saveNow = useCallback(async () => {
    if (!localCharacter.id) return; // Only check if ID exists, not hasUnsavedChanges

    setIsSaving(true);
    try {
      await onSave(localCharacter);
      setLastSaved(new Date());
      setHasUnsavedChanges(false);
      lastSavedCharacterRef.current = localCharacter;
    } catch (error) {
      console.error('Autosave failed:', error);
    } finally {
      setIsSaving(false);
    }
  }, [localCharacter, onSave]); // Remove hasUnsavedChanges from deps

  // Debounced onChange - waits 1.5 seconds after user stops typing before updating parent
  const debouncedOnChange = useRef(
    debounce((updates: Partial<Character>) => {
      onChange(updates);
      // hasUnsavedChanges is already set immediately in handleLocalChange
    }, 1500)
  ).current;

  // Safety debounced autosave (3 seconds after changes stop)
  const debouncedSave = useRef(
    debounce(async (char: Character) => {
      if (char.id && hasUnsavedChanges) {
        await saveNow();
      }
    }, 3000)
  ).current;

  // Sync localCharacter when prop changes (from parent)
  useEffect(() => {
    setLocalCharacter(character);
  }, [character.id]); // Only sync on character ID change (new character)

  // Track changes and trigger debounced save
  useEffect(() => {
    if (localCharacter.id && lastSavedCharacterRef.current !== localCharacter) {
      setHasUnsavedChanges(true);
      debouncedSave(localCharacter); // Safety backup after 3 seconds
    }
  }, [localCharacter, debouncedSave]);

  // Handle local changes with debounced parent update
  const handleLocalChange = useCallback((updates: Partial<Character>) => {
    const updated = { ...localCharacter, ...updates };
    setLocalCharacter(updated);
    setHasUnsavedChanges(true); // CRITICAL: Set this immediately so onBlur can save!
    debouncedOnChange(updates); // Update parent after 1.5s delay
  }, [localCharacter, debouncedOnChange]);

  useEffect(() => {
    setPersonaCopied(false);
  }, [localCharacter.persona]);

  const handlePersonaCopy = useCallback(() => {
    if (!localCharacter.persona) return;

    copyToClipboard(localCharacter.persona, () => {
      setPersonaCopied(true);
      setTimeout(() => {
        setPersonaCopied(false);
      }, 2000);
    });
  }, [localCharacter.persona, copyToClipboard]);

  const perfectFields = localCharacter.perfect_fields || {};

  const togglePerfect = (field: keyof CharacterPerfectFields) => {
    const newPerfectFields = {
      ...perfectFields,
      [field]: !perfectFields[field]
    };
    const updates = { perfect_fields: newPerfectFields };
    setLocalCharacter({ ...localCharacter, ...updates });
    onChange(updates); // Immediate update for toggles
    setTimeout(() => {
      saveNow();
    }, 300);
  };

  // Count perfect fields - all configured fields must be marked as perfect
  const totalFieldCount = TOTAL_CHARACTER_FIELD_COUNT;
  const perfectFieldCount = Object.values(perfectFields).filter(Boolean).length;
  const hasAllPerfectFields = perfectFieldCount === totalFieldCount;
  const handleSuggestionApply = (field: CharacterFieldKey, value: string) => {
    onSuggestionApply?.(field, value);
    setLocalCharacter({ ...localCharacter, [field]: value });
    setTimeout(() => {
      saveNow();
    }, 400);
  };

  const handleSuggestionRefine = (field: CharacterFieldKey) => {
    if (!localCharacter.id) return;
    onFieldRefine?.(localCharacter.id, field);
  };

  return (
    <div className={`p-6 rounded-lg border ${hasAllPerfectFields
      ? 'border-green-300 bg-green-50/30 glass-effect'
      : 'border-primary-200/40 bg-white/50 glass-effect'
      } space-y-4`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-primary-900">
            {localCharacter.name || 'New Character'}
          </h3>
          <div className="flex items-center gap-2 mt-1">
            {isSaving && (
              <span className="text-xs text-slate-500 flex items-center gap-1">
                <Save size={12} className="animate-pulse" />
                Saving...
              </span>
            )}
            {lastSaved && !isSaving && (
              <span className="text-xs text-green-600">
                Saved {new Date().getTime() - lastSaved.getTime() < 3000 ? 'just now' : 'recently'}
              </span>
            )}
            <span className={`text-xs flex items-center gap-1 ml-2 ${hasAllPerfectFields ? 'text-green-600' : 'text-slate-500'
              }`}>
              <AndoraAvatar size="sm" className="w-4 h-4" />
              {perfectFieldCount}/{totalFieldCount} fields perfect
            </span>
          </div>
        </div>
        {onDelete && (
          <Button
            onClick={onDelete}
            size="sm"
            variant="outline"
            className="text-red-600 hover:bg-red-50"
          >
            <Trash2 size={16} />
          </Button>
        )}
      </div>

      {/* Form Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Character Name */}
        <CharacterFormField
          label="Character Name"
          value={localCharacter.name || ''}
          onChange={(value) => handleLocalChange({ name: value })}
          onPerfectToggle={() => togglePerfect('name')}
          onBlur={saveNow}
          isPerfect={!!perfectFields.name}
          placeholder="e.g., Queen Mother, Billionaire Mechanic, The Mogul, Chris Catalyst"
          helpText="A colorful, memorable name that connects with your audience. Andora uses this in your brand's story."
          required
          fieldKey="name"
          suggestion={suggestions?.name}
          onSuggestionApply={handleSuggestionApply}
          onSuggestionRefine={handleSuggestionRefine}
          isRefining={refiningField === 'name'}
        />

        {/* Real Name */}
        <CharacterFormField
          label="Real Name"
          value={localCharacter.character_name || ''}
          onChange={(value) => handleLocalChange({ character_name: value })}
          onPerfectToggle={() => togglePerfect('character_name')}
          onBlur={saveNow}
          isPerfect={!!perfectFields.character_name}
          placeholder="e.g., Josh, Starr, Oma"
          helpText="The actual name of this person on your team. Andora uses this to make content feel more personal."
          fieldKey="character_name"
        />

        {/* Role */}
        <CharacterFormField
          label="Role"
          value={localCharacter.role || ''}
          onChange={(value) => handleLocalChange({ role: value })}
          onPerfectToggle={() => togglePerfect('role')}
          onBlur={saveNow}
          isPerfect={!!perfectFields.role}
          placeholder="e.g., CEO, Marketing Lead, Product Designer"
          helpText="What this person does on your team. Helps Andora understand their expertise."
          fieldKey="role"
          suggestion={suggestions?.role}
          onSuggestionApply={handleSuggestionApply}
          onSuggestionRefine={handleSuggestionRefine}
          isRefining={refiningField === 'role'}
        />

        {/* Gender */}
        <CharacterFormField
          label="Gender"
          value={localCharacter.gender || ''}
          onChange={(value) => handleLocalChange({ gender: value as 'Male' | 'Female' | 'Non-binary' | 'Prefer not to say' })}
          onPerfectToggle={() => togglePerfect('gender')}
          onBlur={saveNow}
          isPerfect={!!perfectFields.gender}
          type="select"
          options={[
            { value: 'Male', label: 'Male' },
            { value: 'Female', label: 'Female' },
            { value: 'Non-binary', label: 'Non-binary' },
            { value: 'Prefer not to say', label: 'Prefer not to say' }
          ]}
          helpText="Helps Andora use the right pronouns when telling your story"
          fieldKey="gender"
          suggestion={suggestions?.gender}
          onSuggestionApply={handleSuggestionApply}
          onSuggestionRefine={handleSuggestionRefine}
          isRefining={refiningField === 'gender'}
        />

        {/* Age Range */}
        <CharacterFormField
          label="Age Range"
          value={localCharacter.age_range || ''}
          onChange={(value) => handleLocalChange({ age_range: value as AgeRange })}
          onPerfectToggle={() => togglePerfect('age_range')}
          onBlur={saveNow}
          isPerfect={!!perfectFields.age_range}
          type="select"
          options={AGE_RANGES.map(range => ({ value: range, label: range }))}
          helpText="Gives Andora context about this person's generation and perspective"
          fieldKey="age_range"
          suggestion={suggestions?.age_range}
          onSuggestionApply={handleSuggestionApply}
          onSuggestionRefine={handleSuggestionRefine}
          isRefining={refiningField === 'age_range'}
        />

        {/* Work Mode */}
        <CharacterFormField
          label="Work Mode"
          value={localCharacter.work_mode || ''}
          onChange={(value) => handleLocalChange({ work_mode: value as 'onsite' | 'remote' | 'hybrid' })}
          onPerfectToggle={() => togglePerfect('work_mode')}
          onBlur={saveNow}
          isPerfect={!!perfectFields.work_mode}
          type="select"
          options={WORK_MODES}
          helpText="How this person works - helps Andora understand their work environment"
          fieldKey="work_mode"
          suggestion={suggestions?.work_mode}
          onSuggestionApply={handleSuggestionApply}
          onSuggestionRefine={handleSuggestionRefine}
          isRefining={refiningField === 'work_mode'}
        />
      </div>

      {/* Highlights & Perks */}
      <CharacterFormField
        label="Highlights & Perks"
        value={localCharacter.about || ''}
        onChange={(value) => handleLocalChange({ about: value })}
        onPerfectToggle={() => togglePerfect('about')}
        onBlur={saveNow}
        isPerfect={!!perfectFields.about}
        type="textarea"
        placeholder="What makes them special? Their quirks, strengths, unique traits, backstory... Share whatever comes to mind and Andora will help bring it to life."
        rows={4}
        helpText="Share anything interesting about this person. Andora uses these highlights to create their full persona."
        fieldKey="about"
        suggestion={suggestions?.about}
        onSuggestionApply={handleSuggestionApply}
        onSuggestionRefine={handleSuggestionRefine}
        isRefining={refiningField === 'about'}
      />

      {/* Personality Type */}
      <CharacterFormField
        label="Personality Type"
        value={localCharacter.personality || ''}
        onChange={(value) => handleLocalChange({ personality: value })}
        onPerfectToggle={() => togglePerfect('personality')}
        onBlur={saveNow}
        isPerfect={!!perfectFields.personality}
        type="input"
        placeholder="e.g., Strategic visionary (INTJ) who leads with data and empathy"
        helpText={
          <>
            How would you describe their personality in one line? You can also paste MBTI results from{' '}
            <a
              href="https://16personalities.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary-600 hover:text-primary-700 underline"
            >
              16personalities.com
            </a>
            {' '}and Andora will format it.
          </>
        }
        fieldKey="personality"
        suggestion={suggestions?.personality}
        onSuggestionApply={handleSuggestionApply}
        onSuggestionRefine={handleSuggestionRefine}
        isRefining={refiningField === 'personality'}
      />

      {/* Persona - Andora writes this */}
      <div className="space-y-2">
        <CharacterFormField
          label="Persona"
          value={localCharacter.persona || ''}
          onChange={() => { }} // No-op for read-only field
          onPerfectToggle={() => togglePerfect('persona')}
          onBlur={saveNow}
          isPerfect={!!perfectFields.persona}
          type="textarea"
          placeholder="Andora will write a compelling persona based on what you share above."
          rows={2}
          helpText="Andora brings this character to life using the details you provided. Click 'Suggest' to have Andora write this."
          fieldKey="persona"
          suggestion={suggestions?.persona}
          onSuggestionApply={handleSuggestionApply}
          onSuggestionRefine={handleSuggestionRefine}
          suggestionLabel="Andora's Persona"
          isRefining={refiningField === 'persona'}
          readOnly={true}
        />
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
          <span>
            {localCharacter.persona
              ? 'Copy this persona to use in your marketing materials.'
              : 'Click "Suggest" below and Andora will write this for you.'}
          </span>
          <button
            type="button"
            onClick={handlePersonaCopy}
            disabled={!localCharacter.persona}
            className={`px-3 py-1 rounded-md border transition ${localCharacter.persona
              ? 'border-primary-300 text-primary-700 hover:bg-primary-100'
              : 'border-slate-200 text-slate-400 cursor-not-allowed'
              }`}
          >
            {personaCopied ? 'Copied!' : 'Copy Persona'}
          </button>
        </div>
      </div>

      {/* Optional User Extensions */}
      <div className="mt-6 pt-6 border-t border-slate-200">
        <h3 className="text-sm font-semibold text-slate-700 mb-3">Optional Extensions (Raw Notes)</h3>
        <p className="text-xs text-slate-500 mb-4">
          These fields are optional and meant for your raw notes. They help deepen context for Andora but are not required.
        </p>

        {/* Backstory - Optional Extension */}
        <CharacterFormField
          label="Backstory Notes"
          value={localCharacter.backstory || ''}
          onChange={(value) => handleLocalChange({ backstory: value })}
          onPerfectToggle={() => { }} // No-op
          onBlur={saveNow}
          isPerfect={false}
          type="textarea"
          placeholder="Optional: Any backstory notes that could help deepen the character..."
          rows={2}
          helpText="Optional extension - raw notes about backstory or origin story"
          fieldKey="backstory"
          hideAIButtons={true}
          hidePerfectToggle={true}
        />

        {/* Character & Voice - Optional Extension */}
        <CharacterFormField
          label="Character & Voice Notes"
          value={localCharacter.voice || ''}
          onChange={(value) => handleLocalChange({ voice: value })}
          onPerfectToggle={() => { }} // No-op
          onBlur={saveNow}
          isPerfect={false}
          type="textarea"
          placeholder="Optional: Any notes about character essence or voice style..."
          rows={2}
          helpText="Optional extension - raw notes about character and voice"
          fieldKey="voice"
          hideAIButtons={true}
          hidePerfectToggle={true}
        />
      </div>

      {/* Suggest Button - Always visible and prominent */}
      {onAIGenerate && (
        <div className="sticky bottom-0 bg-white/95 backdrop-blur-sm pt-3 pb-2 border-t border-primary-200/40 -mx-6 px-6 shadow-lg">
          <Button
            onClick={onAIGenerate}
            loading={isGenerating}
            size="lg"
            className="w-full"
            disabled={!localCharacter.name}
            variant={hasAllPerfectFields ? 'outline' : 'primary'}
          >
            <Sparkles size={18} className="mr-2" />
            {hasAllPerfectFields
              ? `✓ All ${totalFieldCount} Fields Perfect`
              : isGenerating ? 'Andora is thinking...' : 'Suggest'}
          </Button>
          {!hasAllPerfectFields && (
            <p className="text-xs text-slate-500 text-center mt-2">
              {hasUnsavedChanges
                ? 'Save your changes first (click away from any field)'
                : `Andora will fill in any field you haven't marked as perfect • ${perfectFieldCount}/${totalFieldCount} perfect`}
            </p>
          )}
        </div>
      )}
    </div>
  );
};
