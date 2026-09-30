const express = require('express');
const router = express.Router();
const Match = require('../models/Match');
const Innings = require('../models/Innings');
const Delivery = require('../models/Delivery');
const Team = require('../models/Team');
const Player = require('../models/Player');
const authMiddleware = require('../middleware/auth');
const { broadcastMatchUpdate } = require('../socket');

// Helper to fetch populated match state
async function getPopulatedMatch(matchId) {
  const match = await Match.findById(matchId)
    .populate('teamA', 'name shortName logo primaryColor')
    .populate('teamB', 'name shortName logo primaryColor')
    .populate('battingTeam', 'name shortName logo primaryColor')
    .populate('bowlingTeam', 'name shortName logo primaryColor')
    .populate('tossWinner', 'name shortName')
    .populate('activeStrikerId', 'name playerId role battingStyle bowlingStyle')
    .populate('activeNonStrikerId', 'name playerId role battingStyle bowlingStyle')
    .populate('activeBowlerId', 'name playerId role battingStyle bowlingStyle')
    .populate('previousBowlerId', 'name playerId role')
    .populate('playingXI_A', 'name playerId role battingStyle bowlingStyle team')
    .populate('playingXI_B', 'name playerId role battingStyle bowlingStyle team')
    .populate('result.winner', 'name shortName');

  return match;
}

