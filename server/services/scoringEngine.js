const Match = require('../models/Match');
const Innings = require('../models/Innings');
const Delivery = require('../models/Delivery');
const Player = require('../models/Player');
const Team = require('../models/Team');
const AuditLog = require('../models/AuditLog');

/**
 * SundayMatches Authoritative Scoring Engine
 * Single source of truth for all cricket rules, state mutations, and ball event records.
 */

// Generate realistic cricket commentary
function generateCommentary(bowlerName, strikerName, runsBat, extraType, extraRuns, isWicket, wicketInfo) {
  if (isWicket) {
    const wType = wicketInfo.dismissalType;
    if (wType === 'BOWLED') {
      return `${bowlerName} to ${strikerName}, OUT! Bowled! Timber strikes! Clean bowled through the gate!`;
    }
    if (wType === 'CAUGHT') {
      const fielderStr = wicketInfo.fielderName ? ` caught by ${wicketInfo.fielderName}` : '';
      return `${bowlerName} to ${strikerName}, OUT! Caught! Lofted in the air and${fielderStr}! Gone!`;
    }
    if (wType === 'LBW') {
      return `${bowlerName} to ${strikerName}, OUT! LBW! Trapped right in front of the middle stump. Umpire raises the finger!`;
    }
    if (wType === 'STUMPED') {
      const keeperStr = wicketInfo.fielderName ? ` by ${wicketInfo.fielderName}` : ' by the wicketkeeper';
      return `${bowlerName} to ${strikerName}, OUT! Stumped${keeperStr}! Stepped out, beaten in flight, bails whipped off in a flash!`;
    }
    if (wType === 'RUN_OUT') {
      const fielderStr = wicketInfo.fielderName ? ` with a brilliant throw from ${wicketInfo.fielderName}` : '';
      const dismissed = wicketInfo.dismissedPlayerName || strikerName;
      return `${bowlerName} to ${strikerName}, OUT! Run Out! ${dismissed} falls short of the crease${fielderStr}!`;
    }
    if (wType === 'HIT_WICKET') {
      return `${bowlerName} to ${strikerName}, OUT! Hit Wicket! Dislodges the bails while playing the shot!`;
    }
    if (wType === 'RETIRED_OUT') {
      return `${strikerName} retires out and walks back to the pavilion.`;
    }
    if (wType === 'RETIRED_HURT') {
      return `${strikerName} retires hurt and leaves the field for medical assessment.`;
    }
    return `${bowlerName} to ${strikerName}, OUT! (${wType})`;
  }

  if (extraType === 'WIDE') {
    if (extraRuns > 1) {
      return `${bowlerName} to ${strikerName}, Wide ball + ${extraRuns - 1} extras, straying well past the tramline!`;
    }
    return `${bowlerName} to ${strikerName}, Wide ball, fired down the leg side. Signaled wide.`;
  }

  if (extraType === 'NO_BALL') {
    if (runsBat > 0) {
      return `${bowlerName} to ${strikerName}, No ball + ${runsBat} run${runsBat > 1 ? 's' : ''}! Overstepping the front crease and punished! Free continue!`;
    }
    return `${bowlerName} to ${strikerName}, No ball! Front foot over the line. Free continue!`;
  }

  if (extraType === 'BYE') {
    return `${bowlerName} to ${strikerName}, ${extraRuns} Bye${extraRuns > 1 ? 's' : ''}. Misses the bat, batters scamper through!`;
  }

  if (extraType === 'LEG_BYE') {
    return `${bowlerName} to ${strikerName}, ${extraRuns} Leg Bye${extraRuns > 1 ? 's' : ''}. Deflected off the pads into the gap.`;
  }

  if (extraType === 'PENALTY') {
    return `Penalty: ${extraRuns} penalty runs awarded to the batting side!`;
  }

  // Normal legal bat runs
  switch (runsBat) {
    case 0:
      return `${bowlerName} to ${strikerName}, dot ball. Defended solidly onto the pitch. No run.`;
    case 1:
      return `${bowlerName} to ${strikerName}, 1 run. Pushed into the gap for a brisk single. Strike rotates.`;
    case 2:
      return `${bowlerName} to ${strikerName}, 2 runs. Clipped off the pads into deep midwicket, sharp running for a couple.`;
    case 3:
      return `${bowlerName} to ${strikerName}, 3 runs. Driven past the infield, good chasing saves a single. 3 runs taken.`;
    case 4:
      return `${bowlerName} to ${strikerName}, FOUR! Cracking shot through the covers, races away to the boundary!`;
    case 5:
      return `${bowlerName} to ${strikerName}, 5 runs! Overthrows after a quick single concede four bonus runs!`;
    case 6:
      return `${bowlerName} to ${strikerName}, SIX! Colossal hit! Launched high and handsome over long-on into the stands!`;
    default:
      return `${bowlerName} to ${strikerName}, ${runsBat} runs scored.`;
  }
}

