// Automated unit test for Color Match logic
async function runTests() {
  const { BASE_COLORS, CLOSE_SHADES, generateStroopRound } = await import('./src/js/colors.js');

  console.log('Testing Color Match logic...');
  console.log(`Base colors count: ${BASE_COLORS.length}`);
  console.log(`Close shades count: ${CLOSE_SHADES.length}`);

  // Test 50 rounds of Time Attack
  for (let i = 0; i < 50; i++) {
    const round = generateStroopRound({ mode: 'timeAttack', level: i + 1 });
    if (!round.wordText || !round.fontColor || !round.correctId) {
      throw new Error(`Invalid round generated at step ${i}`);
    }
    if (round.options.length !== 4) {
      throw new Error(`Expected 4 buttons in time attack, got ${round.options.length}`);
    }
    const hasCorrect = round.options.some(opt => opt.id === round.correctId);
    if (!hasCorrect) {
      throw new Error(`Target color ${round.correctId} not in options list!`);
    }
  }
  console.log('✅ 50 Time Attack rounds verified successfully.');

  // Test Lives Mode scaling
  const r1 = generateStroopRound({ mode: 'livesMode', level: 5 });
  if (r1.options.length !== 3) throw new Error(`Level 5 should have 3 buttons, got ${r1.options.length}`);

  const r2 = generateStroopRound({ mode: 'livesMode', level: 15 });
  if (r2.options.length !== 4) throw new Error(`Level 15 should have 4 buttons, got ${r2.options.length}`);

  const r3 = generateStroopRound({ mode: 'livesMode', level: 80 });
  if (r3.options.length !== 6) throw new Error(`Level 80 should have 6 buttons, got ${r3.options.length}`);
  console.log('✅ Lives Mode difficulty scaling verified successfully.');

  // Test Speed Rush
  const sr = generateStroopRound({ mode: 'speedRush', level: 1 });
  if (sr.options.length !== 6) throw new Error(`Speed Rush should have 6 buttons, got ${sr.options.length}`);
  console.log('✅ Speed Rush 6-button configuration verified successfully.');

  console.log('🎉 ALL GAME LOGIC TESTS PASSED!');
}

runTests().catch(err => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