// GET /api/matches - List all matches
router.get('/', async (req, res) => {
  try {
    const { status, limit = 50 } = req.query;
    const filter = {};
    if (status) {
      if (status === 'live') {
        filter.status = { $in: ['LIVE', 'INNINGS_BREAK', 'PAUSED'] };
      } else if (status === 'upcoming') {
        filter.status = { $in: ['UPCOMING', 'TOSS_DONE', 'PLAYING_XI_SELECTED'] };
      } else if (status === 'recent' || status === 'completed') {
        filter.status = { $in: ['COMPLETED', 'ABANDONED'] };
      } else {
        filter.status = status.toUpperCase();
      }
    }

    const matches = await Match.find(filter)
      .populate('teamA', 'name shortName logo primaryColor')
      .populate('teamB', 'name shortName logo primaryColor')
      .populate('battingTeam', 'name shortName')
      .populate('bowlingTeam', 'name shortName')
      .populate('result.winner', 'name shortName')
      .sort({ updatedAt: -1 })
      .limit(Number(limit));

    // Attach current innings summary to each match for live cards
    const matchesWithInnings = await Promise.all(
      matches.map(async (m) => {
        const currentInningsDoc = await Innings.findOne({ match: m._id, inningsNumber: m.currentInnings });
        const innings1Doc = await Innings.findOne({ match: m._id, inningsNumber: 1 });
        return {
          ...m.toObject(),
          currentInningsScore: currentInningsDoc ? {
            runs: currentInningsDoc.totalRuns,
            wickets: currentInningsDoc.wickets,
            overs: `${currentInningsDoc.oversCompleted}.${currentInningsDoc.ballsInCurrentOver}`,
            target: currentInningsDoc.target
          } : null,
          innings1Score: innings1Doc ? {
            runs: innings1Doc.totalRuns,
            wickets: innings1Doc.wickets,
            overs: `${innings1Doc.oversCompleted}.${innings1Doc.ballsInCurrentOver}`
          } : null
        };
      })
    );

    res.json({ success: true, matches: matchesWithInnings });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/matches/:id - Get single match with full live state
router.get('/:id', async (req, res) => {
  try {
    const match = await getPopulatedMatch(req.params.id);
    if (!match) return res.status(404).json({ success: false, message: 'Match not found' });

    // Fetch innings data
    const currentInnings = await Innings.findOne({ match: match._id, inningsNumber: match.currentInnings })
      .populate('battingTeam', 'name shortName')
      .populate('bowlingTeam', 'name shortName');

    const innings1 = await Innings.findOne({ match: match._id, inningsNumber: 1 });
    const innings2 = await Innings.findOne({ match: match._id, inningsNumber: 2 });

    // Calculate run rates
    let currentRunRate = 0;
    let requiredRunRate = 0;

    if (currentInnings) {
      const totalLegalDeliveries = (currentInnings.oversCompleted * match.ballsPerOver) + currentInnings.ballsInCurrentOver;
      if (totalLegalDeliveries > 0) {
        currentRunRate = Number(((currentInnings.totalRuns / totalLegalDeliveries) * match.ballsPerOver).toFixed(2));
      }

      if (match.currentInnings === 2 && currentInnings.target) {
        const runsNeeded = currentInnings.target - currentInnings.totalRuns;
        const totalBallsInMatch = match.totalOvers * match.ballsPerOver;
        const ballsRemaining = totalBallsInMatch - totalLegalDeliveries;
        if (ballsRemaining > 0 && runsNeeded > 0) {
          requiredRunRate = Number(((runsNeeded / ballsRemaining) * match.ballsPerOver).toFixed(2));
        }
      }
    }

    // Get latest deliveries for live commentary preview
    const latestDeliveries = await Delivery.find({ match: match._id })
      .sort({ createdAt: -1 })
      .limit(12);

    res.json({
      success: true,
      match,
      currentInnings,
      innings1,
      innings2,
      currentRunRate,
      requiredRunRate,
      latestDeliveries
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/matches - Create new match (Admin)
router.post('/', authMiddleware, async (req, res) => {
  try {
    const {
      title,
      series = 'Sunday League',
      venue,
      date = new Date(),
      format = 'T20',
      totalOvers,
      ballsPerOver = 6,
      maxOversPerBowler,
      ruleMode = 'STANDARD',
      superOverEnabled = false,
      teamA,
      teamB
    } = req.body;

    if (!title || !venue || !teamA || !teamB) {
      return res.status(400).json({ success: false, message: 'Title, venue, team A, and team B are required.' });
    }

    if (teamA === teamB) {
      return res.status(400).json({ success: false, message: 'Team A and Team B cannot be identical.' });
    }

    // Determine default overs based on format
    let overs = Number(totalOvers);
    if (!overs) {
      if (format === 'T10') overs = 10;
      else if (format === 'T20') overs = 20;
      else if (format === 'ODI') overs = 50;
      else overs = 20;
    }

    let maxOvers = Number(maxOversPerBowler);
    if (!maxOvers) {
      maxOvers = Math.ceil(overs / 5); // standard cricket 1/5th
    }

    const match = new Match({
      title: title.trim(),
      series: series.trim(),
      venue: venue.trim(),
      date,
      format,
      totalOvers: overs,
      ballsPerOver: Number(ballsPerOver) || 6,
      maxOversPerBowler: maxOvers,
      ruleMode: ruleMode === 'CUSTOM_FLEXIBLE' ? 'CUSTOM_FLEXIBLE' : 'STANDARD',
      superOverEnabled: Boolean(superOverEnabled),
      teamA,
      teamB,
      status: 'UPCOMING',
      currentInnings: 1
    });

    await match.save();
    const populated = await getPopulatedMatch(match._id);
    broadcastMatchUpdate(match._id, { type: 'MATCH_CREATED', match: populated });

    res.status(201).json({ success: true, match: populated, message: 'Match created successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/matches/:id/toss - Record Toss (Admin)
router.post('/:id/toss', authMiddleware, async (req, res) => {
  try {
    const { tossWinner, tossDecision } = req.body;
    const match = await Match.findById(req.params.id);
    if (!match) return res.status(404).json({ success: false, message: 'Match not found' });

    if (!tossWinner || !tossDecision) {
      return res.status(400).json({ success: false, message: 'Toss winner and toss decision (BAT/BOWL) are required.' });
    }

    match.tossWinner = tossWinner;
    match.tossDecision = tossDecision.toUpperCase();

    // Automatically determine batting and bowling teams
    const isTeamAWinner = tossWinner.toString() === match.teamA.toString();
    if (match.tossDecision === 'BAT') {
      match.battingTeam = isTeamAWinner ? match.teamA : match.teamB;
      match.bowlingTeam = isTeamAWinner ? match.teamB : match.teamA;
    } else {
      match.battingTeam = isTeamAWinner ? match.teamB : match.teamA;
      match.bowlingTeam = isTeamAWinner ? match.teamA : match.teamB;
    }

    match.status = 'TOSS_DONE';
    await match.save();

    const populated = await getPopulatedMatch(match._id);
    broadcastMatchUpdate(match._id, { type: 'TOSS_COMPLETED', match: populated });

    res.json({ success: true, match: populated, message: 'Toss recorded successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/matches/:id/playing-xi - Select Playing XI (Admin)
router.post('/:id/playing-xi', authMiddleware, async (req, res) => {
  try {
    const { playingXI_A, playingXI_B } = req.body;
    const match = await Match.findById(req.params.id);
    if (!match) return res.status(404).json({ success: false, message: 'Match not found' });

    if (!Array.isArray(playingXI_A) || !Array.isArray(playingXI_B)) {
      return res.status(400).json({ success: false, message: 'playingXI_A and playingXI_B must be arrays of player IDs.' });
    }

    // Check duplicates within each team
    const uniqueA = new Set(playingXI_A);
    const uniqueB = new Set(playingXI_B);
    if (uniqueA.size !== playingXI_A.length) {
      return res.status(400).json({ success: false, message: 'Duplicate players selected for Team A.' });
    }
    if (uniqueB.size !== playingXI_B.length) {
      return res.status(400).json({ success: false, message: 'Duplicate players selected for Team B.' });
    }

    match.playingXI_A = playingXI_A;
    match.playingXI_B = playingXI_B;
    match.status = 'PLAYING_XI_SELECTED';
    await match.save();

    const populated = await getPopulatedMatch(match._id);
    broadcastMatchUpdate(match._id, { type: 'PLAYING_XI_UPDATED', match: populated });

    res.json({ success: true, match: populated, message: 'Playing XI saved successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/matches/:id/start - Start Match & Innings 1 (Admin)
router.post('/:id/start', authMiddleware, async (req, res) => {
  try {
    const { openingStrikerId, openingNonStrikerId, openingBowlerId } = req.body;
    const match = await Match.findById(req.params.id);
    if (!match) return res.status(404).json({ success: false, message: 'Match not found' });

    if (!openingStrikerId || !openingNonStrikerId || !openingBowlerId) {
      return res.status(400).json({ success: false, message: 'Opening striker, non-striker, and bowler are required.' });
    }

    if (openingStrikerId === openingNonStrikerId) {
      return res.status(400).json({ success: false, message: 'Striker and Non-Striker cannot be the same player.' });
    }

    // Fetch player names to initialize batting & bowling scorecards
    const [striker, nonStriker, bowler] = await Promise.all([
      Player.findById(openingStrikerId),
      Player.findById(openingNonStrikerId),
      Player.findById(openingBowlerId)
    ]);

    // Create or find Innings 1
    let innings1 = await Innings.findOne({ match: match._id, inningsNumber: 1 });
    if (!innings1) {
      innings1 = new Innings({
        match: match._id,
        inningsNumber: 1,
        battingTeam: match.battingTeam,
        bowlingTeam: match.bowlingTeam,
        totalRuns: 0,
        wickets: 0,
        legalBalls: 0,
        totalDeliveries: 0,
        oversCompleted: 0,
        ballsInCurrentOver: 0,
        battingScorecard: [
          {
            player: striker._id,
            playerName: striker.name,
            runs: 0,
            balls: 0,
            fours: 0,
            sixes: 0,
            strikeRate: 0,
            isOut: false,
            dismissalType: 'not out',
            battingOrder: 1
          },
          {
            player: nonStriker._id,
            playerName: nonStriker.name,
            runs: 0,
            balls: 0,
            fours: 0,
            sixes: 0,
            strikeRate: 0,
            isOut: false,
            dismissalType: 'not out',
            battingOrder: 2
          }
        ],
        bowlingScorecard: [
          {
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
          }
        ],
        currentPartnership: {
          runs: 0,
          balls: 0,
          batter1: striker._id,
          batter2: nonStriker._id
        }
      });
      await innings1.save();
    }

    // Set authoritative match active players
    match.activeStrikerId = striker._id;
    match.activeNonStrikerId = nonStriker._id;
    match.activeBowlerId = bowler._id;
    match.bowlerChangeRequired = false;
    match.status = 'LIVE';
    match.currentInnings = 1;

    await match.save();

    const populated = await getPopulatedMatch(match._id);
    broadcastMatchUpdate(match._id, { type: 'MATCH_STARTED', match: populated, innings: innings1 });

    res.json({ success: true, match: populated, innings: innings1, message: 'Match started successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/matches/:id/start-innings-2 - Start 2nd Innings (Admin)
router.post('/:id/start-innings-2', authMiddleware, async (req, res) => {
  try {
    const { openingStrikerId, openingNonStrikerId, openingBowlerId } = req.body;
    const match = await Match.findById(req.params.id);
    if (!match) return res.status(404).json({ success: false, message: 'Match not found' });

    const innings1 = await Innings.findOne({ match: match._id, inningsNumber: 1 });
    if (!innings1) return res.status(400).json({ success: false, message: 'Innings 1 has not taken place yet.' });

    // Swap batting and bowling teams
    const prevBattingTeam = match.battingTeam;
    const prevBowlingTeam = match.bowlingTeam;
    match.battingTeam = prevBowlingTeam;
    match.bowlingTeam = prevBattingTeam;

    const target = innings1.totalRuns + 1;

    const [striker, nonStriker, bowler] = await Promise.all([
      Player.findById(openingStrikerId),
      Player.findById(openingNonStrikerId),
      Player.findById(openingBowlerId)
    ]);

    let innings2 = await Innings.findOne({ match: match._id, inningsNumber: 2 });
    if (!innings2) {
      innings2 = new Innings({
        match: match._id,
        inningsNumber: 2,
        battingTeam: match.battingTeam,
        bowlingTeam: match.bowlingTeam,
        target,
        totalRuns: 0,
        wickets: 0,
        legalBalls: 0,
        totalDeliveries: 0,
        oversCompleted: 0,
        ballsInCurrentOver: 0,
        battingScorecard: [
          {
            player: striker._id,
            playerName: striker.name,
            runs: 0,
            balls: 0,
            fours: 0,
            sixes: 0,
            strikeRate: 0,
            isOut: false,
            dismissalType: 'not out',
            battingOrder: 1
          },
          {
            player: nonStriker._id,
            playerName: nonStriker.name,
            runs: 0,
            balls: 0,
            fours: 0,
            sixes: 0,
            strikeRate: 0,
            isOut: false,
            dismissalType: 'not out',
            battingOrder: 2
          }
        ],
        bowlingScorecard: [
          {
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
          }
        ],
        currentPartnership: {
          runs: 0,
          balls: 0,
          batter1: striker._id,
          batter2: nonStriker._id
        }
      });
      await innings2.save();
    }

    match.activeStrikerId = striker._id;
    match.activeNonStrikerId = nonStriker._id;
    match.activeBowlerId = bowler._id;
    match.previousBowlerId = null;
    match.bowlerChangeRequired = false;
    match.currentInnings = 2;
    match.status = 'LIVE';

    await match.save();

    const populated = await getPopulatedMatch(match._id);
    broadcastMatchUpdate(match._id, { type: 'INNINGS_2_STARTED', match: populated, innings: innings2 });

    res.json({ success: true, match: populated, innings: innings2, message: 'Second innings started successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/matches/:id/pause - Pause live match
router.post('/:id/pause', authMiddleware, async (req, res) => {
  try {
    const match = await Match.findById(req.params.id);
    if (!match) return res.status(404).json({ success: false, message: 'Match not found' });
    match.status = 'PAUSED';
    await match.save();
    const populated = await getPopulatedMatch(match._id);
    broadcastMatchUpdate(match._id, { type: 'MATCH_PAUSED', match: populated });
    res.json({ success: true, match: populated, message: 'Match paused' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/matches/:id/resume - Resume paused match
router.post('/:id/resume', authMiddleware, async (req, res) => {
  try {
    const match = await Match.findById(req.params.id);
    if (!match) return res.status(404).json({ success: false, message: 'Match not found' });
    match.status = 'LIVE';
    await match.save();
    const populated = await getPopulatedMatch(match._id);
    broadcastMatchUpdate(match._id, { type: 'MATCH_RESUMED', match: populated });
    res.json({ success: true, match: populated, message: 'Match resumed' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/matches/:id/end - Conclude match manually (Admin)
router.post('/:id/end', authMiddleware, async (req, res) => {
  try {
    const { winnerId, winMargin, winType, summary } = req.body;
    const match = await Match.findById(req.params.id);
    if (!match) return res.status(404).json({ success: false, message: 'Match not found' });

    match.status = 'COMPLETED';
    match.result = {
      winner: winnerId || null,
      winMargin: winMargin || '',
      winType: winType || 'NONE',
      summary: summary || 'Match concluded',
      isDrawOrTie: winType === 'TIE' || winType === 'DRAW'
    };

    await match.save();
    const populated = await getPopulatedMatch(match._id);
    broadcastMatchUpdate(match._id, { type: 'MATCH_COMPLETED', match: populated });
    res.json({ success: true, match: populated, message: 'Match completed' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// DELETE /api/matches/:id - Delete match (Admin)
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const match = await Match.findById(req.params.id);
    if (!match) return res.status(404).json({ success: false, message: 'Match not found' });

    await Innings.deleteMany({ match: match._id });
    await Delivery.deleteMany({ match: match._id });
    await Match.findByIdAndDelete(match._id);

    broadcastMatchUpdate(match._id, { type: 'MATCH_DELETED', matchId: match._id });
    res.json({ success: true, message: 'Match deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/matches/:id/scorecard - Full Scorecard
router.get('/:id/scorecard', async (req, res) => {
  try {
    const match = await getPopulatedMatch(req.params.id);
    if (!match) return res.status(404).json({ success: false, message: 'Match not found' });

    const innings1 = await Innings.findOne({ match: match._id, inningsNumber: 1 })
      .populate('battingTeam', 'name shortName logo')
      .populate('bowlingTeam', 'name shortName logo');

    const innings2 = await Innings.findOne({ match: match._id, inningsNumber: 2 })
      .populate('battingTeam', 'name shortName logo')
      .populate('bowlingTeam', 'name shortName logo');

    res.json({ success: true, match, innings1, innings2 });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/matches/:id/commentary - Commentary stream
router.get('/:id/commentary', async (req, res) => {
  try {
    const { inningsNumber } = req.query;
    const filter = { match: req.params.id };
    if (inningsNumber) {
      filter.inningsNumber = Number(inningsNumber);
    }
    const deliveries = await Delivery.find(filter)
      .sort({ createdAt: -1 })
      .limit(100);

    res.json({ success: true, deliveries });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
