/**
 * PERSONALITY FORMATTER
 *
 * Converts raw MBTI data to one-line personality format
 * Blueprint requirement: "PERSONALITY must be ONE LINE with optional 16personalities.com type reference"
 */

interface MBTIScores {
  introverted?: number;
  extraverted?: number;
  intuitive?: number;
  sensing?: number;
  thinking?: number;
  feeling?: number;
  judging?: number;
  perceiving?: number;
  assertive?: number;
  turbulent?: number;
}

interface PersonalityDescriptors {
  [key: string]: string[];
}

/**
 * Parse raw MBTI percentage string into structured scores
 */
export function parseRawMBTI(raw: string): MBTIScores | null {
  if (!raw || typeof raw !== 'string') return null;

  const scores: MBTIScores = {};

  // Match patterns like "64% Introverted" or "84% intuitive"
  const patterns = [
    { regex: /(\d+)%?\s*introverted/i, key: 'introverted' },
    { regex: /(\d+)%?\s*extraverted/i, key: 'extraverted' },
    { regex: /(\d+)%?\s*intuitive/i, key: 'intuitive' },
    { regex: /(\d+)%?\s*sensing/i, key: 'sensing' },
    { regex: /(\d+)%?\s*thinking/i, key: 'thinking' },
    { regex: /(\d+)%?\s*feeling/i, key: 'feeling' },
    { regex: /(\d+)%?\s*judging/i, key: 'judging' },
    { regex: /(\d+)%?\s*perceiving/i, key: 'perceiving' },
    { regex: /(\d+)%?\s*assertive/i, key: 'assertive' },
    { regex: /(\d+)%?\s*turbulent/i, key: 'turbulent' }
  ];

  patterns.forEach(({ regex, key }) => {
    const match = raw.match(regex);
    if (match) {
      scores[key as keyof MBTIScores] = parseInt(match[1], 10);
    }
  });

  // Return null if no scores were found
  if (Object.keys(scores).length === 0) return null;

  return scores;
}

/**
 * Determine MBTI type from scores
 */
export function determineMBTIType(scores: MBTIScores): string {
  const I_E = (scores.introverted || 0) > (scores.extraverted || 0) ? 'I' : 'E';
  const N_S = (scores.intuitive || 0) > (scores.sensing || 0) ? 'N' : 'S';
  const T_F = (scores.thinking || 0) > (scores.feeling || 0) ? 'T' : 'F';
  const J_P = (scores.judging || 0) > (scores.perceiving || 0) ? 'J' : 'P';
  const A_T = (scores.assertive || 0) > (scores.turbulent || 0) ? '-A' : '-T';

  return `${I_E}${N_S}${T_F}${J_P}${A_T}`;
}

/**
 * Get personality descriptors based on MBTI type
 */
export function getPersonalityDescriptors(mbtiType: string): string[] {
  // Remove -A/-T suffix for base type matching
  const baseType = mbtiType.replace(/-[AT]$/, '');

  const descriptors: PersonalityDescriptors = {
    'INTJ': ['Strategic visionary', 'Analytical architect', 'Independent thinker', 'Systems builder'],
    'INTP': ['Logical innovator', 'Curious analyst', 'Abstract thinker', 'Problem solver'],
    'ENTJ': ['Decisive leader', 'Strategic commander', 'Goal-driven organizer', 'Natural executive'],
    'ENTP': ['Creative debater', 'Entrepreneurial innovator', 'Quick-witted challenger', 'Ideas person'],
    'INFJ': ['Thoughtful advocate', 'Insightful counselor', 'Visionary idealist', 'Empathetic guide'],
    'INFP': ['Authentic idealist', 'Creative healer', 'Values-driven mediator', 'Passionate dreamer'],
    'ENFJ': ['Charismatic mentor', 'Inspiring leader', 'Empathetic motivator', 'Natural teacher'],
    'ENFP': ['Enthusiastic catalyst', 'Creative explorer', 'Passionate inspirer', 'Energetic campaigner'],
    'ISTJ': ['Dependable organizer', 'Practical implementer', 'Methodical executor', 'Responsible guardian'],
    'ISFJ': ['Loyal supporter', 'Caring protector', 'Detail-oriented helper', 'Devoted defender'],
    'ESTJ': ['Efficient administrator', 'Direct manager', 'Results-oriented leader', 'Practical organizer'],
    'ESFJ': ['Supportive coordinator', 'Warm facilitator', 'Social connector', 'Caring provider'],
    'ISTP': ['Practical craftsperson', 'Analytical problem-solver', 'Hands-on virtuoso', 'Adaptable technician'],
    'ISFP': ['Creative explorer', 'Gentle artist', 'Flexible composer', 'Aesthetic adventurer'],
    'ESTP': ['Bold entrepreneur', 'Action-oriented doer', 'Dynamic negotiator', 'Energetic persuader'],
    'ESFP': ['Spontaneous entertainer', 'Enthusiastic performer', 'Social energizer', 'Fun-loving engager']
  };

  return descriptors[baseType] || ['Strategic thinker', 'Thoughtful leader', 'Creative problem-solver'];
}

