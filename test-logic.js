/**
 * Comprehensive test suite for Color Match Connect
 */

import { generateFlowLevel, getLevelConfig, getCustomGridConfig } from './src/js/generator.js';
import { FlowGame } from './src/js/game.js';

console.log('🧪 Starting Color Match Connect Test Suite...\n');

// 1. Test Procedural Generation
console.log('--- TEST 1: Procedural Generator (Multiple Sizes & Seeds) ---');
const testSizes = [
  { size: 4, colors: 3 },
  { size: 5, colors: 4 },
  { size: 6, colors: 5 },
  { size: 7, colors: 6 },
  { size: 8, colors: 7 },
  { size: 9, colors: 8 }
];

for (const { size, colors } of testSizes) {
  for (let s = 1; s <= 10; s++) {
    const level = generateFlowLevel({ width: size, height: size, numColors: colors, seed: s * 100 });
    if (level.pipes.length !== colors) {
      throw new Error(`Size ${size}x${size} expected ${colors} pipes, got ${level.pipes.length}`);
    }
    let totalLen = 0;
    level.pipes.forEach(p => {
      totalLen += p.length;
      if (p.length < 3) throw new Error(`Pipe too short: ${p.length}`);
      if (p.solutionPath.length !== p.length) throw new Error('Solution path length mismatch');
    });
    if (totalLen !== size * size) {
      throw new Error(`Size ${size}x${size} total coverage ${totalLen} != ${size * size}`);
    }
  }
  console.log(`✅ ${size}x${size} (${colors} colors): 10 random seeds 100% board fill verified`);
}

// 2. Test Deterministic Reproducibility
console.log('\n--- TEST 2: Deterministic Reproducibility ---');
const lvlA = generateFlowLevel({ width: 6, height: 6, numColors: 5, seed: 99999 });
const lvlB = generateFlowLevel({ width: 6, height: 6, numColors: 5, seed: 99999 });
if (JSON.stringify(lvlA.pipes) !== JSON.stringify(lvlB.pipes)) {
  throw new Error('Deterministic PRNG failed: same seed gave different levels!');
}
console.log('✅ Deterministic seed matching verified');

// 3. Test FlowGame Core Mechanics
console.log('\n--- TEST 3: FlowGame Mechanics & Win Condition ---');
let won = false;
let starsEarned = 0;
const game = new FlowGame({
  onLevelComplete: (res) => {
    won = true;
    starsEarned = res.stars;
  }
});

const cfg = getLevelConfig(5); // Level 5
game.loadLevel(cfg);

console.log(`Loaded Level 5: ${game.width}x${game.height} with ${game.numColors} colors`);

// Apply hints to solve each color
for (let c = 1; c <= game.numColors; c++) {
  const hint = game.applyHint();
  console.log(`  Color ${hint.colorId} solved via hint (length: ${hint.path.length})`);
}

if (!won) throw new Error('Level did not win after full hint solution!');
if (starsEarned !== 3) throw new Error(`Expected 3 stars for optimal hint solve, got ${starsEarned}`);
console.log(`✅ Win condition met with 100% board coverage and ${starsEarned} stars!`);

// 4. Test Undo Functionality
console.log('\n--- TEST 4: Undo and Restart ---');
game.loadLevel(getLevelConfig(1));
const ep = game.levelData.pipes[0].start;
game.startDraw(ep.r, ep.c);
game.continueDraw(ep.r + (ep.r === 0 ? 1 : -1), ep.c);
game.endDraw();

const pathBefore = game.playerPaths.get(1).length;
game.undo();
const pathAfter = game.playerPaths.get(1).length;
if (pathBefore <= pathAfter) {
  throw new Error(`Undo failed: length before ${pathBefore}, after ${pathAfter}`);
}
console.log('✅ Undo functionality verified');

console.log('\n🎉 ALL TESTS PASSED SUCCESSFULLY! 100% ACCURACY AND ROBUSTNESS VERIFIED.');
