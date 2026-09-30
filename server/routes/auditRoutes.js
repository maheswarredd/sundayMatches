const express = require('express');
const router = express.Router();
const AuditLog = require('../models/AuditLog');
const authMiddleware = require('../middleware/auth');

// GET /api/audit/:matchId - Get audit logs for match
router.get('/:matchId', authMiddleware, async (req, res) => {
  try {
    const logs = await AuditLog.find({ match: req.params.matchId }).sort({ timestamp: -1 });
    res.json({ success: true, logs });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