// Generate delivery display badge
function generateDisplayBadge(runsBat, extraType, extraRuns, isWicket) {
  if (isWicket) {
    if (extraType === 'NO_BALL') return 'Nb+W';
    if (extraType === 'WIDE') return 'Wd+W';
    return runsBat > 0 ? `${runsBat}+W` : 'W';
  }
  if (extraType === 'WIDE') {
    return extraRuns > 1 ? `Wd+${extraRuns - 1}` : 'Wd';
  }
  if (extraType === 'NO_BALL') {
    return runsBat > 0 ? `Nb+${runsBat}` : 'Nb';
  }
  if (extraType === 'BYE') return `B${extraRuns}`;
  if (extraType === 'LEG_BYE') return `Lb${extraRuns}`;
  if (extraType === 'PENALTY') return `P${extraRuns}`;
  return `${runsBat}`;
}

/**
 * Record a delivery event atomically.
 */
async function processBall({
  matchId,
  runsBat = 0,
  extraType = 'NONE',
  extraRuns = 0,
  isWicket = false,
  wicketInfo = {},
  newBatterId = null,
  newStrikerBatterId = null,
  newNonStrikerBatterId = null
}) {
  const match = await Match.findById(matchId);
  if (!match) throw new Error('Match not found');

  if (match.status !== 'LIVE') {
    throw new Error(`Match is not live. Current status: ${match.status}`);
  }

  if (match.bowlerChangeRequired) {
    throw new Error('Over is completed. Please select the next bowler before bowling.');
  }

  if (!match.activeStrikerId || !match.activeNonStrikerId || !match.activeBowlerId) {
    throw new Error('Active striker, non-striker, and bowler must all be selected.');
  }

  if (match.activeStrikerId.toString() === match.activeNonStrikerId.toString()) {
    throw new Error('Striker and Non-Striker cannot be the same player.');
  }

  const innings = await Innings.findOne({
    match: matchId,
    inningsNumber: match.currentInnings
  });
  if (!innings) throw new Error('Current innings not found.');
  if (innings.isCompleted) throw new Error('Current innings is already completed.');

  // Fetch players for names & records
  const [striker, nonStriker, bowler] = await Promise.all([
    Player.findById(match.activeStrikerId),
    Player.findById(match.activeNonStrikerId),
    Player.findById(match.activeBowlerId)
  ]);

  if (!striker || !nonStriker || !bowler) {
    throw new Error('Could not find active player records.');
  }

  // Create snapshot before this ball for bulletproof Undo
  const stateSnapshotBefore = {
    match: {
      status: match.status,
      currentInnings: match.currentInnings,
      activeStrikerId: match.activeStrikerId ? match.activeStrikerId.toString() : null,
      activeNonStrikerId: match.activeNonStrikerId ? match.activeNonStrikerId.toString() : null,
      activeBowlerId: match.activeBowlerId ? match.activeBowlerId.toString() : null,
      previousBowlerId: match.previousBowlerId ? match.previousBowlerId.toString() : null,
      bowlerChangeRequired: match.bowlerChangeRequired,
      result: JSON.parse(JSON.stringify(match.result))
    },
    innings: {
      totalRuns: innings.totalRuns,
      wickets: innings.wickets,
      legalBalls: innings.legalBalls,
      totalDeliveries: innings.totalDeliveries,
      oversCompleted: innings.oversCompleted,
      ballsInCurrentOver: innings.ballsInCurrentOver,
      isCompleted: innings.isCompleted,
      extras: JSON.parse(JSON.stringify(innings.extras)),
      battingScorecard: JSON.parse(JSON.stringify(innings.battingScorecard)),
      bowlingScorecard: JSON.parse(JSON.stringify(innings.bowlingScorecard)),
      currentPartnership: JSON.parse(JSON.stringify(innings.currentPartnership)),
      fallOfWickets: JSON.parse(JSON.stringify(innings.fallOfWickets)),
      recentBalls: JSON.parse(JSON.stringify(innings.recentBalls)),
      currentOverDeliveries: JSON.parse(JSON.stringify(innings.currentOverDeliveries))
    }
  };

  // Determine legality and runs calculation
  const isLegal = (extraType !== 'WIDE' && extraType !== 'NO_BALL');
  let deliveryExtraRuns = 0;
  let deliveryTotalRuns = 0;
  let chargedToBowler = 0;

  if (extraType === 'WIDE') {
    // Wide adds at least 1 extra plus any additional runs
    deliveryExtraRuns = extraRuns > 0 ? extraRuns : 1;
    deliveryTotalRuns = deliveryExtraRuns; // bat runs cannot be scored on wide
    chargedToBowler = deliveryTotalRuns;
    innings.extras.wides += deliveryExtraRuns;
  } else if (extraType === 'NO_BALL') {
    // No ball adds 1 no-ball extra + bat runs or other runs
    const nbPenalty = 1;
    deliveryExtraRuns = nbPenalty;
    deliveryTotalRuns = nbPenalty + runsBat;
    chargedToBowler = deliveryTotalRuns;
    innings.extras.noBalls += nbPenalty;
  } else if (extraType === 'BYE') {
    deliveryExtraRuns = extraRuns > 0 ? extraRuns : 1;
    deliveryTotalRuns = deliveryExtraRuns;
    innings.extras.byes += deliveryExtraRuns;
    chargedToBowler = 0; // Byes are NOT charged to bowler
  } else if (extraType === 'LEG_BYE') {
    deliveryExtraRuns = extraRuns > 0 ? extraRuns : 1;
    deliveryTotalRuns = deliveryExtraRuns;
    innings.extras.legByes += deliveryExtraRuns;
    chargedToBowler = 0; // Leg byes are NOT charged to bowler
  } else if (extraType === 'PENALTY') {
    deliveryExtraRuns = extraRuns > 0 ? extraRuns : 5;
    deliveryTotalRuns = deliveryExtraRuns;
    innings.extras.penalty += deliveryExtraRuns;
    chargedToBowler = 0;
  } else {
    // Normal legal ball
    deliveryTotalRuns = runsBat;
    chargedToBowler = runsBat;
  }

  innings.extras.total = innings.extras.wides + innings.extras.noBalls + innings.extras.byes + innings.extras.legByes + innings.extras.penalty;
  innings.totalRuns += deliveryTotalRuns;
  innings.totalDeliveries += 1;

  // Find or initialize Batting Scorecard entry for striker
  let strikerBatRec = innings.battingScorecard.find(b => b.player.toString() === striker._id.toString());
  if (!strikerBatRec) {
    strikerBatRec = {
      player: striker._id,
      playerName: striker.name,
      runs: 0,
      balls: 0,
      fours: 0,
      sixes: 0,
      strikeRate: 0,
      isOut: false,
      dismissalType: 'not out',
      battingOrder: innings.battingScorecard.length + 1
    };
    innings.battingScorecard.push(strikerBatRec);
  }

  // Find or initialize Batting Scorecard entry for non-striker
  let nonStrikerBatRec = innings.battingScorecard.find(b => b.player.toString() === nonStriker._id.toString());
  if (!nonStrikerBatRec) {
    nonStrikerBatRec = {
      player: nonStriker._id,
      playerName: nonStriker.name,
      runs: 0,
      balls: 0,
      fours: 0,
      sixes: 0,
      strikeRate: 0,
      isOut: false,
      dismissalType: 'not out',
      battingOrder: innings.battingScorecard.length + 1
    };
    innings.battingScorecard.push(nonStrikerBatRec);
  }

  // Find or initialize Bowling Scorecard entry for bowler
  let bowlerRec = innings.bowlingScorecard.find(b => b.player.toString() === bowler._id.toString());
  if (!bowlerRec) {
    bowlerRec = {
      player: bowler._id,
      playerName: bowler.name,
      overs: 0,
      legalBalls: 0,
      maidens: 0,
      runsConceded: 0,
      wickets: 0,
      economy: 0,
      noBalls: 0,
      wides: 0
    };
    innings.bowlingScorecard.push(bowlerRec);
  }

  // Update batter stats (Only bat runs count for batter)
  if (extraType !== 'WIDE') {
    // Striker faced a ball (wide does not count as ball faced)
    strikerBatRec.balls += 1;
    strikerBatRec.runs += runsBat;
    if (runsBat === 4) strikerBatRec.fours += 1;
    if (runsBat === 6) strikerBatRec.sixes += 1;
    strikerBatRec.strikeRate = Number(((strikerBatRec.runs / strikerBatRec.balls) * 100).toFixed(2));
  }

  // Update bowler stats
  bowlerRec.runsConceded += chargedToBowler;
  if (extraType === 'WIDE') bowlerRec.wides += 1;
  if (extraType === 'NO_BALL') bowlerRec.noBalls += 1;

  if (isLegal) {
    innings.legalBalls += 1;
    innings.ballsInCurrentOver += 1;
    bowlerRec.legalBalls += 1;
    bowlerRec.overs = Number((Math.floor(bowlerRec.legalBalls / match.ballsPerOver) + (bowlerRec.legalBalls % match.ballsPerOver) / 10).toFixed(1));
  }
  bowlerRec.economy = bowlerRec.legalBalls > 0 ? Number(((bowlerRec.runsConceded / bowlerRec.legalBalls) * match.ballsPerOver).toFixed(2)) : 0;

  // Partnership tracking
  innings.currentPartnership.runs += deliveryTotalRuns;
  if (extraType !== 'WIDE') {
    innings.currentPartnership.balls += 1;
  }
  innings.currentPartnership.batter1 = striker._id;
  innings.currentPartnership.batter2 = nonStriker._id;

  // Prepare Wicket Handling
  let dismissedPlayerId = null;
  let dismissedPlayerName = '';
  let fielderRecord = null;

  if (isWicket) {
    innings.wickets += 1;
    const wType = wicketInfo.dismissalType || 'BOWLED';

    // Validate stumping rules: only wicketkeeper!
    if (wType === 'STUMPED') {
      if (wicketInfo.fielderId) {
        fielderRecord = await Player.findById(wicketInfo.fielderId);
        if (fielderRecord && fielderRecord.role !== 'Wicketkeeper') {
          // If in standard rules, ensure it's wicketkeeper
          if (match.ruleMode === 'STANDARD') {
            throw new Error('Only the wicketkeeper can execute a stumping in standard cricket rules.');
          }
        }
      }
    }

    if (wicketInfo.fielderId && !fielderRecord) {
      fielderRecord = await Player.findById(wicketInfo.fielderId);
    }

    // Determine who was out
    if (wType === 'RUN_OUT') {
      dismissedPlayerId = wicketInfo.dismissedPlayerId || striker._id.toString();
    } else {
      // Default out is striker for bowled, caught, lbw, stumped, hit wicket, etc.
      dismissedPlayerId = striker._id.toString();
    }

    dismissedPlayerName = dismissedPlayerId === striker._id.toString() ? striker.name : nonStriker.name;

    // Credit bowler with wicket (NOT credited for Run Out, Retired Out/Hurt, Obstructing Field)
    const bowlerCreditedWickets = ['BOWLED', 'CAUGHT', 'LBW', 'STUMPED', 'HIT_WICKET'];
    if (bowlerCreditedWickets.includes(wType)) {
      bowlerRec.wickets += 1;
    }

    // Mark batsman out in batting scorecard
    const dismissedBatRec = innings.battingScorecard.find(b => b.player.toString() === dismissedPlayerId);
    if (dismissedBatRec) {
      if (wType !== 'RETIRED_HURT') {
        dismissedBatRec.isOut = true;
      }
      dismissedBatRec.dismissalType = wType;
      dismissedBatRec.dismissedByBowler = bowler._id;
      dismissedBatRec.dismissedByBowlerName = bowler.name;
      if (fielderRecord) {
        dismissedBatRec.fielder = fielderRecord._id;
        dismissedBatRec.fielderName = fielderRecord.name;
      }
    }

    // Record Fall of Wickets
    const currentOversStr = `${innings.oversCompleted}.${innings.ballsInCurrentOver}`;
    innings.fallOfWickets.push({
      wicketNumber: innings.wickets,
      score: innings.totalRuns,
      overs: currentOversStr,
      player: dismissedPlayerId,
      playerName: dismissedPlayerName,
      timestamp: new Date()
    });

    // Reset partnership on wicket
    innings.currentPartnership = {
      runs: 0,
      balls: 0,
      batter1: null,
      batter2: null
    };
  }

  // Commentary & Badges
  const commentaryText = generateCommentary(
    bowler.name,
    striker.name,
    runsBat,
    extraType,
    deliveryExtraRuns,
    isWicket,
    {
      dismissalType: wicketInfo.dismissalType,
      dismissedPlayerName,
      fielderName: fielderRecord ? fielderRecord.name : ''
    }
  );

  const displayBadge = generateDisplayBadge(runsBat, extraType, deliveryExtraRuns, isWicket);

  // Recent balls summary
  innings.recentBalls.unshift({
    text: displayBadge,
    runs: deliveryTotalRuns,
    isWicket,
    isBoundary: runsBat === 4 || runsBat === 6,
    isExtra: extraType !== 'NONE',
    ballType: extraType
  });
  if (innings.recentBalls.length > 24) innings.recentBalls.pop();

  innings.currentOverDeliveries.push({
    ballIndex: innings.currentOverDeliveries.length + 1,
    display: displayBadge,
    runs: deliveryTotalRuns,
    isExtra: extraType !== 'NONE',
    isWicket
  });

  // STRIKE ROTATION CALCULATION:
  // Determine if strike rotates on this delivery:
  // 1. Normal runs: odd runs (1, 3, 5) -> strike rotates!
  // 2. Wide: strike stays unless running caused odd runs.
  // 3. No ball: odd bat runs (1, 3, 5) -> strike rotates!
  // 4. Byes / Leg Byes: odd runs (1, 3, 5) -> strike rotates!
  // 5. Run out: strike is determined based on runs completed and who was dismissed!
  let strikeRotatedOnBall = false;

  if (extraType === 'WIDE') {
    // Wide does not rotate unless extra runs completed by running was odd
    if (extraRuns > 1 && (extraRuns - 1) % 2 === 1) {
      strikeRotatedOnBall = true;
    }
  } else if (extraType === 'NO_BALL') {
    if (runsBat % 2 === 1) {
      strikeRotatedOnBall = true;
    }
  } else if (extraType === 'BYE' || extraType === 'LEG_BYE') {
    if (extraRuns % 2 === 1) {
      strikeRotatedOnBall = true;
    }
  } else {
    // Normal bat runs
    if (runsBat % 2 === 1) {
      strikeRotatedOnBall = true;
    }
  }

  let nextStrikerId = match.activeStrikerId;
  let nextNonStrikerId = match.activeNonStrikerId;

  if (strikeRotatedOnBall) {
    const temp = nextStrikerId;
    nextStrikerId = nextNonStrikerId;
    nextNonStrikerId = temp;
  }

  // If a wicket fell, replace dismissed batsman
  if (isWicket) {
    const effectiveNewBatter = newBatterId || (dismissedPlayerId === nextStrikerId.toString() ? newStrikerBatterId : newNonStrikerBatterId);

    if (dismissedPlayerId === nextStrikerId.toString()) {
      if (effectiveNewBatter) {
        nextStrikerId = effectiveNewBatter;
      }
    } else if (dismissedPlayerId === nextNonStrikerId.toString()) {
      if (effectiveNewBatter) {
        nextNonStrikerId = effectiveNewBatter;
      }
    }
  }

  // OVER COMPLETION CHECK
  let isOverComplete = false;
  if (innings.ballsInCurrentOver >= match.ballsPerOver) {
    isOverComplete = true;
    innings.oversCompleted += 1;
    innings.ballsInCurrentOver = 0;
    innings.currentOverDeliveries = []; // reset for next over

    // Check maiden over for bowler: if runs conceded in this over was 0
    // (A maiden is conceded runs == 0 from bowler for complete legal over)
    const overDeliveries = await Delivery.find({
      match: matchId,
      innings: innings._id,
      overNumber: innings.oversCompleted - 1
    });
    // Add current ball to overDeliveries for check
    const totalOverRunsCharged = overDeliveries.reduce((sum, d) => {
      if (d.extraType === 'BYE' || d.extraType === 'LEG_BYE' || d.extraType === 'PENALTY') return sum;
      return sum + d.totalRuns;
    }, 0) + chargedToBowler;

    if (totalOverRunsCharged === 0) {
      bowlerRec.maidens += 1;
    }

    // CRITICAL CRICKET RULE: AT END OF OVER, STRIKE ROTATES!
    // The batsman at the non-striker's end at the call of 'Over' faces the next over.
    const temp = nextStrikerId;
    nextStrikerId = nextNonStrikerId;
    nextNonStrikerId = temp;

    // Bowler change requirement:
    match.bowlerChangeRequired = true;
    match.previousBowlerId = match.activeBowlerId;
    // Set activeBowlerId to null to strictly require next bowler selection before next ball!
    match.activeBowlerId = null;
  }

  // Update match active batsman IDs
  match.activeStrikerId = nextStrikerId;
  match.activeNonStrikerId = nextNonStrikerId;

  // CHECK INNINGS & MATCH TERMINATION CONDITIONS
  const battingTeamXI = match.battingTeam.toString() === match.teamA.toString() ? match.playingXI_A : match.playingXI_B;
  const maxWickets = battingTeamXI && battingTeamXI.length > 0 ? battingTeamXI.length - 1 : 10;

  const isAllOut = innings.wickets >= maxWickets;
  const isOversFinished = innings.oversCompleted >= match.totalOvers;

  // Target chasing in 2nd Innings
  let matchCompleted = false;
  if (match.currentInnings === 2) {
    if (innings.target && innings.totalRuns >= innings.target) {
      // 2nd batting team won!
      matchCompleted = true;
      innings.isCompleted = true;
      match.status = 'COMPLETED';
      const wicketsLeft = maxWickets - innings.wickets;
      const winnerTeam = await Team.findById(innings.battingTeam);
      match.result = {
        winner: innings.battingTeam,
        winMargin: `${wicketsLeft} wicket${wicketsLeft > 1 ? 's' : ''}`,
        winType: 'WICKETS',
        summary: `${winnerTeam ? winnerTeam.name : 'Batting Team'} won by ${wicketsLeft} wicket${wicketsLeft > 1 ? 's' : ''}!`,
        isDrawOrTie: false
      };
    } else if (isAllOut || isOversFinished) {
      // 2nd innings finished
      innings.isCompleted = true;
      matchCompleted = true;
      match.status = 'COMPLETED';
      const targetMinusOne = innings.target - 1;

      if (innings.totalRuns === targetMinusOne) {
        // TIE!
        match.result = {
          winner: null,
          winMargin: 'Scores level',
          winType: 'TIE',
          summary: 'Match Tied!',
          isDrawOrTie: true
        };
        if (match.superOverEnabled && !match.superOverPlayed) {
          match.status = 'INNINGS_BREAK'; // Ready for Super Over!
        }
      } else if (innings.totalRuns < targetMinusOne) {
        // 1st batting team won!
        const runsMargin = targetMinusOne - innings.totalRuns;
        const winnerTeam = await Team.findById(innings.bowlingTeam);
        match.result = {
          winner: innings.bowlingTeam,
          winMargin: `${runsMargin} run${runsMargin > 1 ? 's' : ''}`,
          winType: 'RUNS',
          summary: `${winnerTeam ? winnerTeam.name : 'Bowling Team'} won by ${runsMargin} run${runsMargin > 1 ? 's' : ''}!`,
          isDrawOrTie: false
        };
      }
    }
  } else if (match.currentInnings === 1) {
    if (isAllOut || isOversFinished) {
      innings.isCompleted = true;
      match.status = 'INNINGS_BREAK';
    }
  }

  // Create immutable Delivery record
  const delivery = new Delivery({
    match: match._id,
    innings: innings._id,
    inningsNumber: innings.inningsNumber,
    overNumber: innings.oversCompleted - (isOverComplete ? 1 : 0),
    ballInOver: isOverComplete ? match.ballsPerOver : innings.ballsInCurrentOver,
    striker: striker._id,
    strikerName: striker.name,
    nonStriker: nonStriker._id,
    nonStrikerName: nonStriker.name,
    bowler: bowler._id,
    bowlerName: bowler.name,
    runsBat,
    extraType,
    extraRuns: deliveryExtraRuns,
    totalRuns: deliveryTotalRuns,
    isLegal,
    isWicket,
    wicketInfo: {
      dismissalType: wicketInfo.dismissalType || 'NONE',
      dismissedPlayer: dismissedPlayerId,
      dismissedPlayerName,
      fielder: fielderRecord ? fielderRecord._id : null,
      fielderName: fielderRecord ? fielderRecord.name : '',
      description: wicketInfo.description || ''
    },
    commentary: commentaryText,
    displayBadge,
    strikeRotated: strikeRotatedOnBall,
    isOverComplete,
    stateSnapshotBefore,
    timestamp: new Date()
  });

  await delivery.save();
  await innings.save();
  await match.save();

  return {
    delivery,
    match,
    innings,
    commentary: commentaryText,
    isOverComplete,
    matchCompleted
  };
}

