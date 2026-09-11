/**
 * storage.js - LocalStorage data management for Color Match Connect
 * Persists campaign progression, star ratings, best moves/time, and settings
 */

const STORAGE_KEYS = {
  CAMPAIGN_PROGRESS: 'cmc_campaign_progress', // JSON: { [levelIndex]: { stars, moves, time } }
  MAX_UNLOCKED_LEVEL: 'cmc_max_unlocked_level',
  CUSTOM_PROGRESS: 'cmc_custom_progress',     // JSON: { [key]: { stars, moves, time } }
  DAILY_CHALLENGES: 'cmc_daily_completed',    // Array of date strings: ['2026-09-11']
  HINT_TOKENS: 'cmc_hint_tokens',
  SOUND_ENABLED: 'cmc_sound_enabled',
  VIBRATION_ENABLED: 'cmc_vibration_enabled',
  TOTAL_SOLVED: 'cmc_total_solved'
};

class StorageManager {
  constructor() {
    this.initDefaults();
  }

  initDefaults() {
    if (localStorage.getItem(STORAGE_KEYS.SOUND_ENABLED) === null) {
      localStorage.setItem(STORAGE_KEYS.SOUND_ENABLED, 'true');
    }
    if (localStorage.getItem(STORAGE_KEYS.VIBRATION_ENABLED) === null) {
      localStorage.setItem(STORAGE_KEYS.VIBRATION_ENABLED, 'true');
    }
    if (localStorage.getItem(STORAGE_KEYS.MAX_UNLOCKED_LEVEL) === null) {
      localStorage.setItem(STORAGE_KEYS.MAX_UNLOCKED_LEVEL, '1');
    }
    if (localStorage.getItem(STORAGE_KEYS.HINT_TOKENS) === null) {
      localStorage.setItem(STORAGE_KEYS.HINT_TOKENS, '3'); // Start with 3 free hints
    }
  }

  getMaxUnlockedLevel() {
    return parseInt(localStorage.getItem(STORAGE_KEYS.MAX_UNLOCKED_LEVEL) || '1', 10);
  }

  unlockNextLevel(completedLevel) {
    const currentMax = this.getMaxUnlockedLevel();
    if (completedLevel >= currentMax) {
      localStorage.setItem(STORAGE_KEYS.MAX_UNLOCKED_LEVEL, (completedLevel + 1).toString());
    }
  }

  getLevelRecord(levelIndex) {
    try {
      const data = JSON.parse(localStorage.getItem(STORAGE_KEYS.CAMPAIGN_PROGRESS) || '{}');
      return data[levelIndex] || null;
    } catch (_) {
      return null;
    }
  }

  saveLevelRecord(levelIndex, { stars = 3, moves = 0, time = 0 }) {
    try {
      const data = JSON.parse(localStorage.getItem(STORAGE_KEYS.CAMPAIGN_PROGRESS) || '{}');
      const existing = data[levelIndex];

      const record = {
        stars: Math.max(existing?.stars || 0, stars),
        moves: existing?.moves ? Math.min(existing.moves, moves) : moves,
        time: existing?.time ? Math.min(existing.time, time) : time,
        completedAt: Date.now()
      };

      data[levelIndex] = record;
      localStorage.setItem(STORAGE_KEYS.CAMPAIGN_PROGRESS, JSON.stringify(data));

      this.unlockNextLevel(levelIndex);

      const totalSolved = parseInt(localStorage.getItem(STORAGE_KEYS.TOTAL_SOLVED) || '0', 10);
      localStorage.setItem(STORAGE_KEYS.TOTAL_SOLVED, (totalSolved + 1).toString());

      return record;
    } catch (e) {
      console.error('Failed to save level record', e);
      return null;
    }
  }

  getDailyCompletedToday() {
    try {
      const todayStr = new Date().toISOString().split('T')[0];
      const completed = JSON.parse(localStorage.getItem(STORAGE_KEYS.DAILY_CHALLENGES) || '[]');
      return completed.includes(todayStr);
    } catch (_) {
      return false;
    }
  }

  markDailyCompletedToday() {
    try {
      const todayStr = new Date().toISOString().split('T')[0];
      const completed = JSON.parse(localStorage.getItem(STORAGE_KEYS.DAILY_CHALLENGES) || '[]');
      if (!completed.includes(todayStr)) {
        completed.push(todayStr);
        localStorage.setItem(STORAGE_KEYS.DAILY_CHALLENGES, JSON.stringify(completed));
      }
    } catch (_) {}
  }

  getHintTokens() {
    return parseInt(localStorage.getItem(STORAGE_KEYS.HINT_TOKENS) || '0', 10);
  }

  addHintTokens(count = 1) {
    const current = this.getHintTokens();
    const updated = current + count;
    localStorage.setItem(STORAGE_KEYS.HINT_TOKENS, updated.toString());
    return updated;
  }

  consumeHintToken() {
    const current = this.getHintTokens();
    if (current > 0) {
      localStorage.setItem(STORAGE_KEYS.HINT_TOKENS, (current - 1).toString());
      return true;
    }
    return false;
  }

  getSettings() {
    return {
      sound: localStorage.getItem(STORAGE_KEYS.SOUND_ENABLED) !== 'false',
      vibration: localStorage.getItem(STORAGE_KEYS.VIBRATION_ENABLED) !== 'false'
    };
  }

  setSetting(key, val) {
    if (key === 'sound') {
      localStorage.setItem(STORAGE_KEYS.SOUND_ENABLED, val ? 'true' : 'false');
    } else if (key === 'vibration') {
      localStorage.setItem(STORAGE_KEYS.VIBRATION_ENABLED, val ? 'true' : 'false');
    }
  }

  getTotalStars() {
    try {
      const data = JSON.parse(localStorage.getItem(STORAGE_KEYS.CAMPAIGN_PROGRESS) || '{}');
      let total = 0;
      for (const key in data) {
        total += data[key]?.stars || 0;
      }
      return total;
    } catch (_) {
      return 0;
    }
  }
}

export const storageManager = new StorageManager();
