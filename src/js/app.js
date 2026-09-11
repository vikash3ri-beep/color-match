/**
 * app.js - Main Controller for Color Match Connect
 * Coordinates Game Engine, Canvas Renderer, Audio, Storage, and AdMob
 */

import { FlowGame } from './game.js';
import { CanvasBoard } from './canvas-board.js';
import { getLevelConfig, getCustomGridConfig } from './generator.js';
import { soundEngine } from './audio.js';
import { particleEngine } from './particles.js';
import { storageManager } from './storage.js';
import { adMobManager } from './ads.js';

class ColorMatchApp {
  constructor() {
    this.currentMode = 'campaign'; // 'campaign' | 'unlimited' | 'daily'
    this.currentLevelIndex = 1;
    this.currentGridSize = 5;

    this.game = null;
    this.board = null;

    // DOM Elements
    this.elements = {};
  }

  init() {
    this.bindDOMElements();
    this.initAudioAndParticles();
    this.initGameEngine();
    this.bindUIEvents();
    this.initSettings();
    this.updateHeaderStats();
    adMobManager.init();

    // Start with highest unlocked campaign level or level 1
    const maxUnlocked = storageManager.getMaxUnlockedLevel();
    this.loadCampaignLevel(maxUnlocked);
  }

  bindDOMElements() {
    this.elements = {
      // Header
      levelTitle: document.getElementById('level-title'),
      gridBadge: document.getElementById('grid-badge'),
      flowPercent: document.getElementById('flow-percent'),
      flowBar: document.getElementById('flow-progress-bar'),
      pipesStatus: document.getElementById('pipes-status'),
      timerDisplay: document.getElementById('timer-display'),
      movesDisplay: document.getElementById('moves-display'),
      soundToggleBtn: document.getElementById('sound-toggle-btn'),
      levelSelectBtn: document.getElementById('level-select-btn'),
      settingsBtn: document.getElementById('settings-btn'),

      // Canvas
      canvasContainer: document.getElementById('canvas-container'),
      gameCanvas: document.getElementById('game-canvas'),
      particlesCanvas: document.getElementById('particles-canvas'),

      // Action Buttons
      undoBtn: document.getElementById('undo-btn'),
      restartBtn: document.getElementById('restart-btn'),
      hintBtn: document.getElementById('hint-btn'),
      hintBadge: document.getElementById('hint-badge'),

      // Modals
      winModal: document.getElementById('win-modal'),
      winTitle: document.getElementById('win-title'),
      winMoves: document.getElementById('win-moves'),
      winTime: document.getElementById('win-time'),
      winStars: document.getElementById('win-stars-container'),
      winNextBtn: document.getElementById('win-next-btn'),
      winReplayBtn: document.getElementById('win-replay-btn'),
      winMenuBtn: document.getElementById('win-menu-btn'),

      // Level Select Modal
      levelSelectModal: document.getElementById('level-select-modal'),
      closeLevelSelectBtn: document.getElementById('close-level-select-btn'),
      levelGridTabs: document.querySelectorAll('.level-tab-btn'),
      levelListContainer: document.getElementById('level-list-container'),
      dailyChallengeCard: document.getElementById('daily-challenge-card'),

      // Settings Modal
      settingsModal: document.getElementById('settings-modal'),
      closeSettingsBtn: document.getElementById('close-settings-btn'),
      soundSettingCheckbox: document.getElementById('sound-setting-toggle'),
      vibrationSettingCheckbox: document.getElementById('vibration-setting-toggle'),
      resetProgressBtn: document.getElementById('reset-progress-btn')
    };
  }

  initAudioAndParticles() {
    if (this.elements.particlesCanvas) {
      particleEngine.init(this.elements.particlesCanvas);
    }
  }

  initGameEngine() {
    this.game = new FlowGame({
      onStateChange: (summary) => this.handleGameStateChange(summary),
      onColorConnected: (colorId) => {
        soundEngine.playColorConnect(colorId);
        this.board?.triggerConnectionRipple(colorId);
      },
      onColorDisconnected: () => {},
      onCellStep: (colorId) => {
        soundEngine.playCellStep(colorId);
      },
      onPipeBroken: () => {
        soundEngine.playPipeBreak();
      },
      onLevelComplete: (result) => this.handleLevelComplete(result)
    });

    if (this.elements.gameCanvas) {
      this.board = new CanvasBoard(this.elements.gameCanvas, this.game);
    }
  }

  loadCampaignLevel(levelIndex) {
    this.currentMode = 'campaign';
    this.currentLevelIndex = levelIndex;
    const config = getLevelConfig(levelIndex, 'campaign');
    this.game.loadLevel(config);
    this.board?.resize();
    this.updateHeaderStats();
    this.closeAllModals();
  }

  loadCustomLevel(size, levelNum = 1) {
    this.currentMode = 'unlimited';
    this.currentGridSize = size;
    this.currentLevelIndex = levelNum;
    const config = getCustomGridConfig(size, levelNum);
    this.game.loadLevel(config);
    this.board?.resize();
    this.updateHeaderStats();
    this.closeAllModals();
  }

