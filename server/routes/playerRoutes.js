const express = require('express');
const router = express.Router();
const Player = require('../models/Player');
const Team = require('../models/Team');
const authMiddleware = require('../middleware/auth');

// GET /api/players - List players (optional ?team=...)
router.get('/', async (req, res) => {
  try {
    const filter = {};
    if (req.query.team) {
      filter.team = req.query.team;
    }
    const players = await Player.find(filter).populate('team', 'name shortName logo primaryColor').sort({ name: 1 });
    res.json({ success: true, players });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/players/:id - Get player details
router.get('/:id', async (req, res) => {
  try {
    const player = await Player.findById(req.params.id).populate('team', 'name shortName logo primaryColor');
    if (!player) return res.status(404).json({ success: false, message: 'Player not found' });
    res.json({ success: true, player });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/players - Create player (Admin)
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { name, playerId, team, role, battingStyle, bowlingStyle } = req.body;
    if (!name || !team) {
      return res.status(400).json({ success: false, message: 'Player name and team are required' });
    }

    const teamExists = await Team.findById(team);
    if (!teamExists) {
      return res.status(400).json({ success: false, message: 'Invalid team ID' });
    }

    // Auto-generate player ID if not provided
    const generatedPlayerId = playerId && playerId.trim() ? playerId.trim() : `PLY-${Date.now().toString().slice(-6)}`;

    // Check unique playerId
    const existing = await Player.findOne({ playerId: generatedPlayerId });
    if (existing) {
      return res.status(400).json({ success: false, message: 'Player ID already in use. Please choose another.' });
    }

    const player = new Player({
      name: name.trim(),
      playerId: generatedPlayerId,
      team,
      role: role || 'Batter',
      battingStyle: battingStyle || 'Right-hand bat',
      bowlingStyle: bowlingStyle || 'Right-arm medium'
    });

    await player.save();
    const populated = await Player.findById(player._id).populate('team', 'name shortName logo primaryColor');
    res.status(201).json({ success: true, player: populated, message: 'Player created successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// PUT /api/players/:id - Update player (Admin)
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const { name, role, battingStyle, bowlingStyle, team } = req.body;
    const player = await Player.findById(req.params.id);
    if (!player) return res.status(404).json({ success: false, message: 'Player not found' });

    if (name) player.name = name.trim();
    if (role) player.role = role;
    if (battingStyle) player.battingStyle = battingStyle;
    if (bowlingStyle) player.bowlingStyle = bowlingStyle;
    if (team) player.team = team;

    await player.save();
    const populated = await Player.findById(player._id).populate('team', 'name shortName logo primaryColor');
    res.json({ success: true, player: populated, message: 'Player updated successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// DELETE /api/players/:id - Delete player (Admin)
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const player = await Player.findById(req.params.id);
    if (!player) return res.status(404).json({ success: false, message: 'Player not found' });

    await Player.findByIdAndDelete(player._id);
    res.json({ success: true, message: 'Player deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
