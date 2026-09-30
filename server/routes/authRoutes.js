const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const User = require('../models/User');

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { username = 'admin', password } = req.body;
    const configuredAdminPassword = process.env.ADMIN_PASSWORD || 'admin123';
    const jwtSecret = process.env.JWT_SECRET || 'sundaymatches_super_secret_jwt_key_2026';

    if (!password) {
      return res.status(400).json({ success: false, message: 'Password is required' });
    }

    // Check against DB user first, if not found or matched, check against process.env.ADMIN_PASSWORD
    let user = await User.findOne({ username: username.toLowerCase() });
    let isMatch = false;

    if (user) {
      isMatch = await user.comparePassword(password);
    } else {
      // If user doesn't exist yet, check against configured admin password
      if (password === configuredAdminPassword) {
        // Create the admin user in DB for future
        const hashedPassword = await bcrypt.hash(password, 10);
        user = new User({
          username: username.toLowerCase(),
          password: hashedPassword,
          role: 'admin'
        });
        await user.save();
        isMatch = true;
      }
    }

    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid admin credentials' });
    }

    // Generate JWT
    const token = jwt.sign(
      { id: user ? user._id : 'admin-master', username: user ? user.username : 'admin', role: 'admin' },
      jwtSecret,
      { expiresIn: '7d' }
    );

    return res.json({
      success: true,
      token,
      user: {
        username: user ? user.username : 'admin',
        role: 'admin'
      },
      message: 'Logged in successfully'
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ success: false, message: 'Server error during login' });
  }
});

// GET /api/auth/verify
router.get('/verify', (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, authenticated: false });
  }
  const token = authHeader.split(' ')[1];
  try {
    const jwtSecret = process.env.JWT_SECRET || 'sundaymatches_super_secret_jwt_key_2026';
    const decoded = jwt.verify(token, jwtSecret);
    return res.json({ success: true, authenticated: true, user: decoded });
  } catch (err) {
    return res.status(401).json({ success: false, authenticated: false, message: 'Token expired or invalid' });
  }
});

module.exports = router;
