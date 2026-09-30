const mongoose = require('mongoose');

const battingRecordSchema = new mongoose.Schema({
  player: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Player',
    required: true
  },
  playerName: { type: String, default: '' },
  runs: { type: Number, default: 0 },
  balls: { type: Number, default: 0 },
  fours: { type: Number, default: 0 },
  sixes: { type: Number, default: 0 },
  strikeRate: { type: Number, default: 0 },
  isOut: { type: Boolean, default: false },
  dismissalType: { type: String, default: 'not out' },
  dismissedByBowler: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Player',
    default: null
  },
  dismissedByBowlerName: { type: String, default: '' },
  fielder: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Player',
    default: null
  },
  fielderName: { type: String, default: '' },
  battingOrder: { type: Number, default: 1 }
}, { _id: false });

const bowlingRecordSchema = new mongoose.Schema({
  player: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Player',
    required: true
  },
  playerName: { type: String, default: '' },
  overs: { type: Number, default: 0 }, // whole overs
  legalBalls: { type: Number, default: 0 }, // legal deliveries bowled in total
  maidens: { type: Number, default: 0 },
  runsConceded: { type: Number, default: 0 },
  wickets: { type: Number, default: 0 },
  economy: { type: Number, default: 0 },
  noBalls: { type: Number, default: 0 },
  wides: { type: Number, default: 0 }
}, { _id: false });

const inningsSchema = new mongoose.Schema({
  match: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Match',
    required: true
  },
  inningsNumber: {
    type: Number,
    required: true,
    default: 1
  },
  battingTeam: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Team',
    required: true
  },
  bowlingTeam: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Team',
    required: true
  },
  totalRuns: {
    type: Number,
    default: 0
  },
  wickets: {
    type: Number,
    default: 0
  },
  legalBalls: {
    type: Number,
    default: 0
  },
  totalDeliveries: {
    type: Number,
    default: 0
  },
  oversCompleted: {
    type: Number,
    default: 0
  },
  ballsInCurrentOver: {
    type: Number,
    default: 0
  },
  target: {
    type: Number,
    default: null
  },
  isCompleted: {
    type: Boolean,
    default: false
  },
  extras: {
    wides: { type: Number, default: 0 },
    noBalls: { type: Number, default: 0 },
    byes: { type: Number, default: 0 },
    legByes: { type: Number, default: 0 },
    penalty: { type: Number, default: 0 },
    total: { type: Number, default: 0 }
  },
  battingScorecard: [battingRecordSchema],
  bowlingScorecard: [bowlingRecordSchema],
  currentPartnership: {
    runs: { type: Number, default: 0 },
    balls: { type: Number, default: 0 },
    batter1: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Player',
      default: null
    },
    batter2: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Player',
      default: null
    }
  },
  fallOfWickets: [{
    wicketNumber: { type: Number, required: true },
    score: { type: Number, required: true },
    overs: { type: String, required: true },
    player: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Player',
      required: true
    },
    playerName: { type: String, default: '' },
    timestamp: { type: Date, default: Date.now }
  }],
  recentBalls: [{
    text: String,
    runs: Number,
    isWicket: Boolean,
    isBoundary: Boolean,
    isExtra: Boolean,
    ballType: String
  }],
  currentOverDeliveries: [{
    ballIndex: Number,
    display: String,
    runs: Number,
    isExtra: Boolean,
    isWicket: Boolean
  }]
}, {
  timestamps: true
});

module.exports = mongoose.model('Innings', inningsSchema);
