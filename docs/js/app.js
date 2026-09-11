// Main UI Controller and Application Lifecycle for Color Match ⭐

import { GameEngine, GAME_MODES } from './game.js';
import { soundManager } from './audio.js';
import { storageManager } from './storage.js';
import { particleEngine } from './particles.js';
import { adManager } from './ads.js';

class AppController {
  constructor() {
    this.game = null;
    this.currentMode = GAME_MODES.TIME_ATTACK;

    // DOM Screen Elements
    this.splashScreen = document.getElementById('screen-splash');
    this.menuScreen = document.getElementById('screen-menu');
    this.gameScreen = document.getElementById('screen-game');
    this.resultScreen = document.getElementById('screen-result');

    // Modals
    this.modeModal = document.getElementById('modal-mode-select');
    this.highScoreModal = document.getElementById('modal-high-scores');
    this.statsModal = document.getElementById('modal-stats');
    this.settingsModal = document.getElementById('modal-settings');

    // In-game HUD
    this.hudScore = document.getElementById('hud-score');
    this.hudTimer = document.getElementById('hud-timer');
    this.hudTimerContainer = document.getElementById('hud-timer-container');
    this.hudLivesContainer = document.getElementById('hud-lives-container');
    this.hudLives = document.getElementById('hud-lives');
    this.hudStreakBadge = document.getElementById('hud-streak-badge');
    this.hudStreakText = document.getElementById('hud-streak-text');
    this.roundProgressBar = document.getElementById('round-timer-progress');

    // Word display & buttons
    this.wordCard = document.getElementById('word-card');
    this.wordElement = document.getElementById('target-word');
    this.buttonsGrid = document.getElementById('buttons-grid');

    // Result Screen Elements
    this.resScore = document.getElementById('res-score');
    this.resBest = document.getElementById('res-best');
    this.resNewRecord = document.getElementById('res-new-record');
    this.resAccuracy = document.getElementById('res-accuracy');
    this.resMaxStreak = document.getElementById('res-max-streak');
    this.resModeLabel = document.getElementById('res-mode-label');

    // Rewarded action buttons
    this.btnRewardLife = document.getElementById('btn-reward-life');
    this.btnRewardTime = document.getElementById('btn-reward-time');
    this.btnRewardDouble = document.getElementById('btn-reward-double');

    // Floating toast / banner
    this.toastEl = document.getElementById('game-toast');
    this.streakBannerEl = document.getElementById('streak-banner');

    this.init();
  }

  init() {
    // Setup canvas particle engine
    const canvas = document.getElementById('particle-canvas');
    if (canvas) particleEngine.init(canvas);

    // Load initial settings
    const settings = storageManager.getSettings();
    soundManager.setSoundEnabled(settings.soundEnabled);
    soundManager.setMusicEnabled(settings.musicEnabled);

    // Initialize ads
    adManager.init();

    // Create game engine with UI callbacks
    this.game = new GameEngine({
      onGameStart: data => this.handleGameStart(data),
      onNewRound: round => this.renderRound(round),
      onScoreUpdate: data => this.updateScoreHud(data),
      onTimerTick: (time, isUrgent) => this.updateTimerHud(time, isUrgent),
      onRoundTimerUpdate: progress => this.updateRoundTimerBar(progress),
      onLivesUpdate: lives => this.updateLivesHud(lives),
      showShake: () => this.shakeWordCard(),
      showBonusToast: text => this.showToast(text),
      showStreakBanner: (streak, bonus) => this.showStreakBanner(streak, bonus),
      onGameOver: data => this.handleGameOver(data)
    });

    this.bindEvents();
    this.runSplashScreen();
  }

  runSplashScreen() {
    setTimeout(() => {
      this.splashScreen.classList.add('fade-out');
      setTimeout(() => {
        this.splashScreen.classList.add('hidden');
        this.menuScreen.classList.remove('hidden');
      }, 500);
    }, 1400);
  }