/**
 * Undo Last Ball:
 * Restores 100% exact snapshot of match & innings before the last ball was delivered.
 */
async function undoLastBall(matchId, adminUsername = 'admin', reason = 'Admin undo last ball') {
  const match = await Match.findById(matchId);
  if (!match) throw new Error('Match not found');

  const innings = await Innings.findOne({
    match: matchId,
    inningsNumber: match.currentInnings
  });
  if (!innings) throw new Error('Innings not found');

  // Find the latest delivery
  const lastDelivery = await Delivery.findOne({
    match: matchId,
    innings: innings._id
  }).sort({ createdAt: -1 });

  if (!lastDelivery) {
    throw new Error('No deliveries to undo in this innings.');
  }

  if (!lastDelivery.stateSnapshotBefore) {
    throw new Error('Previous state snapshot not available for this delivery.');
  }

  const snapshot = lastDelivery.stateSnapshotBefore;

  // Restore Match State
  match.status = snapshot.match.status;
  match.currentInnings = snapshot.match.currentInnings;
  match.activeStrikerId = snapshot.match.activeStrikerId;
  match.activeNonStrikerId = snapshot.match.activeNonStrikerId;
  match.activeBowlerId = snapshot.match.activeBowlerId;
  match.previousBowlerId = snapshot.match.previousBowlerId;
  match.bowlerChangeRequired = snapshot.match.bowlerChangeRequired;
  match.result = snapshot.match.result;

  // Restore Innings State
  innings.totalRuns = snapshot.innings.totalRuns;
  innings.wickets = snapshot.innings.wickets;
  innings.legalBalls = snapshot.innings.legalBalls;
  innings.totalDeliveries = snapshot.innings.totalDeliveries;
  innings.oversCompleted = snapshot.innings.oversCompleted;
  innings.ballsInCurrentOver = snapshot.innings.ballsInCurrentOver;
  innings.isCompleted = snapshot.innings.isCompleted;
  innings.extras = snapshot.innings.extras;
  innings.battingScorecard = snapshot.innings.battingScorecard;
  innings.bowlingScorecard = snapshot.innings.bowlingScorecard;
  innings.currentPartnership = snapshot.innings.currentPartnership;
  innings.fallOfWickets = snapshot.innings.fallOfWickets;
  innings.recentBalls = snapshot.innings.recentBalls;
  innings.currentOverDeliveries = snapshot.innings.currentOverDeliveries;

  // Save restored state
  await match.save();
  await innings.save();

  // Delete the undone delivery
  await Delivery.findByIdAndDelete(lastDelivery._id);

  // Create Audit Log
  const auditLog = new AuditLog({
    match: match._id,
    action: 'UNDO_BALL',
    adminUsername,
    reason,
    beforeState: {
      deliveryId: lastDelivery._id,
      ball: `${lastDelivery.overNumber}.${lastDelivery.ballInOver}`,
      runs: lastDelivery.totalRuns,
      commentary: lastDelivery.commentary
    },
    afterState: {
      score: `${innings.totalRuns}/${innings.wickets}`,
      overs: `${innings.oversCompleted}.${innings.ballsInCurrentOver}`,
      activeStrikerId: match.activeStrikerId,
      activeNonStrikerId: match.activeNonStrikerId,
      activeBowlerId: match.activeBowlerId
    }
  });
  await auditLog.save();

  return {
    success: true,
    message: 'Last ball successfully undone.',
    match,
    innings,
    undoneDelivery: lastDelivery
  };
}

