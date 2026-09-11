// AdMob Monetization Manager for Color Match ⭐
// Implements full GDD monetization rules:
// - Sticky Bottom Banner Ad (320x50)
// - Interstitial Ad (every 2nd game over, 90s cooldown cap, no ad on 1st game)
// - Rewarded Video Ad (optional +1 Life, +15s Time, or 2x Score)

class AdMobManager {
  constructor() {
    this.gamesFinished = 0;
    this.lastInterstitialTime = 0;
    this.INTERSTITIAL_COOLDOWN_MS = 90 * 1000; // 90 seconds frequency cap
    this.rewardedUsedInCurrentGame = {
      extraLife: 0, // max 2
      extraTime: 0, // max 1
      doubleScore: 0 // max 1
    };
    this.onRewardGrantedCallback = null;
  }

  init() {
    this.initBanner();
  }

  initBanner() {
    const bannerEl = document.getElementById('admob-banner');
    if (bannerEl) {
      bannerEl.innerHTML = `
        <div class="admob-banner-inner">
          <span class="admob-badge">Ad</span>
          <span class="admob-sponsor">AdMob by Google</span>
          <span class="admob-text">⚡ Train your brain daily! Play more games.</span>
        </div>
      `;
    }
  }

  resetGameSession() {
    this.rewardedUsedInCurrentGame = {
      extraLife: 0,
      extraTime: 0,
      doubleScore: 0
    };
  }

  /**
   * Called when a game finishes
   * Checks if interstitial should trigger based on GDD rules:
   * 1. Never on first game (gamesFinished > 1)
   * 2. Every 2nd game over (gamesFinished % 2 === 0)
   * 3. Frequency cap: at least 90s since last interstitial
   */
  checkAndShowInterstitial(onClosed) {
    this.gamesFinished++;
    const now = Date.now();

    // Check rules
    const isEverySecondGame = (this.gamesFinished >= 2 && this.gamesFinished % 2 === 0);
    const hasCooledDown = (now - this.lastInterstitialTime) >= this.INTERSTITIAL_COOLDOWN_MS;

    if (isEverySecondGame && hasCooledDown) {
      this.lastInterstitialTime = now;
      this.showInterstitialOverlay(onClosed);
    } else {
      if (onClosed) onClosed();
    }
  }

  showInterstitialOverlay(onClosed) {
    const overlay = document.getElementById('ad-interstitial-modal');
    const timerText = document.getElementById('ad-interstitial-timer');
    const closeBtn = document.getElementById('ad-interstitial-close');

    if (!overlay) {
      if (onClosed) onClosed();
      return;
    }

    overlay.classList.remove('hidden');
    let timeLeft = 5;
    closeBtn.disabled = true;
    closeBtn.classList.add('btn-disabled');
    timerText.textContent = `Reward / Skip in ${timeLeft}s...`;

    const countdown = setInterval(() => {
      timeLeft--;
      if (timeLeft > 0) {
        timerText.textContent = `Skip in ${timeLeft}s...`;
      } else {
        clearInterval(countdown);
        timerText.textContent = `Close ad to continue`;
        closeBtn.disabled = false;
        closeBtn.classList.remove('btn-disabled');
        closeBtn.textContent = '✕ Close Ad';
      }
    }, 1000);

    const handleClose = () => {
      clearInterval(countdown);
      overlay.classList.add('hidden');
      closeBtn.removeEventListener('click', handleClose);
      if (onClosed) onClosed();
    };

    closeBtn.addEventListener('click', handleClose);
  }

  /**
   * Show Rewarded Video Ad
   * @param {string} rewardType - 'extraLife' | 'extraTime' | 'doubleScore'
   * @param {Function} onRewardSuccess
   */
  showRewardedAd(rewardType, onRewardSuccess) {
    // Check limits
    if (rewardType === 'extraLife' && this.rewardedUsedInCurrentGame.extraLife >= 2) {
      alert('Maximum 2 extra lives per game reached!');
      return;
    }
    if (rewardType === 'extraTime' && this.rewardedUsedInCurrentGame.extraTime >= 1) {
      alert('Bonus time already used for this round!');
      return;
    }
    if (rewardType === 'doubleScore' && this.rewardedUsedInCurrentGame.doubleScore >= 1) {
      alert('Score already doubled!');
      return;
    }

    const overlay = document.getElementById('ad-rewarded-modal');
    const timerText = document.getElementById('ad-rewarded-timer');
    const rewardTitle = document.getElementById('ad-rewarded-title');
    const claimBtn = document.getElementById('ad-rewarded-claim');

    if (!overlay) return;

    overlay.classList.remove('hidden');
    claimBtn.disabled = true;
    claimBtn.classList.add('btn-disabled');
    claimBtn.textContent = 'Watching Video...';

    if (rewardType === 'extraLife') {
      rewardTitle.textContent = '❤️ Watching Ad for +1 Extra Life';
    } else if (rewardType === 'extraTime') {
      rewardTitle.textContent = '⏱️ Watching Ad for +15 Seconds';
    } else {
      rewardTitle.textContent = '⭐ Watching Ad for Double Score';
    }

    let timeLeft = 5;
    timerText.textContent = `Granting reward in ${timeLeft}s...`;

    const countdown = setInterval(() => {
      timeLeft--;
      if (timeLeft > 0) {
        timerText.textContent = `Granting reward in ${timeLeft}s...`;
      } else {
        clearInterval(countdown);
        timerText.textContent = `✅ Reward Unlocked!`;
        claimBtn.disabled = false;
        claimBtn.classList.remove('btn-disabled');
        claimBtn.textContent = '🎁 Claim Reward';
      }
    }, 1000);

    const handleClaim = () => {
      clearInterval(countdown);
      overlay.classList.add('hidden');
      claimBtn.removeEventListener('click', handleClaim);

      if (rewardType === 'extraLife') this.rewardedUsedInCurrentGame.extraLife++;
      if (rewardType === 'extraTime') this.rewardedUsedInCurrentGame.extraTime++;
      if (rewardType === 'doubleScore') this.rewardedUsedInCurrentGame.doubleScore++;

      if (onRewardSuccess) onRewardSuccess();
    };

    claimBtn.addEventListener('click', handleClaim);
  }
}

export const adManager = new AdMobManager();