  bindEvents() {
    // Global touch / click unlocks AudioContext
    window.addEventListener('pointerdown', () => soundManager.init(), { once: true });

    // Menu Buttons
    document.getElementById('btn-play-menu')?.addEventListener('click', () => {
      soundManager.playTap();
      this.openModeSelect();
    });

    document.getElementById('btn-high-scores')?.addEventListener('click', () => {
      soundManager.playTap();
      this.openHighScores();
    });

    document.getElementById('btn-stats')?.addEventListener('click', () => {
      soundManager.playTap();
      this.openStats();
    });

    document.getElementById('btn-settings')?.addEventListener('click', () => {
      soundManager.playTap();
      this.openSettings();
    });

    // Modal Close Buttons
    document.querySelectorAll('.btn-close-modal').forEach(btn => {
      btn.addEventListener('click', () => {
        soundManager.playTap();
        this.closeAllModals();
      });
    });

    // Mode Selection Buttons
    document.getElementById('btn-mode-time')?.addEventListener('click', () => {
      soundManager.playTap();
      this.closeAllModals();
      this.startGame(GAME_MODES.TIME_ATTACK);
    });

    document.getElementById('btn-mode-lives')?.addEventListener('click', () => {
      soundManager.playTap();
      this.closeAllModals();
      this.startGame(GAME_MODES.LIVES_MODE);
    });

    const speedBtn = document.getElementById('btn-mode-speed');
    speedBtn?.addEventListener('click', () => {
      soundManager.playTap();
      if (!storageManager.isSpeedRushUnlocked()) {
        this.showToast('🔒 Reach score 40 or streak 8 to unlock Speed Rush!');
        return;
      }
      this.closeAllModals();
      this.startGame(GAME_MODES.SPEED_RUSH);
    });

    // In-game Exit button
    document.getElementById('btn-game-exit')?.addEventListener('click', () => {
      soundManager.playTap();
      if (confirm('Exit to main menu?')) {
        this.game.stopMainTimer();
        this.game.stopRoundTimer();
        this.game.state = 'IDLE';
        this.showScreen('menu');
      }
    });

    // Result Buttons
    document.getElementById('btn-play-again')?.addEventListener('click', () => {
      soundManager.playTap();
      this.startGame(this.currentMode);
    });

    document.getElementById('btn-result-menu')?.addEventListener('click', () => {
      soundManager.playTap();
      this.showScreen('menu');
    });

    document.getElementById('btn-share-score')?.addEventListener('click', () => {
      soundManager.playTap();
      this.shareScore();
    });

    // Rewarded Ad triggers
    this.btnRewardLife?.addEventListener('click', () => {
      soundManager.playTap();
      adManager.showRewardedAd('extraLife', () => {
        this.game.grantExtraLife();
        this.showScreen('game');
        this.showToast('❤️ +1 Extra Life Granted!');
      });
    });

    this.btnRewardTime?.addEventListener('click', () => {
      soundManager.playTap();
      adManager.showRewardedAd('extraTime', () => {
        this.game.grantExtraTime();
        this.showScreen('game');
        this.showToast('⏱️ +15 Seconds Added!');
      });
    });

    this.btnRewardDouble?.addEventListener('click', () => {
      soundManager.playTap();
      adManager.showRewardedAd('doubleScore', () => {
        this.game.doubleScore();
        this.resScore.textContent = this.game.score;
        this.btnRewardDouble.classList.add('hidden');
        this.showToast('⭐ Score Doubled!');
      });
    });

    // Settings Toggles
    this.bindSettingsToggles();
  }

  bindSettingsToggles() {
    const soundToggle = document.getElementById('toggle-sound');
    const musicToggle = document.getElementById('toggle-music');
    const vibrationToggle = document.getElementById('toggle-vibration');

    const s = storageManager.getSettings();
    if (soundToggle) soundToggle.checked = s.soundEnabled;
    if (musicToggle) musicToggle.checked = s.musicEnabled;
    if (vibrationToggle) vibrationToggle.checked = s.vibrationEnabled;

    soundToggle?.addEventListener('change', e => {
      storageManager.saveSettings({ soundEnabled: e.target.checked });
      soundManager.setSoundEnabled(e.target.checked);
      if (e.target.checked) soundManager.playTap();
    });

    musicToggle?.addEventListener('change', e => {
      storageManager.saveSettings({ musicEnabled: e.target.checked });
      soundManager.setMusicEnabled(e.target.checked);
    });

    vibrationToggle?.addEventListener('change', e => {
      storageManager.saveSettings({ vibrationEnabled: e.target.checked });
      if (e.target.checked && navigator.vibrate) navigator.vibrate(30);
    });

    document.getElementById('btn-reset-stats')?.addEventListener('click', () => {
      if (confirm('Are you sure you want to reset all high scores & stats?')) {
        storageManager.resetAll();
        this.showToast('All stats have been reset!');
        this.closeAllModals();
      }
    });
  }