  loadDailyChallenge() {
    this.currentMode = 'daily';
    const config = getLevelConfig(1, 'daily');
    this.game.loadLevel(config);
    this.board?.resize();
    this.updateHeaderStats();
    this.closeAllModals();
  }

  handleGameStateChange(summary) {
    if (this.elements.flowPercent) {
      this.elements.flowPercent.textContent = `${summary.fillPercent}%`;
    }
    if (this.elements.flowBar) {
      this.elements.flowBar.style.width = `${summary.fillPercent}%`;
    }
    if (this.elements.pipesStatus) {
      this.elements.pipesStatus.textContent = `${summary.connectedCount}/${summary.numColors}`;
    }
    if (this.elements.movesDisplay) {
      this.elements.movesDisplay.textContent = `${summary.moves}`;
    }
    if (this.elements.timerDisplay) {
      const mins = Math.floor(summary.time / 60);
      const secs = summary.time % 60;
      this.elements.timerDisplay.textContent = `${mins}:${secs < 10 ? '0' : ''}${secs}`;
    }
  }

  handleLevelComplete(result) {
    soundEngine.playLevelComplete();
    particleEngine.spawnConfetti();

    // Save record
    if (this.currentMode === 'campaign') {
      storageManager.saveLevelRecord(this.currentLevelIndex, {
        stars: result.stars,
        moves: result.moves,
        time: result.time
      });
    } else if (this.currentMode === 'daily') {
      storageManager.markDailyCompletedToday();
    }

    // Populate Win Modal
    if (this.elements.winMoves) this.elements.winMoves.textContent = `${result.moves}`;
    if (this.elements.winTime) {
      const mins = Math.floor(result.time / 60);
      const secs = result.time % 60;
      this.elements.winTime.textContent = `${mins}:${secs < 10 ? '0' : ''}${secs}`;
    }

    // Render Stars
    if (this.elements.winStars) {
      this.elements.winStars.innerHTML = '';
      for (let i = 1; i <= 3; i++) {
        const star = document.createElement('span');
        star.className = `star-icon ${i <= result.stars ? 'earned' : 'empty'}`;
        star.textContent = '★';
        star.style.animationDelay = `${(i - 1) * 0.2}s`;
        this.elements.winStars.appendChild(star);
      }
    }

    // Open modal with short delay for juice
    setTimeout(() => {
      this.elements.winModal?.classList.remove('hidden');
      // Check for Interstitial Ad
      adMobManager.checkAndShowInterstitial();
    }, 600);
  }

  updateHeaderStats() {
    const config = this.game.levelConfig;
    if (!config) return;

    if (this.elements.levelTitle) {
      this.elements.levelTitle.textContent = config.title;
    }
    if (this.elements.gridBadge) {
      this.elements.gridBadge.textContent = `${this.game.width}x${this.game.height}`;
    }

    // Update hints count
    const hints = storageManager.getHintTokens();
    if (this.elements.hintBadge) {
      this.elements.hintBadge.textContent = hints > 0 ? hints : '+Ad';
      this.elements.hintBadge.className = `badge ${hints > 0 ? 'badge-primary' : 'badge-reward'}`;
    }
  }

