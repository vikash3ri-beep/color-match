/**
 * audio.js - Web Audio Procedural Sound Synthesizer & Haptics for Color Match Connect
 * Zero external assets, instant zero-latency playback.
 */

import { getPaletteColor } from './generator.js';

class SoundEngine {
  constructor() {
    this.ctx = null;
    this.soundEnabled = true;
    this.vibrationEnabled = true;
    this.lastStepSoundTime = 0;
  }

  init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  setSoundEnabled(enabled) {
    this.soundEnabled = !!enabled;
  }

  setVibrationEnabled(enabled) {
    this.vibrationEnabled = !!enabled;
  }

  vibrate(pattern = 15) {
    if (!this.vibrationEnabled) return;
    try {
      if (window.Capacitor?.Plugins?.Haptics) {
        window.Capacitor.Plugins.Haptics.impact({ style: 'LIGHT' });
      } else if (navigator.vibrate) {
        navigator.vibrate(pattern);
      }
    } catch (_) {}
  }

  playTap() {
    if (!this.soundEnabled) return;
    this.init();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(540, now);
    osc.frequency.exponentialRampToValueAtTime(220, now + 0.05);

    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.05);
    this.vibrate(8);
  }

  /**
   * Play soft organic tick when dragging pipe into adjacent cell
   */
  playCellStep(colorId) {
    if (!this.soundEnabled) return;
    const nowMs = performance.now();
    if (nowMs - this.lastStepSoundTime < 45) return; // throttle
    this.lastStepSoundTime = nowMs;

    this.init();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const color = getPaletteColor(colorId);
    const baseFreq = color ? color.note * 0.75 : 300;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(baseFreq, now);
    osc.frequency.exponentialRampToValueAtTime(baseFreq * 0.8, now + 0.04);

    gain.gain.setValueAtTime(0.08, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.04);
  }

  /**
   * Play rich resonant marimba/bell tone when two matching dots are connected
   */
  playColorConnect(colorId) {
    if (!this.soundEnabled) return;
    this.init();
    if (!this.ctx) return;

    const color = getPaletteColor(colorId);
    const freq = color ? color.note : 440;
    const now = this.ctx.currentTime;

    // Harmonic marimba synthesizer (Fundamental + overtone)
    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(freq, now);

    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(freq * 2, now);

    gain.gain.setValueAtTime(0.35, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(this.ctx.destination);

    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + 0.45);
    osc2.stop(now + 0.45);

    this.vibrate(30);
  }

  /**
   * Play soft swoosh/break sound when an overlapping line breaks an existing pipe
   */
  playPipeBreak() {
    if (!this.soundEnabled) return;
    this.init();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(320, now);
    osc.frequency.exponentialRampToValueAtTime(120, now + 0.08);

    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.08);
    this.vibrate(20);
  }

  /**
   * Play celebratory victory arpeggio + fanfare on level complete
   */
  playLevelComplete() {
    if (!this.soundEnabled) return;
    this.init();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    // Ascending celebratory fanfare: C5, E5, G5, C6
    const chord = [523.25, 659.25, 783.99, 1046.50];

    chord.forEach((freq, idx) => {
      const startTime = now + idx * 0.09;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, startTime);

      gain.gain.setValueAtTime(0, startTime);
      gain.gain.linearRampToValueAtTime(0.3, startTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.6);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(startTime);
      osc.stop(startTime + 0.6);
    });

    this.vibrate([40, 60, 40, 80]);
  }
}

export const soundEngine = new SoundEngine();