  showScreen(name) {
    this.menuScreen.classList.add('hidden');
    this.gameScreen.classList.add('hidden');
    this.resultScreen.classList.add('hidden');

    if (name === 'menu') {
      this.menuScreen.classList.remove('hidden');
    } else if (name === 'game') {
      this.gameScreen.classList.remove('hidden');
    } else if (name === 'result') {
      this.resultScreen.classList.remove('hidden');
    }
  }

  closeAllModals() {
    document.querySelectorAll('.modal-overlay').forEach(m => m.classList.add('hidden'));
  }

  openModeSelect() {
    const isUnlocked = storageManager.isSpeedRushUnlocked();
    const speedLockBadge = document.getElementById('speed-lock-badge');
    const speedBtn = document.getElementById('btn-mode-speed');

    if (speedLockBadge && speedBtn) {
      if (isUnlocked) {
        speedLockBadge.classList.add('hidden');
        speedBtn.classList.remove('btn-locked');
      } else {
        speedLockBadge.classList.remove('hidden');
        speedBtn.classList.add('btn-locked');
      }
    }

    this.modeModal.classList.remove('hidden');
  }

  openHighScores() {
    document.getElementById('hs-time').textContent = storageManager.getHighScore(GAME_MODES.TIME_ATTACK);
    document.getElementById('hs-lives').textContent = storageManager.getHighScore(GAME_MODES.LIVES_MODE);
    document.getElementById('hs-speed').textContent = storageManager.getHighScore(GAME_MODES.SPEED_RUSH);
    this.highScoreModal.classList.remove('hidden');
  }

  openStats() {
    const stats = storageManager.getStats();
    document.getElementById('st-games').textContent = stats.totalGames;
    document.getElementById('st-correct').textContent = stats.totalCorrect;
    document.getElementById('st-accuracy').textContent = `${stats.accuracy}%`;
    document.getElementById('st-streak').textContent = stats.bestStreak;
    this.statsModal.classList.remove('hidden');
  }

  openSettings() {
    this.settingsModal.classList.remove('hidden');
  }

  startGame(mode) {
    this.currentMode = mode;
    this.showScreen('game');
    this.game.start(mode);
  }

  handleGameStart({ mode, lives, time, score, streak }) {
    this.hudScore.textContent = score;
    this.hudStreakBadge.classList.add('hidden');

    if (mode === GAME_MODES.LIVES_MODE) {
      this.hudTimerContainer.classList.add('hidden');
      this.hudLivesContainer.classList.remove('hidden');
      this.updateLivesHud(lives);
    } else {
      this.hudLivesContainer.classList.add('hidden');
      this.hudTimerContainer.classList.remove('hidden');
      this.updateTimerHud(time, false);
      this.roundProgressBar.style.width = '0%';
    }
  }

  renderRound(round) {
    if (!this.wordElement || !this.buttonsGrid) return;

    // Display the Stroop word with font color
    this.wordElement.textContent = round.wordText;
    this.wordElement.style.color = round.fontColor.hex;

    // Pop animation on word
    this.wordCard.classList.remove('pop-anim');
    void this.wordCard.offsetWidth; // trigger reflow
    this.wordCard.classList.add('pop-anim');

    // Render Answer Buttons
    this.buttonsGrid.innerHTML = '';
    const isSixButtons = round.options.length === 6;
    this.buttonsGrid.className = isSixButtons ? 'buttons-grid grid-6' : 'buttons-grid grid-4';

    round.options.forEach(colorObj => {
      const btn = document.createElement('button');
      btn.className = 'color-btn';
      btn.style.backgroundColor = colorObj.hex;
      btn.style.color = colorObj.textColor;

      btn.innerHTML = `
        <span class="btn-color-dot" style="background-color: ${colorObj.hex}"></span>
        <span class="btn-color-name">${colorObj.name}</span>
      `;

      btn.addEventListener('click', e => {
        btn.classList.add('btn-pressed');
        this.game.handleAnswer(colorObj.id, e);
      });

      this.buttonsGrid.appendChild(btn);
    });
  }

  updateScoreHud({ score, streak }) {
    this.hudScore.textContent = score;

    if (streak >= 2) {
      this.hudStreakBadge.classList.remove('hidden');
      this.hudStreakText.textContent = `🔥 x${streak}`;
    } else {
      this.hudStreakBadge.classList.add('hidden');
    }
  }