  bindUIEvents() {
    // Action Bar
    this.elements.undoBtn?.addEventListener('click', () => {
      soundEngine.playTap();
      this.game.undo();
    });

    this.elements.restartBtn?.addEventListener('click', () => {
      soundEngine.playTap();
      this.game.restart();
    });

    this.elements.hintBtn?.addEventListener('click', () => {
      soundEngine.playTap();
      const hints = storageManager.getHintTokens();
      if (hints > 0) {
        storageManager.consumeHintToken();
        const hintApplied = this.game.applyHint();
        if (hintApplied) {
          this.board?.triggerConnectionRipple(hintApplied.colorId);
        }
        this.updateHeaderStats();
      } else {
        // Watch Rewarded Video Ad for hint
        adMobManager.showRewardedVideo(
          () => {
            // Reward granted
            storageManager.addHintTokens(1);
            const hintApplied = this.game.applyHint();
            if (hintApplied) {
              this.board?.triggerConnectionRipple(hintApplied.colorId);
            }
            this.updateHeaderStats();
          }
        );
      }
    });

    // Sound toggle header button
    this.elements.soundToggleBtn?.addEventListener('click', () => {
      const current = storageManager.getSettings().sound;
      const updated = !current;
      storageManager.setSetting('sound', updated);
      soundEngine.setSoundEnabled(updated);
      this.updateSoundIcons(updated);
      soundEngine.playTap();
    });

    // Win Modal Buttons
    this.elements.winNextBtn?.addEventListener('click', () => {
      soundEngine.playTap();
      this.closeAllModals();
      if (this.currentMode === 'campaign') {
        this.loadCampaignLevel(this.currentLevelIndex + 1);
      } else if (this.currentMode === 'unlimited') {
        this.loadCustomLevel(this.currentGridSize, this.currentLevelIndex + 1);
      } else {
        this.loadCampaignLevel(storageManager.getMaxUnlockedLevel());
      }
    });

    this.elements.winReplayBtn?.addEventListener('click', () => {
      soundEngine.playTap();
      this.closeAllModals();
      this.game.restart();
    });

    this.elements.winMenuBtn?.addEventListener('click', () => {
      soundEngine.playTap();
      this.closeAllModals();
      this.openLevelSelect();
    });

    // Level Select Modal
    this.elements.levelSelectBtn?.addEventListener('click', () => {
      soundEngine.playTap();
      this.openLevelSelect();
    });

    this.elements.closeLevelSelectBtn?.addEventListener('click', () => {
      soundEngine.playTap();
      this.closeAllModals();
    });

    this.elements.levelGridTabs?.forEach(btn => {
      btn.addEventListener('click', (e) => {
        soundEngine.playTap();
        this.elements.levelGridTabs.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const size = parseInt(btn.dataset.size, 10);
        this.renderLevelList(size);
      });
    });

    this.elements.dailyChallengeCard?.addEventListener('click', () => {
      soundEngine.playTap();
      this.loadDailyChallenge();
    });

    // Settings Modal
    this.elements.settingsBtn?.addEventListener('click', () => {
      soundEngine.playTap();
      this.elements.settingsModal?.classList.remove('hidden');
    });

    this.elements.closeSettingsBtn?.addEventListener('click', () => {
      soundEngine.playTap();
      this.closeAllModals();
    });

    this.elements.soundSettingCheckbox?.addEventListener('change', (e) => {
      const enabled = e.target.checked;
      storageManager.setSetting('sound', enabled);
      soundEngine.setSoundEnabled(enabled);
      this.updateSoundIcons(enabled);
    });

    this.elements.vibrationSettingCheckbox?.addEventListener('change', (e) => {
      const enabled = e.target.checked;
      storageManager.setSetting('vibration', enabled);
      soundEngine.setVibrationEnabled(enabled);
    });

    this.elements.resetProgressBtn?.addEventListener('click', () => {
      if (confirm('Are you sure you want to reset all game progress?')) {
        localStorage.clear();
        storageManager.initDefaults();
        this.loadCampaignLevel(1);
      }
    });
  }

  initSettings() {
    const settings = storageManager.getSettings();
    soundEngine.setSoundEnabled(settings.sound);
    soundEngine.setVibrationEnabled(settings.vibration);

    if (this.elements.soundSettingCheckbox) {
      this.elements.soundSettingCheckbox.checked = settings.sound;
    }
    if (this.elements.vibrationSettingCheckbox) {
      this.elements.vibrationSettingCheckbox.checked = settings.vibration;
    }
    this.updateSoundIcons(settings.sound);
  }

  updateSoundIcons(enabled) {
    if (this.elements.soundToggleBtn) {
      this.elements.soundToggleBtn.textContent = enabled ? '🔊' : '🔇';
    }
  }

  openLevelSelect() {
    this.elements.levelSelectModal?.classList.remove('hidden');
    // Default to currently selected grid tab or 5x5
    const activeTab = document.querySelector('.level-tab-btn.active') || this.elements.levelGridTabs[1];
    const size = activeTab ? parseInt(activeTab.dataset.size, 10) : 5;
    this.renderLevelList(size);
  }

  renderLevelList(gridSize) {
    const container = this.elements.levelListContainer;
    if (!container) return;
    container.innerHTML = '';

    const maxUnlocked = storageManager.getMaxUnlockedLevel();
    const levelsCount = 50; // Show 50 levels per grid category

    // Determine level range for this grid size in campaign
    let startLevel = 1;
    if (gridSize === 4) startLevel = 1;
    else if (gridSize === 5) startLevel = 21;
    else if (gridSize === 6) startLevel = 51;
    else if (gridSize === 7) startLevel = 81;
    else if (gridSize === 8) startLevel = 121;
    else if (gridSize === 9) startLevel = 201;

    for (let i = 0; i < levelsCount; i++) {
      const levelNum = startLevel + i;
      const isUnlocked = (levelNum <= maxUnlocked);
      const record = storageManager.getLevelRecord(levelNum);

      const card = document.createElement('div');
      card.className = `level-card ${isUnlocked ? 'unlocked' : 'locked'}`;
      if (isUnlocked) {
        card.innerHTML = `
          <div class="level-card-num">${levelNum}</div>
          <div class="level-card-stars">
            ${'★'.repeat(record?.stars || 0)}${'☆'.repeat(3 - (record?.stars || 0))}
          </div>
        `;
        card.addEventListener('click', () => {
          soundEngine.playTap();
          this.loadCampaignLevel(levelNum);
        });
      } else {
        card.innerHTML = `
          <div class="level-card-lock">🔒</div>
          <div class="level-card-num">${levelNum}</div>
        `;
      }
      container.appendChild(card);
    }
  }

  closeAllModals() {
    document.querySelectorAll('.modal-backdrop').forEach(m => m.classList.add('hidden'));
  }
}

// Bootstrap when DOM is ready
window.addEventListener('DOMContentLoaded', () => {
  window.colorMatchApp = new ColorMatchApp();
  window.colorMatchApp.init();
});
