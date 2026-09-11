// LocalStorage data management for Color Match ⭐
// Persists high scores, user stats, settings, and unlockables

const STORAGE_KEYS = {
  HIGH_SCORE_TIME: 'cm_highScore_timeAttack',
  HIGH_SCORE_LIVES: 'cm_highScore_livesMode',
  HIGH_SCORE_SPEED: 'cm_highScore_speedRush',
  TOTAL_GAMES: 'cm_totalGamesPlayed',
  TOTAL_CORRECT: 'cm_totalCorrectAnswers',
  TOTAL_WRONG: 'cm_totalWrongAnswers',
  HIGHEST_STREAK: 'cm_highestStreak',
  SOUND_ENABLED: 'cm_soundEnabled',
  MUSIC_ENABLED: 'cm_musicEnabled',
  VIBRATION_ENABLED: 'cm_vibrationEnabled',
  AD_FREE: 'cm_adFreePurchased',
  SPEED_RUSH_UNLOCKED: 'cm_speedRushUnlocked'
};

class StorageManager {
  constructor() {
    this.initDefaults();
  }

  initDefaults() {
    if (localStorage.getItem(STORAGE_KEYS.SOUND_ENABLED) === null) {
      localStorage.setItem(STORAGE_KEYS.SOUND_ENABLED, 'true');
    }
    if (localStorage.getItem(STORAGE_KEYS.MUSIC_ENABLED) === null) {
      localStorage.setItem(STORAGE_KEYS.MUSIC_ENABLED, 'true');
    }
    if (localStorage.getItem(STORAGE_KEYS.VIBRATION_ENABLED) === null) {
      localStorage.setItem(STORAGE_KEYS.VIBRATION_ENABLED, 'true');
    }
  }

  getHighScore(mode) {
    let key;
    if (mode === 'livesMode') key = STORAGE_KEYS.HIGH_SCORE_LIVES;
    else if (mode === 'speedRush') key = STORAGE_KEYS.HIGH_SCORE_SPEED;
    else key = STORAGE_KEYS.HIGH_SCORE_TIME;

    return parseInt(localStorage.getItem(key) || '0', 10);
  }

  setHighScore(mode, score) {
    let key;
    if (mode === 'livesMode') key = STORAGE_KEYS.HIGH_SCORE_LIVES;
    else if (mode === 'speedRush') key = STORAGE_KEYS.HIGH_SCORE_SPEED;
    else key = STORAGE_KEYS.HIGH_SCORE_TIME;

    const currentBest = this.getHighScore(mode);
    if (score > currentBest) {
      localStorage.setItem(key, score.toString());
      return true; // New record
    }
    return false;
  }

  getStats() {
    const totalGames = parseInt(localStorage.getItem(STORAGE_KEYS.TOTAL_GAMES) || '0', 10);
    const totalCorrect = parseInt(localStorage.getItem(STORAGE_KEYS.TOTAL_CORRECT) || '0', 10);
    const totalWrong = parseInt(localStorage.getItem(STORAGE_KEYS.TOTAL_WRONG) || '0', 10);
    const bestStreak = parseInt(localStorage.getItem(STORAGE_KEYS.HIGHEST_STREAK) || '0', 10);
    const totalAnswers = totalCorrect + totalWrong;
    const accuracy = totalAnswers > 0 ? Math.round((totalCorrect / totalAnswers) * 100) : 0;

    return {
      totalGames,
      totalCorrect,
      totalWrong,
      bestStreak,
      accuracy,
      highScores: {
        timeAttack: this.getHighScore('timeAttack'),
        livesMode: this.getHighScore('livesMode'),
        speedRush: this.getHighScore('speedRush')
      }
    };
  }

  recordGameStats({ mode, score, correct, wrong, streak }) {
    const totalGames = parseInt(localStorage.getItem(STORAGE_KEYS.TOTAL_GAMES) || '0', 10) + 1;
    const totalCorrect = parseInt(localStorage.getItem(STORAGE_KEYS.TOTAL_CORRECT) || '0', 10) + correct;
    const totalWrong = parseInt(localStorage.getItem(STORAGE_KEYS.TOTAL_WRONG) || '0', 10) + wrong;
    const currentBestStreak = parseInt(localStorage.getItem(STORAGE_KEYS.HIGHEST_STREAK) || '0', 10);
    const bestStreak = Math.max(currentBestStreak, streak);

    localStorage.setItem(STORAGE_KEYS.TOTAL_GAMES, totalGames.toString());
    localStorage.setItem(STORAGE_KEYS.TOTAL_CORRECT, totalCorrect.toString());
    localStorage.setItem(STORAGE_KEYS.TOTAL_WRONG, totalWrong.toString());
    localStorage.setItem(STORAGE_KEYS.HIGHEST_STREAK, bestStreak.toString());

    // Unlock Speed rush if reached score 40 or streak 8
    if (score >= 40 || streak >= 8) {
      localStorage.setItem(STORAGE_KEYS.SPEED_RUSH_UNLOCKED, 'true');
    }

    const isNewHigh = this.setHighScore(mode, score);
    return { isNewHigh, bestStreak };
  }

  isSpeedRushUnlocked() {
    return localStorage.getItem(STORAGE_KEYS.SPEED_RUSH_UNLOCKED) === 'true';
  }

  getSettings() {
    return {
      soundEnabled: localStorage.getItem(STORAGE_KEYS.SOUND_ENABLED) !== 'false',
      musicEnabled: localStorage.getItem(STORAGE_KEYS.MUSIC_ENABLED) !== 'false',
      vibrationEnabled: localStorage.getItem(STORAGE_KEYS.VIBRATION_ENABLED) !== 'false',
      adFreePurchased: localStorage.getItem(STORAGE_KEYS.AD_FREE) === 'true'
    };
  }

  saveSettings({ soundEnabled, musicEnabled, vibrationEnabled, adFreePurchased }) {
    if (soundEnabled !== undefined) {
      localStorage.setItem(STORAGE_KEYS.SOUND_ENABLED, soundEnabled ? 'true' : 'false');
    }
    if (musicEnabled !== undefined) {
      localStorage.setItem(STORAGE_KEYS.MUSIC_ENABLED, musicEnabled ? 'true' : 'false');
    }
    if (vibrationEnabled !== undefined) {
      localStorage.setItem(STORAGE_KEYS.VIBRATION_ENABLED, vibrationEnabled ? 'true' : 'false');
    }
    if (adFreePurchased !== undefined) {
      localStorage.setItem(STORAGE_KEYS.AD_FREE, adFreePurchased ? 'true' : 'false');
    }
  }

  resetAll() {
    localStorage.clear();
    this.initDefaults();
  }
}

export const storageManager = new StorageManager();
