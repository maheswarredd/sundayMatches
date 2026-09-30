const express = require('express');
const router = express.Router();
const Match = require('../models/Match');
const Innings = require('../models/Innings');
const Delivery = require('../models/Delivery');
const AuditLog = require('../models/AuditLog');
const authMiddleware = require('../middleware/auth');
const {
  processBall,
  undoLastBall,
  selectNextBowler,
  changeActiveBatter
} = require('../services/scoringEngine');
const { broadcastMatchUpdate, broadcastDeliveryEvent } = require('../socket');

// Helper to fetch populated match state
async function getPopulatedMatch(matchId) {
  const match = await Match.findById(matchId)
    .populate('teamA', 'name shortName logo primaryColor')
    .populate('teamB', 'name shortName logo primaryColor')
    .populate('battingTeam', 'name shortName logo primaryColor')
    .populate('bowlingTeam', 'name shortName logo primaryColor')
    .populate('activeStrikerId', 'name playerId role battingStyle bowlingStyle')
    .populate('activeNonStrikerId', 'name playerId role battingStyle bowlingStyle')
    .populate('activeBowlerId', 'name playerId role battingStyle bowlingStyle')
    .populate('previousBowlerId', 'name playerId role')
    .populate('playingXI_A', 'name playerId role team')
    .populate('playingXI_B', 'name playerId role team')
    .populate('result.winner', 'name shortName');

  return match;
}

// POST /api/scoring/:matchId/ball - Record a Delivery (Admin)
router.post('/:matchId/ball', authMiddleware, async (req, res) => {
  try {
    const { matchId } = req.params;
    const {
      runsBat = 0,
      extraType = 'NONE',
      extraRuns = 0,
      isWicket = false,
      wicketInfo = {},
      newBatterId = null,
      newStrikerBatterId = null,
      newNonStrikerBatterId = null
    } = req.body;

    const result = await processBall({
      matchId,
      runsBat: Number(runsBat),
      extraType,
      extraRuns: Number(extraRuns),
      isWicket: Boolean(isWicket),
      wicketInfo,
      newBatterId,
      newStrikerBatterId,
      newNonStrikerBatterId
    });

    const populatedMatch = await getPopulatedMatch(matchId);

    // Broadcast delivery and updated state
    broadcastDeliveryEvent(matchId, {
      delivery: result.delivery,
      commentary: result.commentary
    });

    broadcastMatchUpdate(matchId, {
      type: 'BALL_SCORED',
      match: populatedMatch,
      innings: result.innings,
      delivery: result.delivery,
      commentary: result.commentary,
      isOverComplete: result.isOverComplete,
      matchCompleted: result.matchCompleted
    });

    res.json({
      success: true,
      message: 'Ball recorded successfully',
      delivery: result.delivery,
      match: populatedMatch,
      innings: result.innings,
      commentary: result.commentary,
      isOverComplete: result.isOverComplete,
      matchCompleted: result.matchCompleted
    });
  } catch (error) {
    console.error('Error processing delivery:', error);
    res.status(400).json({ success: false, message: error.message });
  }
});

// POST /api/scoring/:matchId/undo - Undo Last Delivery (Admin)
router.post('/:matchId/undo', authMiddleware, async (req, res) => {
  try {
    const { matchId } = req.params;
    const adminUsername = req.user ? req.user.username : 'admin';
    const reason = req.body.reason || 'Admin undo last ball';

    const result = await undoLastBall(matchId, adminUsername, reason);
    const populatedMatch = await getPopulatedMatch(matchId);

    broadcastMatchUpdate(matchId, {
      type: 'BALL_UNDONE',
      match: populatedMatch,
      innings: result.innings,
      undoneDeliveryId: result.undoneDelivery._id
    });

    res.json({
      success: true,
      message: result.message,
      match: populatedMatch,
      innings: result.innings,
      undoneDelivery: result.undoneDelivery
    });
  } catch (error) {
    console.error('Error undoing delivery:', error);
    res.status(400).json({ success: false, message: error.message });
  }
});

