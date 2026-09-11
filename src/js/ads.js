/**
 * ads.js - AdMob Monetization Architecture for Color Match Connect
 * - Sticky Bottom Banner Ad (320x50)
 * - Interstitial Ad (every 3rd completed level, with frequency cooldown)
 * - Rewarded Video Ad (Watch Ad for +1 Hint)
 */

class AdMobManager {
  constructor() {
    this.levelsCompletedCount = 0;
    this.lastInterstitialTime = 0;
    this.INTERSTITIAL_COOLDOWN_MS = 60 * 1000; // 60s cooldown
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
          <span class="admob-text">🧩 Train your mind with Flow Connect Puzzles!</span>
        </div>
      `;
    }
  }

  /**
   * Check whether to display interstitial on level completion
   */
  checkAndShowInterstitial(onClosed) {
    this.levelsCompletedCount++;
    const now = Date.now();

    // Show on every 3rd level after level 2, with 60s cooldown
    const isEveryThird = (this.levelsCompletedCount >= 3 && this.levelsCompletedCount % 3 === 0);
    const hasCooledDown = (now - this.lastInterstitialTime) >= this.INTERSTITIAL_COOLDOWN_MS;

    if (isEveryThird && hasCooledDown) {
      this.lastInterstitialTime = now;
      this.showInterstitialOverlay(onClosed);
    } else {
      if (typeof onClosed === 'function') onClosed();
    }
  }

  showInterstitialOverlay(onClosed) {
    const modal = document.getElementById('admob-interstitial-modal');
    if (!modal) {
      if (typeof onClosed === 'function') onClosed();
      return;
    }

    modal.classList.remove('hidden');
    let timeLeft = 3;
    const countdownEl = document.getElementById('interstitial-countdown');
    const closeBtn = document.getElementById('interstitial-close-btn');

    if (closeBtn) closeBtn.style.display = 'none';
    if (countdownEl) countdownEl.textContent = `Ad closing in ${timeLeft}s...`;

    const timer = setInterval(() => {
      timeLeft--;
      if (timeLeft > 0) {
        if (countdownEl) countdownEl.textContent = `Ad closing in ${timeLeft}s...`;
      } else {
        clearInterval(timer);
        if (countdownEl) countdownEl.textContent = 'Ad finished';
        if (closeBtn) {
          closeBtn.style.display = 'inline-flex';
          closeBtn.focus();
        }
      }
    }, 1000);

    const closeHandler = () => {
      clearInterval(timer);
      modal.classList.add('hidden');
      if (closeBtn) closeBtn.removeEventListener('click', closeHandler);
      if (typeof onClosed === 'function') onClosed();
    };

    if (closeBtn) closeBtn.addEventListener('click', closeHandler);
  }

  /**
   * Rewarded Video Ad for Hint
   */
  showRewardedVideo(onRewardGranted, onAdClosed) {
    const modal = document.getElementById('admob-rewarded-modal');
    if (!modal) {
      if (typeof onRewardGranted === 'function') onRewardGranted();
      if (typeof onAdClosed === 'function') onAdClosed();
      return;
    }

    modal.classList.remove('hidden');
    let timeLeft = 5;
    const countdownEl = document.getElementById('rewarded-countdown');
    const rewardNoticeEl = document.getElementById('rewarded-notice');
    const claimBtn = document.getElementById('rewarded-claim-btn');

    if (claimBtn) {
      claimBtn.disabled = true;
      claimBtn.textContent = `Reward unlocks in ${timeLeft}s...`;
    }
    if (countdownEl) countdownEl.textContent = `${timeLeft}s`;
    if (rewardNoticeEl) rewardNoticeEl.textContent = 'Watching ad for +1 Free Hint...';

    const timer = setInterval(() => {
      timeLeft--;
      if (timeLeft > 0) {
        if (countdownEl) countdownEl.textContent = `${timeLeft}s`;
        if (claimBtn) claimBtn.textContent = `Reward unlocks in ${timeLeft}s...`;
      } else {
        clearInterval(timer);
        if (countdownEl) countdownEl.textContent = '0s';
        if (rewardNoticeEl) rewardNoticeEl.textContent = '🎉 Reward Unlocked!';
        if (claimBtn) {
          claimBtn.disabled = false;
          claimBtn.textContent = 'Claim Free Hint';
          claimBtn.classList.add('pulse-anim');
        }
      }
    }, 1000);

    const claimHandler = () => {
      clearInterval(timer);
      modal.classList.add('hidden');
      if (claimBtn) {
        claimBtn.removeEventListener('click', claimHandler);
        claimBtn.classList.remove('pulse-anim');
      }
      if (typeof onRewardGranted === 'function') onRewardGranted();
      if (typeof onAdClosed === 'function') onAdClosed();
    };

    if (claimBtn) claimBtn.addEventListener('click', claimHandler);
  }
}

export const adMobManager = new AdMobManager();