/**
 * Select / Change Bowler:
 * Ensures standard rule check (bowler cannot bowl consecutive overs) and bowler max overs check.
 */
async function selectNextBowler(matchId, bowlerId, adminUsername = 'admin', isManualChange = false) {
  const match = await Match.findById(matchId);
  if (!match) throw new Error('Match not found');

  const innings = await Innings.findOne({
    match: matchId,
    inningsNumber: match.currentInnings
  });
  if (!innings) throw new Error('Innings not found');

  const bowler = await Player.findById(bowlerId);
  if (!bowler) throw new Error('Bowler not found');

  // Bowler must belong to the bowling team
  if (bowler.team.toString() !== match.bowlingTeam.toString()) {
    throw new Error('Selected bowler does not belong to the bowling team.');
  }

  // STANDARD RULE ENFORCEMENT:
  if (match.ruleMode === 'STANDARD') {
    // Bowler cannot bowl two consecutive overs
    if (match.previousBowlerId && match.previousBowlerId.toString() === bowlerId.toString()) {
      throw new Error('Standard cricket rule: A bowler cannot bowl consecutive overs.');
    }

    // Check max overs limit for bowler
    const bowlerRec = innings.bowlingScorecard.find(b => b.player.toString() === bowlerId.toString());
    if (bowlerRec) {
      const wholeOvers = Math.floor(bowlerRec.legalBalls / match.ballsPerOver);
      if (wholeOvers >= match.maxOversPerBowler) {
        throw new Error(`Bowler has reached maximum overs limit (${match.maxOversPerBowler} overs).`);
      }
    }
  }

  // Assign active bowler and clear change requirement
  match.activeBowlerId = bowler._id;
  match.bowlerChangeRequired = false;
  await match.save();

  // Audit log if manual change mid-over
  if (isManualChange) {
    const auditLog = new AuditLog({
      match: match._id,
      action: 'CORRECT_BOWLER',
      adminUsername,
      reason: 'Manual change of active bowler',
      afterState: { activeBowlerId: bowler._id, bowlerName: bowler.name }
    });
    await auditLog.save();
  }

  return { success: true, match, bowler };
}

