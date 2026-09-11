// Core Game Engine for Color Match ⭐
// Implements Time Attack, Lives Mode, and Speed Rush with Stroop Effect mechanics

import { generateStroopRound } from './colors.js';
import { soundManager } from './audio.js';
import { storageManager } from './storage.js';
import { particleEngine } from './particles.js';
import { adManager } from './ads.js';

export const GAME_MODES = {
  TIME_ATTACK: 'timeAttack',
  LIVES_MODE: 'livesMode',
  SPEED_RUSH: 'speedRush'
};

export class GameEngine {
  constructor(uiCallbacks) {
    this.ui = uiCallbacks;
    this.mode = GAME_MODES.TIME_ATTACK;
    this.state = 'IDLE'; // IDLE | PLAYING | PAUSED | GAMEOVER

    this.score = 0;
    this.streak = 0;
    this.maxStreak = 0;
    this.correctCount = 0;
    this.wrongCount = 0;
    this.level = 1;

    // Mode-specific variables
    this.timeRemaining = 60; // seconds
    this.timerInterval = null;
    this.lives = 3;

    // Round countdown for Lives Mode
    this.roundTimeRemaining = 3.0;
    this.roundTimerInterval = null;
    this.currentRound = null;
  }

  start(mode = GAME_MODES.TIME_ATTACK) {
    this.mode = mode;
    this.state = 'PLAYING';
    this.score = 0;
    this.streak = 0;
    this.maxStreak = 0;
    this.correctCount = 0;
    this.wrongCount = 0;
    this.level = 1;
    this.lives = 3;

    adManager.resetGameSession();

    if (this.mode === GAME_MODES.TIME_ATTACK) {
      this.timeRemaining = 60;
      this.startMainTimer();
    } else if (this.mode === GAME_MODES.SPEED_RUSH) {
      this.timeRemaining = 30;
      this.startMainTimer();
    } else if (this.mode === GAME_MODES.LIVES_MODE) {
      this.lives = 3;
    }

    this.ui.onGameStart({
      mode: this.mode,
      lives: this.lives,
      time: this.timeRemaining,
      score: this.score,
      streak: this.streak
    });

    this.nextRound();
  }

  startMainTimer() {
    this.stopMainTimer();
    this.timerInterval = setInterval(() => {
      if (this.state !== 'PLAYING') return;

      this.timeRemaining--;
      const isUrgent = this.timeRemaining <= 10;
      if (isUrgent && this.timeRemaining > 0) {
        soundManager.playTimerTick(true);
      }

      this.ui.onTimerTick(this.timeRemaining, isUrgent);

      if (this.timeRemaining <= 0) {
        this.stopMainTimer();
        this.gameOver('Time is up!');
      }
    }, 1000);
  }

