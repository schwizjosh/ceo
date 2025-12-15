import type { CharacterFieldKey } from './CharacterFormField';

export const CHARACTER_FIELD_ORDER: CharacterFieldKey[] = [
  'name',
  'character_name',
  'role',
  'gender',
  'age_range',
  'work_mode',
  'about',
  'personality',
  'persona',
];

// Optional user extensions (no AI generation, no perfect toggles)
export const OPTIONAL_EXTENSIONS: CharacterFieldKey[] = [
  'backstory',
  'voice',
];

export const TOTAL_CHARACTER_FIELD_COUNT = CHARACTER_FIELD_ORDER.length;