/**
 * Change Active Striker / Non-Striker (Admin Correction)
 */
async function changeActiveBatter(matchId, { strikerId, nonStrikerId }, adminUsername = 'admin', reason = 'Manual batter adjustment') {
  const match = await Match.findById(matchId);
  if (!match) throw new Error('Match not found');

  const beforeState = {
    strikerId: match.activeStrikerId,
    nonStrikerId: match.activeNonStrikerId
  };

  if (strikerId) {
    if (nonStrikerId && strikerId.toString() === nonStrikerId.toString()) {
      throw new Error('Striker and Non-Striker cannot be the same player.');
    }
    if (!nonStrikerId && match.activeNonStrikerId && strikerId.toString() === match.activeNonStrikerId.toString()) {
      throw new Error('Striker and Non-Striker cannot be the same player.');
    }
    match.activeStrikerId = strikerId;
  }

  if (nonStrikerId) {
    if (match.activeStrikerId && nonStrikerId.toString() === match.activeStrikerId.toString()) {
      throw new Error('Striker and Non-Striker cannot be the same player.');
    }
    match.activeNonStrikerId = nonStrikerId;
  }

  await match.save();

  const auditLog = new AuditLog({
    match: match._id,
    action: strikerId ? 'CORRECT_STRIKER' : 'CORRECT_NON_STRIKER',
    adminUsername,
    reason,
    beforeState,
    afterState: {
      strikerId: match.activeStrikerId,
      nonStrikerId: match.activeNonStrikerId
    }
  });
  await auditLog.save();

  return { success: true, match };
}

module.exports = {
  processBall,
  undoLastBall,
  selectNextBowler,
  changeActiveBatter,
  generateCommentary,
  generateDisplayBadge
};
