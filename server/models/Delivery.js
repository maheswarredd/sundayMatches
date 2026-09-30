const mongoose = require('mongoose');

const deliverySchema = new mongoose.Schema({
  match: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Match',
    required: true,
    index: true
  },
  innings: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Innings',
    required: true,
    index: true
  },
  inningsNumber: {
    type: Number,
    required: true
  },
  overNumber: {
    type: Number, // 0 for 1st over, 1 for 2nd over, etc.
    required: true
  },
  ballInOver: {
    type: Number, // legal ball number within the over (1..ballsPerOver)
    required: true
  },
  striker: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Player',
    required: true
  },
  strikerName: {
    type: String,
    required: true
  },
  nonStriker: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Player',
    required: true
  },
  nonStrikerName: {
    type: String,
    required: true
  },
  bowler: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Player',
    required: true
  },
  bowlerName: {
    type: String,
    required: true
  },
  runsBat: {
    type: Number,
    default: 0
  },
  extraType: {
    type: String,
    enum: ['NONE', 'WIDE', 'NO_BALL', 'BYE', 'LEG_BYE', 'PENALTY'],
    default: 'NONE'
  },
  extraRuns: {
    type: Number,
    default: 0
  },
  totalRuns: {
    type: Number,
    required: true,
    default: 0
  },
  isLegal: {
    type: Boolean,
    required: true,
    default: true
  },
  isWicket: {
    type: Boolean,
    default: false
  },
  wicketInfo: {
    dismissalType: {
      type: String,
      enum: [
        'NONE',
        'BOWLED',
        'CAUGHT',
        'LBW',
        'RUN_OUT',
        'STUMPED',
        'HIT_WICKET',
        'RETIRED_OUT',
        'RETIRED_HURT',
        'TIMED_OUT',
        'OBSTRUCTING_FIELD'
      ],
      default: 'NONE'
    },
    dismissedPlayer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Player',
      default: null
    },
    dismissedPlayerName: {
      type: String,
      default: ''
    },
    fielder: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Player',
      default: null
    },
    fielderName: {
      type: String,
      default: ''
    },
    description: {
      type: String,
      default: ''
    }
  },
  commentary: {
    type: String,
    required: true
  },
  displayBadge: {
    type: String,
    default: '' // e.g. "0", "1", "4", "6", "W", "Wd", "Nb+1", "Wd+1", "Nb+W"
  },
  strikeRotated: {
    type: Boolean,
    default: false
  },
  isOverComplete: {
    type: Boolean,
    default: false
  },
  // Immutable full snapshot of Match and Innings before this delivery
  // used for exact, bulletproof UNDO
  stateSnapshotBefore: {
    type: mongoose.Schema.Types.Mixed,
    default: null
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Delivery', deliverySchema);
