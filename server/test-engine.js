const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const Team = require('./models/Team');
const Player = require('./models/Player');
const Match = require('./models/Match');
const Innings = require('./models/Innings');
const Delivery = require('./models/Delivery');
const {
  processBall,
  undoLastBall,
  selectNextBowler,
  changeActiveBatter
} = require('./services/scoringEngine');

async function runTests() {
  console.log('--- Starting SundayMatches Cricket Engine Test Suite ---');
  const mongod = await MongoMemoryServer.create();
  const uri = mongod.getUri();
  await mongoose.connect(uri);

  try {
    // 1. Setup Teams and Players
    const teamA = await Team.create({ name: 'Alpha Strikers', shortName: 'AS' });
    const teamB = await Team.create({ name: 'Beta Blasters', shortName: 'BB' });

    // Batters for Team A (Full XI)
    const pA = [];
    for (let i = 1; i <= 11; i++) {
      const p = await Player.create({
        name: `Batter A${i}`,
        playerId: `PA${i}`,
        team: teamA._id,
        role: i === 1 || i === 2 ? 'Batter' : i <= 6 ? 'Batter' : 'All-rounder'
      });
      pA.push(p);
    }
    const [b1, b2, b3, b4] = pA;

    // Bowlers and Keeper for Team B
    const wk = await Player.create({ name: 'Alex Keeper', playerId: 'WK1', team: teamB._id, role: 'Wicketkeeper' });
    const bw1 = await Player.create({ name: 'Jasprit Bumrah', playerId: 'BW1', team: teamB._id, role: 'Bowler' });
    const bw2 = await Player.create({ name: 'Mohammed Shami', playerId: 'BW2', team: teamB._id, role: 'Bowler' });

    // Create Match
    const match = await Match.create({
      title: 'Engine Test Match',
      venue: 'Sunday Stadium',
      format: 'T20',
      totalOvers: 20,
      ballsPerOver: 6,
      maxOversPerBowler: 4,
      ruleMode: 'STANDARD',
      teamA: teamA._id,
      teamB: teamB._id,
      playingXI_A: pA.map(p => p._id),
      playingXI_B: [wk._id, bw1._id, bw2._id],
      tossWinner: teamA._id,
      tossDecision: 'BAT',
      battingTeam: teamA._id,
      bowlingTeam: teamB._id,
      status: 'LIVE',
      currentInnings: 1,
      activeStrikerId: b1._id,
      activeNonStrikerId: b2._id,
      activeBowlerId: bw1._id,
      bowlerChangeRequired: false
    });

    const innings = await Innings.create({
      match: match._id,
      inningsNumber: 1,
      battingTeam: teamA._id,
      bowlingTeam: teamB._id,
      totalRuns: 0,
      wickets: 0,
      legalBalls: 0,
      totalDeliveries: 0,
      oversCompleted: 0,
      ballsInCurrentOver: 0,
      battingScorecard: [
        { player: b1._id, playerName: b1.name, runs: 0, balls: 0, fours: 0, sixes: 0, strikeRate: 0, isOut: false, battingOrder: 1 },
        { player: b2._id, playerName: b2.name, runs: 0, balls: 0, fours: 0, sixes: 0, strikeRate: 0, isOut: false, battingOrder: 2 }
      ],
      bowlingScorecard: [
        { player: bw1._id, playerName: bw1.name, overs: 0, legalBalls: 0, maidens: 0, runsConceded: 0, wickets: 0, economy: 0, noBalls: 0, wides: 0 }
      ],
      currentPartnership: { runs: 0, balls: 0, batter1: b1._id, batter2: b2._id }
    });

    // ----------------------------------------------------
    // TEST 1: Normal 0-ball
    // -> same striker, same non-striker, same bowler
    // ----------------------------------------------------
    console.log('\nTesting TEST 1: Normal 0-ball...');
    let res = await processBall({ matchId: match._id, runsBat: 0 });
    console.assert(res.match.activeStrikerId.toString() === b1._id.toString(), 'TEST 1 FAIL: Striker changed on 0 runs!');
    console.assert(res.match.activeNonStrikerId.toString() === b2._id.toString(), 'TEST 1 FAIL: Non-striker changed on 0 runs!');
    console.assert(res.match.activeBowlerId.toString() === bw1._id.toString(), 'TEST 1 FAIL: Bowler changed on 0 runs!');
    console.assert(res.innings.totalRuns === 0, 'TEST 1 FAIL: Total runs should be 0');
    console.assert(res.innings.legalBalls === 1, 'TEST 1 FAIL: Legal balls should be 1');
    console.log('✓ TEST 1 PASSED: 0-ball kept same striker, non-striker, and bowler.');

    // ----------------------------------------------------
    // TEST 2: 1 run
    // -> strike changes correctly
    // ----------------------------------------------------
    console.log('\nTesting TEST 2: 1 run...');
    res = await processBall({ matchId: match._id, runsBat: 1 });
    console.assert(res.match.activeStrikerId.toString() === b2._id.toString(), 'TEST 2 FAIL: Strike should have rotated to b2!');
    console.assert(res.match.activeNonStrikerId.toString() === b1._id.toString(), 'TEST 2 FAIL: Non-striker should be b1!');
    console.assert(res.innings.totalRuns === 1, 'TEST 2 FAIL: Total runs should be 1');
    console.assert(res.innings.legalBalls === 2, 'TEST 2 FAIL: Legal balls should be 2');
    console.log('✓ TEST 2 PASSED: 1 run rotated strike correctly.');

    // ----------------------------------------------------
    // TEST 3: 4 runs
    // -> strike remains according to cricket rules
    // ----------------------------------------------------
    console.log('\nTesting TEST 3: 4 runs...');
    res = await processBall({ matchId: match._id, runsBat: 4 });
    console.assert(res.match.activeStrikerId.toString() === b2._id.toString(), 'TEST 3 FAIL: Striker should remain b2 on 4 runs!');
    console.assert(res.match.activeNonStrikerId.toString() === b1._id.toString(), 'TEST 3 FAIL: Non-striker should remain b1 on 4 runs!');
    console.assert(res.innings.totalRuns === 5, 'TEST 3 FAIL: Total runs should be 5 (0+1+4)');
    console.assert(res.innings.legalBalls === 3, 'TEST 3 FAIL: Legal balls should be 3');
    console.log('✓ TEST 3 PASSED: 4 runs kept strike with striker.');

    // ----------------------------------------------------
    // TEST 4: Wide
    // -> legal ball count unchanged, bowler remains, score increases
    // ----------------------------------------------------
    console.log('\nTesting TEST 4: Wide ball...');
    res = await processBall({ matchId: match._id, extraType: 'WIDE', extraRuns: 1 });
    console.assert(res.innings.legalBalls === 3, `TEST 4 FAIL: Legal ball count changed on Wide! Expected 3, got ${res.innings.legalBalls}`);
    console.assert(res.innings.totalRuns === 6, `TEST 4 FAIL: Total runs should be 6, got ${res.innings.totalRuns}`);
    console.assert(res.match.activeBowlerId.toString() === bw1._id.toString(), 'TEST 4 FAIL: Bowler changed on wide!');
    console.assert(res.match.activeStrikerId.toString() === b2._id.toString(), 'TEST 4 FAIL: Striker changed on wide!');
    console.log('✓ TEST 4 PASSED: Wide ball preserved legal balls and bowler, incremented score.');

    // ----------------------------------------------------
    // TEST 5: No-ball (0 bat runs)
    // -> legal ball count unchanged, score increases, bowler remains
    // ----------------------------------------------------
    console.log('\nTesting TEST 5: No-ball...');
    res = await processBall({ matchId: match._id, extraType: 'NO_BALL', runsBat: 0 });
    console.assert(res.innings.legalBalls === 3, 'TEST 5 FAIL: Legal ball count changed on No-Ball!');
    console.assert(res.innings.totalRuns === 7, `TEST 5 FAIL: Total runs should be 7 (6+1 nb), got ${res.innings.totalRuns}`);
    console.assert(res.match.activeBowlerId.toString() === bw1._id.toString(), 'TEST 5 FAIL: Bowler changed on No-Ball!');
    console.assert(res.match.activeStrikerId.toString() === b2._id.toString(), 'TEST 5 FAIL: Striker changed on No-Ball 0 runs!');
    console.log('✓ TEST 5 PASSED: No-ball added extra run without consuming legal delivery.');

    // ----------------------------------------------------
    // TEST 6: No-ball + bat runs (e.g. 2 runs)
    // -> no-ball extra + bat runs, batter statistics correct
    // ----------------------------------------------------
    console.log('\nTesting TEST 6: No-ball + 2 bat runs...');
    const b2ScoreBefore = res.innings.battingScorecard.find(b => b.player.toString() === b2._id.toString()).runs;
    res = await processBall({ matchId: match._id, extraType: 'NO_BALL', runsBat: 2 });
    console.assert(res.innings.legalBalls === 3, 'TEST 6 FAIL: Legal ball count changed on No-Ball+2!');
    console.assert(res.innings.totalRuns === 10, `TEST 6 FAIL: Total runs should be 10 (7 + 1 nb + 2 bat), got ${res.innings.totalRuns}`);
    const b2ScoreAfter = res.innings.battingScorecard.find(b => b.player.toString() === b2._id.toString()).runs;
    console.assert(b2ScoreAfter === b2ScoreBefore + 2, `TEST 6 FAIL: Batter score should increase by 2 bat runs! Expected ${b2ScoreBefore + 2}, got ${b2ScoreAfter}`);
    console.log('✓ TEST 6 PASSED: No-ball + bat runs correctly credited both extras and batsman runs.');

    // ----------------------------------------------------
    // TEST 7: No-ball + Run Out
    // -> correct batter dismissed, no-ball remains illegal delivery
    // ----------------------------------------------------
    console.log('\nTesting TEST 7: No-ball + Run Out...');
    res = await processBall({
      matchId: match._id,
      extraType: 'NO_BALL',
      runsBat: 0,
      isWicket: true,
      wicketInfo: {
        dismissalType: 'RUN_OUT',
        dismissedPlayerId: b2._id.toString(),
        fielderId: wk._id.toString()
      },
      newBatterId: b3._id.toString()
    });
    console.assert(res.innings.legalBalls === 3, 'TEST 7 FAIL: Legal ball count changed on No-ball + Run Out!');
    console.assert(res.innings.wickets === 1, `TEST 7 FAIL: Wickets should be 1, got ${res.innings.wickets}`);
    console.assert(res.match.activeStrikerId.toString() === b3._id.toString(), 'TEST 7 FAIL: New batter b3 should now be active striker!');
    console.log('✓ TEST 7 PASSED: No-ball + Run Out dismissed batter, admitted new batter, ball remained illegal.');

    // ----------------------------------------------------
    // TEST 8: Normal Wicket (Bowled)
    // -> dismissed batter removed, new batter selected
    // ----------------------------------------------------
    console.log('\nTesting TEST 8: Normal Wicket (Bowled)...');
    res = await processBall({
      matchId: match._id,
      runsBat: 0,
      isWicket: true,
      wicketInfo: {
        dismissalType: 'BOWLED'
      },
      newBatterId: b4._id.toString()
    });
    console.assert(res.innings.legalBalls === 4, `TEST 8 FAIL: Legal balls should be 4, got ${res.innings.legalBalls}`);
    console.assert(res.innings.wickets === 2, `TEST 8 FAIL: Wickets should be 2, got ${res.innings.wickets}`);
    console.assert(res.match.activeStrikerId.toString() === b4._id.toString(), 'TEST 8 FAIL: New batter b4 should be active striker!');
    console.log('✓ TEST 8 PASSED: Bowled wicket removed dismissed batter, advanced legal ball count.');

    // ----------------------------------------------------
    // TEST 9: Stumping (Wicketkeeper involved)
    // -> wicketkeeper involved, wicket type STUMPED
    // ----------------------------------------------------
    console.log('\nTesting TEST 9: Stumping...');
    res = await processBall({
      matchId: match._id,
      runsBat: 0,
      isWicket: true,
      wicketInfo: {
        dismissalType: 'STUMPED',
        fielderId: wk._id.toString()
      }
    });
    console.assert(res.delivery.wicketInfo.dismissalType === 'STUMPED', 'TEST 9 FAIL: Dismissal type should be STUMPED');
    console.assert(res.delivery.wicketInfo.fielder.toString() === wk._id.toString(), 'TEST 9 FAIL: Keeper should be credited');
    console.assert(res.innings.legalBalls === 5, `TEST 9 FAIL: Legal balls should be 5, got ${res.innings.legalBalls}`);
    console.log('✓ TEST 9 PASSED: Stumping recorded with wicketkeeper.');

    // ----------------------------------------------------
    // TEST 10: Six legal balls -> Over completes
    // -> striker/non-striker rotated for next over
    // -> bowler cleared because new bowler is required
    // -> next delivery blocked until new bowler is selected
    // ----------------------------------------------------
    console.log('\nTesting TEST 10: Over Completion...');
    const strikerBeforeOverEnd = res.match.activeStrikerId.toString();
    const nonStrikerBeforeOverEnd = res.match.activeNonStrikerId.toString();

    res = await processBall({ matchId: match._id, runsBat: 0 }); // 6th legal delivery
    console.assert(res.isOverComplete === true, 'TEST 10 FAIL: Over should be complete after 6th legal ball!');
    console.assert(res.innings.oversCompleted === 1, `TEST 10 FAIL: Overs completed should be 1, got ${res.innings.oversCompleted}`);
    console.assert(res.innings.ballsInCurrentOver === 0, `TEST 10 FAIL: Balls in current over should reset to 0, got ${res.innings.ballsInCurrentOver}`);
    console.assert(res.match.bowlerChangeRequired === true, 'TEST 10 FAIL: bowlerChangeRequired should be true!');
    console.assert(res.match.activeBowlerId === null, 'TEST 10 FAIL: activeBowlerId should be null until new bowler is picked!');
    // Check end-of-over strike rotation:
    console.assert(res.match.activeStrikerId.toString() === nonStrikerBeforeOverEnd, 'TEST 10 FAIL: Strike should rotate to previous non-striker at end of over!');
    console.assert(res.match.activeNonStrikerId.toString() === strikerBeforeOverEnd, 'TEST 10 FAIL: Non-striker should become previous striker at end of over!');

    // Verify next delivery is BLOCKED until bowler is selected
    let blocked = false;
    try {
      await processBall({ matchId: match._id, runsBat: 0 });
    } catch (err) {
      blocked = true;
    }
    console.assert(blocked === true, 'TEST 10 FAIL: Next delivery was not blocked when bowler change was required!');

    // Select new bowler bw2
    await selectNextBowler(match._id, bw2._id);
    const updatedMatch = await Match.findById(match._id);
    console.assert(updatedMatch.activeBowlerId.toString() === bw2._id.toString(), 'TEST 10 FAIL: New bowler bw2 was not set!');
    console.assert(updatedMatch.bowlerChangeRequired === false, 'TEST 10 FAIL: bowlerChangeRequired was not cleared!');
    console.log('✓ TEST 10 PASSED: Over completed, strike rotated, bowler cleared & blocked until new bowler selected.');

    // ----------------------------------------------------
    // TEST 13: Undo Last Ball
    // -> complete previous state restored
    // ----------------------------------------------------
    console.log('\nTesting TEST 13: Undo Last Ball...');
    // Bowl a 4 with the new bowler
    res = await processBall({ matchId: match._id, runsBat: 4 });
    const scoreBeforeUndo = res.innings.totalRuns;
    const ballsBeforeUndo = res.innings.legalBalls;

    const undoRes = await undoLastBall(match._id, 'admin');
    console.assert(undoRes.success === true, 'TEST 13 FAIL: Undo failed!');
    console.assert(undoRes.innings.totalRuns === scoreBeforeUndo - 4, `TEST 13 FAIL: Score after undo mismatch! Expected ${scoreBeforeUndo - 4}, got ${undoRes.innings.totalRuns}`);
    console.assert(undoRes.innings.legalBalls === ballsBeforeUndo - 1, `TEST 13 FAIL: Legal balls after undo mismatch! Expected ${ballsBeforeUndo - 1}, got ${undoRes.innings.legalBalls}`);
    console.log('✓ TEST 13 PASSED: Full state perfectly restored upon Undo.');

    console.log('\n======================================================');
    console.log('  ALL SCORING ENGINE TESTS PASSED WITH 100% SUCCESS!  ');
    console.log('======================================================\n');
  } finally {
    await mongoose.disconnect();
    await mongod.stop();
  }
}

runTests().catch(err => {
  console.error('Test suite error:', err);
  process.exit(1);
});
