# 🎨 COLOR FLOW (Pipe & Link Puzzle) — Android APK & Game Engine

[![Live Demo](https://img.shields.io/badge/Live_Game-Play_Now-00F0FF?style=for-the-badge&logo=google-chrome&logoColor=white)](https://vikash3ri-beep.github.io/color-match/)
[![GitHub Repo](https://img.shields.io/badge/GitHub-Repository-181717?style=for-the-badge&logo=github&logoColor=white)](https://github.com/vikash3ri-beep/color-match)

👉 **Play Live Now:** [https://vikash3ri-beep.github.io/color-match/](https://vikash3ri-beep.github.io/color-match/)

An addictive, ultra-smooth **Flow Free / Pipe Connect** logic puzzle game for Android & Web. Connect matching color dots by drawing continuous pipes across the grid without overlapping, and fill 100% of the board to complete each level!

---

## ✨ Key Features

1. **Unlimited Procedural Levels**:
   - Algorithmic Hamiltonian Backbite generator partitions grids into non-intersecting paths covering 100% of cells.
   - **Guaranteed Solvable**: Every level has an exact known mathematical solution.
   - **Campaign Progression (Levels 1–100+)**:
     - Level 1–20: 4x4 Grid (Starter)
     - Level 21–50: 5x5 Grid (Beginner)
     - Level 51–80: 6x6 Grid (Medium)
     - Level 81–120: 7x7 Grid (Hard)
     - Level 121–200: 8x8 Grid (Expert)
     - Level 201+: 9x9 Grid (Master) — Infinite!
   - **Daily Challenge Mode**: Fresh 7x7 puzzle seeded by the current date.
   - **Unlimited Grid Mode**: Choose any grid size (4x4 to 9x9) and play infinite levels.

2. **Ultra-Smooth 60 FPS Canvas & Touch Motion**:
   - Sub-pixel pointer tracking with anti-jitter cell snapping.
   - Rounded pipe joins with 3D cylindrical shine and glowing neon aura.
   - Natural dragging mechanics:
     - Retracts when dragging backwards.
     - Automatically truncates crossing pipes cleanly (Flow Free standard).
     - Pulsating endpoints and radial burst animations on connection.
   - Level completion celebration with physics-driven confetti explosion.

3. **Procedural Web Audio & Haptics**:
   - Harmonious musical scale synthesis: each connected color plays an ascending harmonic chime (C4, D4, E4, G4, A4, C5, D5, E5, etc.).
   - Fluid drag ticks, pipe break swoosh, and victory fanfare jingles.
   - Zero external audio files, zero network delay.
   - Haptic vibration feedback via `@capacitor/haptics` and `navigator.vibrate`.

4. **AdMob Monetization & Hint System**:
   - Sticky bottom Banner Ad (320x50).
   - Frequency-capped Interstitial Ads between levels.
   - Rewarded Video Ad: "Watch Ad for +1 Hint" — automatically solves one path using the ground-truth solution.

5. **Storage & Ratings**:
   - 3-star scoring system based on move efficiency.
   - Local persistence for completed levels, stars, best times, and moves.

---

## 🚀 How to Run and Test Locally

### 1. Instant Preview Server:
Open your terminal in `d:\projects\color-match`:
```bash
npm start
```
Then open your browser to:
👉 **http://localhost:3000**

You can also test touch interaction in Chrome DevTools using mobile device emulation (Pixel 7 or iPhone 14, 390x844).

### 2. Run Automated Verification Tests:
```bash
node test-logic.js
```

---

## 📦 How to Build the Android APK

### Option A: 100% Automated Free Cloud Build (GitHub Actions)
A turnkey GitHub Actions workflow is pre-configured in `.github/workflows/build-apk.yml`:
1. Push this project to your GitHub repository:
   ```bash
   git add .
   git commit -m "Update Color Match Connect game engine with unlimited levels"
   git push origin main
   ```
2. Go to your GitHub repository > **Actions** tab.
3. The **Build Color Match Connect APK** workflow will compile the APK in the cloud using Google's official Android SDK & Gradle.
4. Download the compiled `ColorMatchConnect-Debug-APK` directly from the workflow artifacts!

---

### Option B: Local Build via Android Studio & Capacitor
If you have Android Studio installed locally:
1. Open PowerShell in `d:\projects\color-match`:
   ```bash
   npx cap sync android
   npx cap open android
   ```
2. In Android Studio:
   - Click **Build** > **Build Bundle(s) / APK(s)** > **Build APK(s)**.
   - Your APK will be generated at:
     `android/app/build/outputs/apk/debug/app-debug.apk`

---

### Option C: Online 1-Click APK via PWABuilder
1. The game is already pre-configured as an offline PWA with Service Worker (`sw.js`) and high-res launcher icons.
2. Go to [https://www.pwabuilder.com](https://www.pwabuilder.com)
3. Enter your live URL: `https://vikash3ri-beep.github.io/color-match/`
4. Click **Package for Android (APK / TWA)** and download the ready-to-install signed APK!