/**
 * Generate leadership/collaboration style suffix
 */
export function getLeadershipStyle(mbtiType: string): string {
  const baseType = mbtiType.replace(/-[AT]$/, '');

  const styles: { [key: string]: string } = {
    'INTJ': 'who leads with data and strategic vision',
    'INTP': 'who innovates through analysis and logic',
    'ENTJ': 'who drives results with decisive action',
    'ENTP': 'who challenges norms with creative solutions',
    'INFJ': 'who guides with empathy and insight',
    'INFP': 'who leads with values and authenticity',
    'ENFJ': 'who inspires through connection and vision',
    'ENFP': 'who energizes with passion and possibility',
    'ISTJ': 'who delivers through reliability and method',
    'ISFJ': 'who serves with dedication and care',
    'ESTJ': 'who executes with efficiency and order',
    'ESFJ': 'who supports with warmth and organization',
    'ISTP': 'who solves problems with practical skill',
    'ISFP': 'who creates with sensitivity and flexibility',
    'ESTP': 'who acts with boldness and adaptability',
    'ESFP': 'who engages with enthusiasm and spontaneity'
  };

  return styles[baseType] || 'who leads with thoughtful consideration';
}

/**
 * Main function: Format personality to one-line description
 */
export function formatPersonalityToOneLine(personality: string | null | undefined): string | null {
  if (!personality) return null;

  // If already in good format (has MBTI code in parentheses), return as is
  if (/\([A-Z]{4}-[AT]\)/.test(personality)) {
    return personality;
  }

  // Try to parse as raw MBTI data
  const scores = parseRawMBTI(personality);
  if (!scores) {
    // Not raw MBTI data, return as is (user might have written custom description)
    return personality;
  }

  // Generate formatted personality
  const mbtiType = determineMBTIType(scores);
  const descriptors = getPersonalityDescriptors(mbtiType);
  const leadershipStyle = getLeadershipStyle(mbtiType);

  // Pick a random descriptor for variety
  const descriptor = descriptors[Math.floor(Math.random() * descriptors.length)];

  return `${descriptor} (${mbtiType}) ${leadershipStyle}`;
}

/**
 * Check if personality field needs formatting
 */
export function needsFormatting(personality: string | null | undefined): boolean {
  if (!personality) return false;

  // Check if it looks like raw MBTI data
  const hasPercentages = /\d+%/.test(personality);
  const hasMBTITraits = /(introverted|extraverted|intuitive|sensing|thinking|feeling|judging|perceiving|assertive|turbulent)/i.test(personality);

  return hasPercentages && hasMBTITraits;
}

/**
 * Extract MBTI code from formatted personality
 */
export function extractMBTICode(personality: string): string | null {
  const match = personality.match(/\(([A-Z]{4}-[AT])\)/);
  return match ? match[1] : null;
}
