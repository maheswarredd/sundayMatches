const express = require('express');
const router = express.Router();
const Team = require('../models/Team');
const Player = require('../models/Player');
const authMiddleware = require('../middleware/auth');

// GET /api/teams - List all teams
router.get('/', async (req, res) => {
  try {
    const teams = await Team.find().sort({ name: 1 });
    const teamsWithCounts = await Promise.all(
      teams.map(async (team) => {
        const playerCount = await Player.countDocuments({ team: team._id });
        return {
          ...team.toObject(),
          playerCount
        };
      })
    );
    res.json({ success: true, teams: teamsWithCounts });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/teams/:id - Get team with its players
router.get('/:id', async (req, res) => {
  try {
    const team = await Team.findById(req.params.id);
    if (!team) return res.status(404).json({ success: false, message: 'Team not found' });
    const players = await Player.find({ team: team._id }).sort({ name: 1 });
    res.json({ success: true, team, players });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/teams - Create new team (Admin)
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { name, shortName, logo, primaryColor } = req.body;
    if (!name || !shortName) {
      return res.status(400).json({ success: false, message: 'Team name and short name are required' });
    }

    const team = new Team({
      name: name.trim(),
      shortName: shortName.trim().toUpperCase(),
      logo: logo || '',
      primaryColor: primaryColor || '#16a34a'
    });

    await team.save();
    res.status(201).json({ success: true, team, message: 'Team created successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// PUT /api/teams/:id - Update team (Admin)
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const { name, shortName, logo, primaryColor } = req.body;
    const team = await Team.findById(req.params.id);
    if (!team) return res.status(404).json({ success: false, message: 'Team not found' });

    if (name) team.name = name.trim();
    if (shortName) team.shortName = shortName.trim().toUpperCase();
    if (logo !== undefined) team.logo = logo;
    if (primaryColor) team.primaryColor = primaryColor;

    await team.save();
    res.json({ success: true, team, message: 'Team updated successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// DELETE /api/teams/:id - Delete team (Admin)
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const team = await Team.findById(req.params.id);
    if (!team) return res.status(404).json({ success: false, message: 'Team not found' });

    // Also remove players associated with this team
    await Player.deleteMany({ team: team._id });
    await Team.findByIdAndDelete(team._id);

    res.json({ success: true, message: 'Team and associated players deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