  stopMainTimer() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }

  // Round timer for Lives Mode (difficulty scaling)
  startRoundTimer() {
    this.stopRoundTimer();
    if (this.mode !== GAME_MODES.LIVES_MODE) return;

    // Difficulty table based on GDD
    let limitSec = 3.0;
    if (this.level > 75) limitSec = 1.0;
    else if (this.level > 50) limitSec = 1.5;
    else if (this.level > 25) limitSec = 2.0;
    else if (this.level > 10) limitSec = 2.5;

    this.roundTimeRemaining = limitSec;
    const updateFreqMs = 50;
    const decrement = updateFreqMs / 1000;

    this.ui.onRoundTimerUpdate(1.0); // 100% full bar

    this.roundTimerInterval = setInterval(() => {
      if (this.state !== 'PLAYING') return;

      this.roundTimeRemaining -= decrement;
      const progress = Math.max(0, this.roundTimeRemaining / limitSec);
      this.ui.onRoundTimerUpdate(progress);

      if (this.roundTimeRemaining <= 0) {
        this.stopRoundTimer();
        this.handleTimeout();
      }
    }, updateFreqMs);
  }

  stopRoundTimer() {
    if (this.roundTimerInterval) {
      clearInterval(this.roundTimerInterval);
      this.roundTimerInterval = null;
    }
  }

  handleTimeout() {
    this.handleWrongAnswer(null, true);
  }

  nextRound() {
    if (this.state !== 'PLAYING') return;

    this.currentRound = generateStroopRound({
      mode: this.mode,
      level: this.level
    });

    this.ui.onNewRound(this.currentRound);
    this.startRoundTimer();
  }

  handleAnswer(selectedColorId, clickEvent) {
    if (this.state !== 'PLAYING') return;
    if (!this.currentRound) return;

    const isCorrect = (selectedColorId === this.currentRound.correctId);
    const clickX = clickEvent?.clientX || window.innerWidth / 2;
    const clickY = clickEvent?.clientY || window.innerHeight / 2;

    if (isCorrect) {
      this.handleCorrectAnswer(clickX, clickY);
    } else {
      this.handleWrongAnswer(clickEvent);
    }
  }

  handleCorrectAnswer(clickX, clickY) {
    this.correctCount++;
    this.streak++;
    this.level++;
    if (this.streak > this.maxStreak) {
      this.maxStreak = this.streak;
    }

    // Scoring math
    let pointsEarned = 10;
    let streakBonus = 0;

    if (this.streak >= 10) {
      streakBonus = 50;
    } else if (this.streak >= 5) {
      streakBonus = 15;
    } else if (this.streak >= 3) {
      streakBonus = 5;
    }

    pointsEarned += streakBonus;
    this.score += pointsEarned;

    // Sound & particles
    if (streakBonus > 0 && (this.streak === 3 || this.streak === 5 || this.streak === 10 || this.streak % 5 === 0)) {
      soundManager.playStreak(this.streak);
      particleEngine.spawnStreakBurst(clickX, clickY);
      this.ui.showStreakBanner(this.streak, streakBonus);
    } else {
      soundManager.playCorrect();
    }

    particleEngine.spawnTapBurst(clickX, clickY, this.currentRound.fontColor.hex);

    // Haptic tick
    this.vibrate(25);

    // Time Attack Bonus: Har 10 correct answer pe +3 sec bonus
    if (this.mode === GAME_MODES.TIME_ATTACK && this.correctCount % 10 === 0) {
      this.timeRemaining += 3;
      soundManager.playBonus();
      this.ui.showBonusToast('+3 SEC BONUS! ⏱️');
    }

    this.ui.onScoreUpdate({
      score: this.score,
      streak: this.streak,
      pointsEarned,
      isCorrect: true
    });

    this.nextRound();
  }

  handleWrongAnswer(clickEvent, isTimeout = false) {
    this.wrongCount++;
    this.streak = 0;

    soundManager.playWrong();
    this.vibrate([60, 40, 60]);

    if (this.mode === GAME_MODES.TIME_ATTACK) {
      // Time Attack: -5 points
      this.score = Math.max(0, this.score - 5);
      this.ui.showShake();
      this.ui.onScoreUpdate({
        score: this.score,
        streak: 0,
        pointsEarned: -5,
        isCorrect: false
      });
      this.nextRound();
    } else if (this.mode === GAME_MODES.LIVES_MODE) {
      // Lives Mode: lose a heart
      this.lives--;
      this.ui.showShake();
      this.ui.onLivesUpdate(this.lives);

      if (this.lives <= 0) {
        this.gameOver(isTimeout ? 'Time ran out!' : 'Out of lives!');
      } else {
        this.nextRound();
      }
    } else if (this.mode === GAME_MODES.SPEED_RUSH) {
      // Speed rush penalty: -5 pts
      this.score = Math.max(0, this.score - 5);
      this.ui.showShake();
      this.ui.onScoreUpdate({
        score: this.score,
        streak: 0,
        pointsEarned: -5,
        isCorrect: false
      });
      this.nextRound();
    }
  }

  // Grant extra life from rewarded ad
  grantExtraLife() {
    if (this.mode === GAME_MODES.LIVES_MODE) {
      this.lives = Math.min(3, this.lives + 1);
      this.ui.onLivesUpdate(this.lives);
      soundManager.playBonus();
      this.state = 'PLAYING';
      this.nextRound();
    }
  }

  // Grant extra time from rewarded ad
  grantExtraTime() {
    if (this.mode === GAME_MODES.TIME_ATTACK || this.mode === GAME_MODES.SPEED_RUSH) {
      this.timeRemaining += 15;
      soundManager.playBonus();
      this.state = 'PLAYING';
      this.startMainTimer();
      this.nextRound();
    }
  }

  // Double score from rewarded ad
  doubleScore() {
    this.score *= 2;
    soundManager.playBonus();
    particleEngine.spawnConfetti();
    storageManager.setHighScore(this.mode, this.score);
    this.ui.onScoreUpdate({
      score: this.score,
      streak: this.streak,
      pointsEarned: 0,
      isCorrect: true
    });
  }

  vibrate(pattern) {
    const settings = storageManager.getSettings();
    if (settings.vibrationEnabled && navigator.vibrate) {
      try {
        navigator.vibrate(pattern);
      } catch (e) {
        // ignore
      }
    }
  }

  gameOver(reason) {
    this.state = 'GAMEOVER';
    this.stopMainTimer();
    this.stopRoundTimer();
    soundManager.playGameOver();

    // Save statistics & check high score
    const { isNewHigh, bestStreak } = storageManager.recordGameStats({
      mode: this.mode,
      score: this.score,
      correct: this.correctCount,
      wrong: this.wrongCount,
      streak: this.maxStreak
    });

    if (isNewHigh) {
      particleEngine.spawnConfetti();
    }

    const currentBest = storageManager.getHighScore(this.mode);

    this.ui.onGameOver({
      score: this.score,
      bestScore: currentBest,
      isNewRecord: isNewHigh,
      correct: this.correctCount,
      wrong: this.wrongCount,
      maxStreak: this.maxStreak,
      mode: this.mode,
      reason
    });

    // Check interstitial ad rules (Every 2nd game over, 90s cooldown)
    setTimeout(() => {
      adManager.checkAndShowInterstitial();
    }, 1200);
  }
}
