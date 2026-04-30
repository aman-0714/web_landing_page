const express  = require('express');
const bcrypt   = require('bcryptjs');
const jwt      = require('jsonwebtoken');
const SiteData = require('../models/SiteData');

const router = express.Router();

// POST /api/auth/login
// Body: { username, password }
// Returns: { token }
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required.' });
    }

    // ── Fetch stored credentials from DB (falls back to .env defaults) ────────
    const credDoc = await SiteData.findOne({ key: 'admin_credentials' });

    let storedUser, storedHash;

    if (credDoc) {
      storedUser = credDoc.value.username;
      storedHash = credDoc.value.passwordHash; // bcrypt hash
    } else {
      // First-ever login: use env defaults.
      // The plain-text .env password is compared directly on this path only.
      storedUser = process.env.ADMIN_USERNAME || 'admin';
      const envPass = process.env.ADMIN_PASSWORD || 'iitb2024';

      if (username !== storedUser || password !== envPass) {
        return res.status(401).json({ error: 'Invalid credentials.' });
      }

      // Seed the credentials into the DB so future logins use bcrypt
      const hash = await bcrypt.hash(envPass, 12);
      await SiteData.findOneAndUpdate(
        { key: 'admin_credentials' },
        { key: 'admin_credentials', value: { username: storedUser, passwordHash: hash } },
        { upsert: true }
      );

      const token = jwt.sign({ username: storedUser }, process.env.JWT_SECRET, { expiresIn: '8h' });
      return res.json({ token });
    }

    // Normal path: check username + bcrypt password
    if (username !== storedUser) {
      return res.status(401).json({ error: 'Invalid credentials.' });
    }

    const valid = await bcrypt.compare(password, storedHash);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid credentials.' });
    }

    const token = jwt.sign({ username }, process.env.JWT_SECRET, { expiresIn: '8h' });
    res.json({ token });

  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Server error during login.' });
  }
});

// POST /api/auth/change-password  (protected — requires JWT)
// Body: { newUsername, newPassword }
const requireAuth = require('../middleware/auth');
router.post('/change-password', requireAuth, async (req, res) => {
  try {
    const { newUsername, newPassword } = req.body;
    if (!newUsername || !newPassword) {
      return res.status(400).json({ error: 'newUsername and newPassword are required.' });
    }
    const hash = await bcrypt.hash(newPassword, 12);
    await SiteData.findOneAndUpdate(
      { key: 'admin_credentials' },
      { key: 'admin_credentials', value: { username: newUsername, passwordHash: hash } },
      { upsert: true }
    );
    res.json({ ok: true });
  } catch (err) {
    console.error('Change password error:', err);
    res.status(500).json({ error: 'Server error.' });
  }
});

module.exports = router;
