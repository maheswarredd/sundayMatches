const mongoose = require('mongoose');

const matchSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  series: {
    type: String,
    default: 'Sunday League',
    trim: true
  },
  venue: {
    type: String,
    required: true,
    trim: true
  },
  date: {
    type: Date,
    default: Date.now
  },
  format: {
    type: String,
    enum: ['T10', 'T20', 'ODI', 'CUSTOM'],
    default: 'T20'
  },
  totalOvers: {
    type: Number,
    required: true,
    default: 20
  },
  ballsPerOver: {
    type: Number,
    required: true,
    default: 6
  },
  maxOversPerBowler: {
    type: Number,
    required: true,
    default: 4
  },
  inningsCount: {
    type: Number,
    default: 2
  },
  ruleMode: {
    type: String,
    enum: ['STANDARD', 'CUSTOM_FLEXIBLE'],
    default: 'STANDARD'
  },
  superOverEnabled: {
    type: Boolean,
    default: false
  },
  superOverPlayed: {
    type: Boolean,
    default: false
  },
  teamA: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Team',
    required: true
  },
  teamB: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Team',
    required: true
  },
  playingXI_A: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Player'
  }],
  playingXI_B: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Player'
  }],
  tossWinner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Team',
    default: null
  },
  tossDecision: {
    type: String,
    enum: ['BAT', 'BOWL', null],
    default: null
  },
  battingTeam: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Team',
    default: null
  },
  bowlingTeam: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Team',
    default: null
  },
  status: {
    type: String,
    enum: ['UPCOMING', 'TOSS_DONE', 'PLAYING_XI_SELECTED', 'LIVE', 'INNINGS_BREAK', 'COMPLETED', 'PAUSED', 'ABANDONED'],
    default: 'UPCOMING'
  },
  currentInnings: {
    type: Number,
    default: 1
  },
  // AUTHORITATIVE ACTIVE PLAYERS ON PITCH - Single Source of Truth
  activeStrikerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Player',
    default: null
  },
  activeNonStrikerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Player',
    default: null
  },
  activeBowlerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Player',
    default: null
  },
  previousBowlerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Player',
    default: null
  },
  bowlerChangeRequired: {
    type: Boolean,
    default: false
  },
  result: {
    winner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Team',
      default: null
    },
    winMargin: { type: String, default: '' },
    winType: {
      type: String,
      enum: ['RUNS', 'WICKETS', 'TIE', 'SUPER_OVER', 'DRAW', 'NO_RESULT', 'NONE'],
      default: 'NONE'
    },
    summary: { type: String, default: '' },
    isDrawOrTie: { type: Boolean, default: false }
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

matchSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Match', matchSchema);