// POST /api/scoring/:matchId/next-bowler - Select Next Bowler (Admin)
router.post('/:matchId/next-bowler', authMiddleware, async (req, res) => {
  try {
    const { matchId } = req.params;
    const { bowlerId } = req.body;
    if (!bowlerId) {
      return res.status(400).json({ success: false, message: 'bowlerId is required.' });
    }

    const adminUsername = req.user ? req.user.username : 'admin';
    const result = await selectNextBowler(matchId, bowlerId, adminUsername, false);
    const populatedMatch = await getPopulatedMatch(matchId);

    broadcastMatchUpdate(matchId, {
      type: 'BOWLER_SELECTED',
      match: populatedMatch,
      bowler: result.bowler
    });

    res.json({
      success: true,
      message: `Bowler ${result.bowler.name} selected successfully.`,
      match: populatedMatch
    });
  } catch (error) {
    console.error('Error selecting next bowler:', error);
    res.status(400).json({ success: false, message: error.message });
  }
});

// POST /api/scoring/:matchId/change-bowler - Change Bowler Mid-Over (Admin)
router.post('/:matchId/change-bowler', authMiddleware, async (req, res) => {
  try {
    const { matchId } = req.params;
    const { bowlerId } = req.body;
    if (!bowlerId) {
      return res.status(400).json({ success: false, message: 'bowlerId is required.' });
    }

    const adminUsername = req.user ? req.user.username : 'admin';
    const result = await selectNextBowler(matchId, bowlerId, adminUsername, true);
    const populatedMatch = await getPopulatedMatch(matchId);

    broadcastMatchUpdate(matchId, {
      type: 'BOWLER_CHANGED',
      match: populatedMatch,
      bowler: result.bowler
    });

    res.json({
      success: true,
      message: `Bowler changed to ${result.bowler.name}.`,
      match: populatedMatch
    });
  } catch (error) {
    console.error('Error changing bowler:', error);
    res.status(400).json({ success: false, message: error.message });
  }
});

// POST /api/scoring/:matchId/change-batter - Adjust Active Striker or Non-Striker (Admin)
router.post('/:matchId/change-batter', authMiddleware, async (req, res) => {
  try {
    const { matchId } = req.params;
    const { strikerId, nonStrikerId, reason } = req.body;

    const adminUsername = req.user ? req.user.username : 'admin';
    const result = await changeActiveBatter(
      matchId,
      { strikerId, nonStrikerId },
      adminUsername,
      reason || 'Admin batter adjustment'
    );

    const populatedMatch = await getPopulatedMatch(matchId);

    broadcastMatchUpdate(matchId, {
      type: 'BATTER_CHANGED',
      match: populatedMatch
    });

    res.json({
      success: true,
      message: 'Active batter updated successfully',
      match: populatedMatch
    });
  } catch (error) {
    console.error('Error changing batter:', error);
    res.status(400).json({ success: false, message: error.message });
  }
});

// PUT /api/scoring/:matchId/delivery/:deliveryId - Edit / Correct Delivery (Admin)
router.put('/:matchId/delivery/:deliveryId', authMiddleware, async (req, res) => {
  try {
    const { matchId, deliveryId } = req.params;
    const { commentary, runsBat } = req.body;

    const delivery = await Delivery.findOne({ _id: deliveryId, match: matchId });
    if (!delivery) return res.status(404).json({ success: false, message: 'Delivery not found' });

    const beforeState = {
      commentary: delivery.commentary,
      runsBat: delivery.runsBat
    };

    if (commentary !== undefined) delivery.commentary = commentary;
    if (runsBat !== undefined) delivery.runsBat = runsBat;

    await delivery.save();

    const auditLog = new AuditLog({
      match: matchId,
      action: 'EDIT_BALL',
      adminUsername: req.user ? req.user.username : 'admin',
      reason: req.body.reason || 'Admin delivery correction',
      beforeState,
      afterState: { commentary: delivery.commentary, runsBat: delivery.runsBat }
    });
    await auditLog.save();

    res.json({ success: true, delivery, message: 'Delivery updated successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