  updateTimerHud(time, isUrgent) {
    const mins = Math.floor(time / 60);
    const secs = time % 60;
    const formatted = `${mins}:${secs < 10 ? '0' : ''}${secs}`;
    this.hudTimer.textContent = formatted;

    if (isUrgent) {
      this.hudTimer.classList.add('timer-urgent');
    } else {
      this.hudTimer.classList.remove('timer-urgent');
    }
  }

  updateRoundTimerBar(progress) {
    if (this.roundProgressBar) {
      this.roundProgressBar.style.width = `${Math.round(progress * 100)}%`;
      if (progress < 0.25) {
        this.roundProgressBar.style.backgroundColor = '#FF4444';
      } else if (progress < 0.5) {
        this.roundProgressBar.style.backgroundColor = '#FF8844';
      } else {
        this.roundProgressBar.style.backgroundColor = '#44CC44';
      }
    }
  }

  updateLivesHud(lives) {
    const hearts = ['🖤 🖤 🖤', '❤️ 🖤 🖤', '❤️ ❤️ 🖤', '❤️ ❤️ ❤️'];
    this.hudLives.textContent = hearts[Math.max(0, Math.min(3, lives))];
  }

  shakeWordCard() {
    this.wordCard.classList.remove('shake-anim');
    void this.wordCard.offsetWidth;
    this.wordCard.classList.add('shake-anim');
  }

  showToast(text) {
    if (!this.toastEl) return;
    this.toastEl.textContent = text;
    this.toastEl.classList.remove('hidden');
    this.toastEl.classList.add('show');

    setTimeout(() => {
      this.toastEl.classList.remove('show');
      setTimeout(() => this.toastEl.classList.add('hidden'), 300);
    }, 1800);
  }

  showStreakBanner(streak, bonus) {
    if (!this.streakBannerEl) return;
    this.streakBannerEl.innerHTML = `
      <div class="streak-banner-content">
        <span class="streak-title">STREAK x${streak}! 🔥</span>
        <span class="streak-bonus">+${bonus} BONUS PTS</span>
      </div>
    `;
    this.streakBannerEl.classList.remove('hidden');
    this.streakBannerEl.classList.add('pop-banner');

    setTimeout(() => {
      this.streakBannerEl.classList.remove('pop-banner');
      setTimeout(() => this.streakBannerEl.classList.add('hidden'), 300);
    }, 1200);
  }

  handleGameOver(data) {
    this.showScreen('result');

    this.resScore.textContent = data.score;
    this.resBest.textContent = data.bestScore;
    this.resMaxStreak.textContent = data.maxStreak;

    const total = data.correct + data.wrong;
    const acc = total > 0 ? Math.round((data.correct / total) * 100) : 0;
    this.resAccuracy.textContent = `${acc}%`;

    let modeTitle = 'Time Attack';
    if (data.mode === GAME_MODES.LIVES_MODE) modeTitle = 'Lives Mode';
    else if (data.mode === GAME_MODES.SPEED_RUSH) modeTitle = 'Speed Rush';
    this.resModeLabel.textContent = modeTitle;

    if (data.isNewRecord) {
      this.resNewRecord.classList.remove('hidden');
    } else {
      this.resNewRecord.classList.add('hidden');
    }

    // Configure Rewarded Video options
    this.btnRewardDouble?.classList.remove('hidden');

    if (data.mode === GAME_MODES.LIVES_MODE) {
      this.btnRewardLife?.classList.remove('hidden');
      this.btnRewardTime?.classList.add('hidden');
    } else {
      this.btnRewardLife?.classList.add('hidden');
      this.btnRewardTime?.classList.remove('hidden');
    }
  }

  shareScore() {
    const score = this.game.score;
    const mode = this.resModeLabel.textContent;
    const text = `🎨 I just scored ${score} in Color Match ⭐ (${mode})! Can you beat my score? 🧠 Download & Play now!`;

    if (navigator.share) {
      navigator.share({
        title: 'Color Match ⭐ - Brain Puzzle',
        text: text,
        url: window.location.href
      }).catch(() => {});
    } else if (navigator.clipboard) {
      navigator.clipboard.writeText(text).then(() => {
        this.showToast('📋 Score copied to clipboard!');
      });
    } else {
      alert(text);
    }
  }
}

// Bootstrap application on DOM ready
document.addEventListener('DOMContentLoaded', () => {
  new AppController();
});
