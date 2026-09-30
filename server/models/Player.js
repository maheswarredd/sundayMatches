const mongoose = require('mongoose');

const playerSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  playerId: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  team: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Team',
    required: true
  },
  role: {
    type: String,
    enum: ['Batter', 'Bowler', 'All-rounder', 'Wicketkeeper'],
    default: 'Batter'
  },
  battingStyle: {
    type: String,
    enum: ['Right-hand bat', 'Left-hand bat'],
    default: 'Right-hand bat'
  },
  bowlingStyle: {
    type: String,
    enum: [
      'Right-arm fast',
      'Right-arm medium',
      'Right-arm spin',
      'Left-arm fast',
      'Left-arm medium',
      'Left-arm spin',
      'None'
    ],
    default: 'Right-arm medium'
  },
  stats: {
    matches: { type: Number, default: 0 },
    runs: { type: Number, default: 0 },
    ballsFaced: { type: Number, default: 0 },
    fours: { type: Number, default: 0 },
    sixes: { type: Number, default: 0 },
    highestScore: { type: Number, default: 0 },
    wickets: { type: Number, default: 0 },
    oversBowled: { type: Number, default: 0 },
    maidens: { type: Number, default: 0 },
    runsConceded: { type: Number, default: 0 },
    catches: { type: Number, default: 0 },
    stumpings: { type: Number, default: 0 },
    runOuts: { type: Number, default: 0 }
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Player', playerSchema);
