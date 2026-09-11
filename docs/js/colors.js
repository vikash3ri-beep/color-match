// Color definitions, Stroop logic, and mode palette management for Color Match ⭐

export const BASE_COLORS = [
  { id: 'red', name: 'RED', hex: '#FF4444', textColor: '#FFFFFF' },
  { id: 'blue', name: 'BLUE', hex: '#4488FF', textColor: '#FFFFFF' },
  { id: 'green', name: 'GREEN', hex: '#44CC44', textColor: '#FFFFFF' },
  { id: 'yellow', name: 'YELLOW', hex: '#FFDD44', textColor: '#1E2235' },
  { id: 'orange', name: 'ORANGE', hex: '#FF8844', textColor: '#FFFFFF' },
  { id: 'purple', name: 'PURPLE', hex: '#AA44FF', textColor: '#FFFFFF' },
  { id: 'pink', name: 'PINK', hex: '#FF66AA', textColor: '#FFFFFF' },
  { id: 'cyan', name: 'CYAN', hex: '#44DDDD', textColor: '#1E2235' }
];

// Tricky close shades used for Speed Rush (Mode C)
export const CLOSE_SHADES = [
  { id: 'sky_blue', name: 'LIGHT BLUE', hex: '#66B2FF', textColor: '#1E2235' },
  { id: 'deep_blue', name: 'DARK BLUE', hex: '#1E50A2', textColor: '#FFFFFF' },
  { id: 'lime', name: 'LIME GREEN', hex: '#76FF03', textColor: '#1E2235' },
  { id: 'forest', name: 'DARK GREEN', hex: '#1B5E20', textColor: '#FFFFFF' },
  { id: 'tangerine', name: 'ORANGE', hex: '#FF6D00', textColor: '#FFFFFF' },
  { id: 'amber', name: 'AMBER', hex: '#FFB300', textColor: '#1E2235' },
  { id: 'crimson', name: 'CRIMSON', hex: '#D50000', textColor: '#FFFFFF' },
  { id: 'magenta', name: 'MAGENTA', hex: '#E040FB', textColor: '#FFFFFF' }
];

/**
 * Shuffle an array in place (Fisher-Yates)
 */
export function shuffle(array) {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * Generate a Stroop puzzle round
 * @param {Object} options
 * @param {string} options.mode - 'timeAttack' | 'livesMode' | 'speedRush'
 * @param {number} options.level - current level or score
 */
export function generateStroopRound({ mode = 'timeAttack', level = 1 }) {
  let pool = BASE_COLORS;
  let buttonCount = 4;

  if (mode === 'livesMode') {
    // Scaling difficulty for lives mode
    if (level <= 10) {
      buttonCount = 3;
      pool = BASE_COLORS.slice(0, 5);
    } else if (level <= 25) {
      buttonCount = 4;
      pool = BASE_COLORS.slice(0, 6);
    } else if (level <= 50) {
      buttonCount = 4;
      pool = BASE_COLORS;
    } else if (level <= 75) {
      buttonCount = 5;
      pool = [...BASE_COLORS, ...CLOSE_SHADES.slice(0, 2)];
    } else {
      buttonCount = 6;
      pool = [...BASE_COLORS, ...CLOSE_SHADES];
    }
  } else if (mode === 'speedRush') {
    // Mode C: Tricky close shades and 6 buttons
    buttonCount = 6;
    pool = [...CLOSE_SHADES, ...BASE_COLORS.slice(0, 4)];
  } else {
    // Time Attack: Standard 4 buttons
    buttonCount = 4;
    pool = BASE_COLORS;
  }

  // Shuffle available pool
  const shuffledPool = shuffle(pool);

  // Pick target font color (This is the CORRECT answer)
  const targetFontColor = shuffledPool[0];

  // Pick mismatched word text (Word meaning MUST differ from the font color to create Stroop effect)
  const otherColors = pool.filter(c => c.id !== targetFontColor.id);
  const targetWord = otherColors[Math.floor(Math.random() * otherColors.length)];

  // Pick distractor colors for buttons
  const distractors = shuffledPool.slice(1, buttonCount);
  
  // Combine correct color and distractors, then shuffle
  const buttons = shuffle([targetFontColor, ...distractors]);

  return {
    wordText: targetWord.name,
    fontColor: targetFontColor,
    options: buttons,
    correctId: targetFontColor.id
  };
}
