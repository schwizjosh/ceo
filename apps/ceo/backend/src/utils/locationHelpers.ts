/**
 * LOCATION-AWARE CONTENT GENERATION HELPERS
 *
 * Utilities for filtering and validating character pairings based on location
 * Blueprint requirement: "Never combine remote and onsite characters unless they're hybrid"
 */

export type WorkMode = 'onsite' | 'remote' | 'hybrid' | 'flexible';

export interface Character {
  id?: string;
  name: string;
  location: string;
  work_mode?: WorkMode;
  persona?: string;
}

/**
 * Check if two characters can realistically interact based on their locations
 */
export function canCharactersInteract(char1: Character, char2: Character): boolean {
  const mode1 = char1.work_mode || inferWorkMode(char1.location);
  const mode2 = char2.work_mode || inferWorkMode(char2.location);

  // Flexible characters can interact with anyone
  if (mode1 === 'flexible' || mode2 === 'flexible') {
    return true;
  }

  // Hybrid characters can interact with anyone
  if (mode1 === 'hybrid' || mode2 === 'hybrid') {
    return true;
  }

  // Same mode can always interact
  if (mode1 === mode2) {
    return true;
  }

  // Remote and onsite cannot interact directly
  if ((mode1 === 'remote' && mode2 === 'onsite') ||
      (mode1 === 'onsite' && mode2 === 'remote')) {
    return false;
  }

  return true;
}

/**
 * Infer work mode from location string if work_mode is not explicitly set
 */
export function inferWorkMode(location: string): WorkMode {
  const lowerLocation = location.toLowerCase();

  if (lowerLocation.includes('remote') || lowerLocation.includes('virtual')) {
    return 'remote';
  }

  if (lowerLocation.includes('hybrid') || lowerLocation.includes('flexible')) {
    return 'hybrid';
  }

  if (lowerLocation.includes('travel') || lowerLocation.includes('anywhere')) {
    return 'flexible';
  }

  // Default to onsite if specific location mentioned
  return 'onsite';
}

/**
 * Filter characters that can interact with a specific character
 */
export function getCompatibleCharacters(
  targetCharacter: Character,
  allCharacters: Character[]
): Character[] {
  return allCharacters.filter(char => {
    if (char.id === targetCharacter.id || char.name === targetCharacter.name) {
      return false; // Exclude the target character itself
    }
    return canCharactersInteract(targetCharacter, char);
  });
}

/**
 * Get characters suitable for group content based on location compatibility
 */
export function getGroupCompatibleCharacters(
  characters: Character[]
): Character[][] {
  const groups: Character[][] = [];

  // Group 1: Onsite + Hybrid + Flexible
  const onsiteGroup = characters.filter(c => {
    const mode = c.work_mode || inferWorkMode(c.location);
    return mode === 'onsite' || mode === 'hybrid' || mode === 'flexible';
  });

  if (onsiteGroup.length > 1) {
    groups.push(onsiteGroup);
  }

  // Group 2: Remote + Hybrid + Flexible
  const remoteGroup = characters.filter(c => {
    const mode = c.work_mode || inferWorkMode(c.location);
    return mode === 'remote' || mode === 'hybrid' || mode === 'flexible';
  });

  if (remoteGroup.length > 1) {
    groups.push(remoteGroup);
  }

  return groups;
}

/**
 * Validate a list of characters for content generation
 * Returns { valid: boolean, reason?: string }
 */
export function validateCharacterPairing(characters: Character[]): {
  valid: boolean;
  reason?: string
} {
  if (characters.length === 0) {
    return { valid: false, reason: 'No characters provided' };
  }

  if (characters.length === 1) {
    return { valid: true }; // Single character is always valid
  }

  // Check all pairwise interactions
  for (let i = 0; i < characters.length; i++) {
    for (let j = i + 1; j < characters.length; j++) {
      if (!canCharactersInteract(characters[i], characters[j])) {
        return {
          valid: false,
          reason: `${characters[i].name} (${characters[i].work_mode || inferWorkMode(characters[i].location)}) and ${characters[j].name} (${characters[j].work_mode || inferWorkMode(characters[j].location)}) cannot interact - remote and onsite characters cannot be paired together`
        };
      }
    }
  }

  return { valid: true };
}

/**
 * Get location context string for prompts
 */
export function getLocationContext(characters: Character[]): string {
  return characters.map(c => {
    const mode = c.work_mode || inferWorkMode(c.location);
    return `${c.name} (${mode} - ${c.location})`;
  }).join(', ');
}
