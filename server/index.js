const express = require('express');
const http = require('http');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
require('dotenv').config();

const { initSocket } = require('./socket');
const authRoutes = require('./routes/authRoutes');
const teamRoutes = require('./routes/teamRoutes');
const playerRoutes = require('./routes/playerRoutes');
const matchRoutes = require('./routes/matchRoutes');
const scoringRoutes = require('./routes/scoringRoutes');
const auditRoutes = require('./routes/auditRoutes');
const User = require('./models/User');
const Team = require('./models/Team');
const Player = require('./models/Player');
const Match = require('./models/Match');
const Innings = require('./models/Innings');

const app = express();
const server = http.createServer(app);

// Initialize Socket.io
initSocket(server, process.env.CLIENT_URL);

// Middleware
app.use(helmet({
  crossOriginResourcePolicy: false,
  contentSecurityPolicy: false
}));

app.use(cors({
  origin: '*', // Allow all origins for seamless Render API & frontend communication
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-admin-key']
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rate limiter for authentication endpoint
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: { success: false, message: 'Too many authentication attempts, please try again later.' }
});
app.use('/api/auth', authLimiter);

// Health check endpoint - specific Render requirement
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    service: 'SundayMatches Backend',
    database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/teams', teamRoutes);
app.use('/api/players', playerRoutes);
app.use('/api/matches', matchRoutes);
app.use('/api/scoring', scoringRoutes);
app.use('/api/audit', auditRoutes);

// Optional SPA Static Serving (if frontend is built into client/dist)
const clientDistPath = path.join(__dirname, '../client/dist');
app.use(express.static(clientDistPath));

// Fallback for SPA routing
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api/') || req.path === '/health') {
    return next();
  }
  const indexPath = path.join(clientDistPath, 'index.html');
  res.sendFile(indexPath, (err) => {
    if (err) {
      // If client/dist/index.html doesn't exist yet, return API welcome message
      res.json({
        name: 'SundayMatches API',
        subtitle: 'Fast, Simple & Live Cricket Scoring',
        status: 'online',
        healthCheck: '/health',
        apiDocs: '/api/matches'
      });
    }
  });
});

