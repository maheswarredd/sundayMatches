const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
  match: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Match',
    required: true,
    index: true
  },
  action: {
    type: String,
    required: true,
    enum: [
      'UNDO_BALL',
      'EDIT_BALL',
      'CORRECT_STRIKER',
      'CORRECT_NON_STRIKER',
      'CORRECT_BOWLER',
      'STATUS_CHANGE',
      'MANUAL_SCORE_OVERRIDE'
    ]
  },
  adminUsername: {
    type: String,
    default: 'admin'
  },
  reason: {
    type: String,
    default: ''
  },
  beforeState: {
    type: mongoose.Schema.Types.Mixed,
    default: null
  },
  afterState: {
    type: mongoose.Schema.Types.Mixed,
    default: null
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('AuditLog', auditLogSchema);