// Seed Initial Data Helper
async function seedInitialData() {
  try {
    const teamCount = await Team.countDocuments();
    if (teamCount === 0) {
      console.log('Seeding initial cricket teams and players...');
      
      const teamA = await Team.create({
        name: 'Royal Strikers',
        shortName: 'RS',
        primaryColor: '#16a34a'
      });

      const teamB = await Team.create({
        name: 'Thunderbolts XI',
        shortName: 'TB',
        primaryColor: '#2563eb'
      });

      // Seed Team A Players
      const playersAData = [
        { name: 'Mahesh Sharma', role: 'Batter', battingStyle: 'Right-hand bat' },
        { name: 'Reddy Kumar', role: 'Batter', battingStyle: 'Right-hand bat' },
        { name: 'Virat Sen', role: 'Batter', battingStyle: 'Right-hand bat' },
        { name: 'Rohit Verma', role: 'Batter', battingStyle: 'Right-hand bat' },
        { name: 'Dinesh Karthik', role: 'Wicketkeeper', battingStyle: 'Right-hand bat' },
        { name: 'Hardik Patel', role: 'All-rounder', battingStyle: 'Right-hand bat', bowlingStyle: 'Right-arm medium' },
        { name: 'Ravindra Jadeja', role: 'All-rounder', battingStyle: 'Left-hand bat', bowlingStyle: 'Left-arm spin' },
        { name: 'Jasprit Bumrah', role: 'Bowler', battingStyle: 'Right-hand bat', bowlingStyle: 'Right-arm fast' },
        { name: 'Mohammed Shami', role: 'Bowler', battingStyle: 'Right-hand bat', bowlingStyle: 'Right-arm fast' },
        { name: 'Kuldeep Yadav', role: 'Bowler', battingStyle: 'Left-hand bat', bowlingStyle: 'Left-arm spin' },
        { name: 'Siraj Khan', role: 'Bowler', battingStyle: 'Right-hand bat', bowlingStyle: 'Right-arm fast' }
      ];

      const playersA = await Promise.all(
        playersAData.map((p, idx) =>
          Player.create({
            ...p,
            playerId: `RS-${idx + 1}`,
            team: teamA._id
          })
        )
      );

      // Seed Team B Players
      const playersBData = [
        { name: 'David Warner', role: 'Batter', battingStyle: 'Left-hand bat' },
        { name: 'Travis Head', role: 'Batter', battingStyle: 'Left-hand bat' },
        { name: 'Steve Smith', role: 'Batter', battingStyle: 'Right-hand bat' },
        { name: 'Glenn Maxwell', role: 'All-rounder', battingStyle: 'Right-hand bat', bowlingStyle: 'Right-arm spin' },
        { name: 'Alex Carey', role: 'Wicketkeeper', battingStyle: 'Left-hand bat' },
        { name: 'Marcus Stoinis', role: 'All-rounder', battingStyle: 'Right-hand bat', bowlingStyle: 'Right-arm medium' },
        { name: 'Pat Cummins', role: 'Bowler', battingStyle: 'Right-hand bat', bowlingStyle: 'Right-arm fast' },
        { name: 'Mitchell Starc', role: 'Bowler', battingStyle: 'Left-hand bat', bowlingStyle: 'Left-arm fast' },
        { name: 'Adam Zampa', role: 'Bowler', battingStyle: 'Right-hand bat', bowlingStyle: 'Right-arm spin' },
        { name: 'Josh Hazlewood', role: 'Bowler', battingStyle: 'Left-hand bat', bowlingStyle: 'Right-arm fast' },
        { name: 'Nathan Lyon', role: 'Bowler', battingStyle: 'Right-hand bat', bowlingStyle: 'Right-arm spin' }
      ];

      const playersB = await Promise.all(
        playersBData.map((p, idx) =>
          Player.create({
            ...p,
            playerId: `TB-${idx + 1}`,
            team: teamB._id
          })
        )
      );

      // Seed a featured sample Match ready to score or view
      const sampleMatch = await Match.create({
        title: 'Sunday Super Cup 2026 - Match 1',
        series: 'Sunday Championship',
        venue: 'National Cricket Arena, Pitch 1',
        format: 'T20',
        totalOvers: 20,
        ballsPerOver: 6,
        maxOversPerBowler: 4,
        ruleMode: 'STANDARD',
        superOverEnabled: true,
        teamA: teamA._id,
        teamB: teamB._id,
        playingXI_A: playersA.map(p => p._id),
        playingXI_B: playersB.map(p => p._id),
        tossWinner: teamA._id,
        tossDecision: 'BAT',
        battingTeam: teamA._id,
        bowlingTeam: teamB._id,
        status: 'LIVE',
        currentInnings: 1,
        activeStrikerId: playersA[0]._id, // Mahesh Sharma
        activeNonStrikerId: playersA[1]._id, // Reddy Kumar
        activeBowlerId: playersB[7]._id, // Mitchell Starc
        bowlerChangeRequired: false
      });

      // Seed Innings 1 for the sample match
      await Innings.create({
        match: sampleMatch._id,
        inningsNumber: 1,
        battingTeam: teamA._id,
        bowlingTeam: teamB._id,
        totalRuns: 0,
        wickets: 0,
        legalBalls: 0,
        totalDeliveries: 0,
        oversCompleted: 0,
        ballsInCurrentOver: 0,
        battingScorecard: [
          {
            player: playersA[0]._id,
            playerName: playersA[0].name,
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
            player: playersA[1]._id,
            playerName: playersA[1].name,
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
            player: playersB[7]._id,
            playerName: playersB[7].name,
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
          batter1: playersA[0]._id,
          batter2: playersA[1]._id
        }
      });

      console.log('Seeding complete! Sample match created with ID:', sampleMatch._id);
    }
  } catch (err) {
    console.error('Seeding error:', err);
  }
}

// Database Connection & Server Initialization
const PORT = process.env.PORT || 5000;
const HOST = '0.0.0.0'; // Render requires host 0.0.0.0

async function startServer() {
  let mongoUri = process.env.MONGODB_URI;

  if (!mongoUri) {
    console.log('No MONGODB_URI provided in environment. Initializing MongoMemoryServer for local development/testing...');
    try {
      const { MongoMemoryServer } = require('mongodb-memory-server');
      const mongod = await MongoMemoryServer.create();
      mongoUri = mongod.getUri();
      console.log('In-memory MongoDB started at:', mongoUri);
    } catch (e) {
      console.warn('Could not launch MongoMemoryServer, falling back to local mongodb://127.0.0.1:27017/sundaymatches');
      mongoUri = 'mongodb://127.0.0.1:27017/sundaymatches';
    }
  }

  try {
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB successfully.');
    await seedInitialData();

    server.listen(PORT, HOST, () => {
      console.log(`===============================================`);
      console.log(`  SundayMatches Server running on http://${HOST}:${PORT}`);
      console.log(`  Health Check: http://${HOST}:${PORT}/health`);
      console.log(`  Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`===============================================`);
    });
  } catch (error) {
    console.error('Fatal MongoDB connection error:', error);
    process.exit(1);
  }
}

startServer();

module.exports = { app, server };
