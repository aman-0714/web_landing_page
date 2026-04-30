const express     = require('express');
const SiteData    = require('../models/SiteData');
const requireAuth = require('../middleware/auth');

const router = express.Router();

// ── Public keys — anyone can GET these ───────────────────────────────────────
// Every key except admin_credentials is public-readable.
const PRIVATE_KEYS = new Set(['admin_credentials']);

// GET /api/data/:key  — read one key (public)
router.get('/:key', async (req, res) => {
  const { key } = req.params;
  if (PRIVATE_KEYS.has(key)) {
    return res.status(403).json({ error: 'Forbidden.' });
  }
  try {
    const doc = await SiteData.findOne({ key });
    if (!doc) return res.status(404).json({ error: 'Key not found.', key });
    res.json({ key, value: doc.value });
  } catch (err) {
    console.error('GET /data/:key error:', err);
    res.status(500).json({ error: 'Server error.' });
  }
});

// GET /api/data  — read ALL public keys at once (public)
// Used by index.html and other pages that need multiple sections together.
router.get('/', async (req, res) => {
  try {
    const docs = await SiteData.find({ key: { $nin: [...PRIVATE_KEYS] } }).lean();
    // Convert array → { key: value } map for easy lookup on the frontend
    const result = {};
    docs.forEach(d => { result[d.key] = d.value; });
    res.json(result);
  } catch (err) {
    console.error('GET /data error:', err);
    res.status(500).json({ error: 'Server error.' });
  }
});

// PUT /api/data/:key  — upsert one key (admin only)
router.put('/:key', requireAuth, async (req, res) => {
  const { key } = req.params;
  if (PRIVATE_KEYS.has(key)) {
    return res.status(403).json({ error: 'Forbidden.' });
  }
  const { value } = req.body;
  if (value === undefined) {
    return res.status(400).json({ error: '"value" field is required in request body.' });
  }
  try {
    const doc = await SiteData.findOneAndUpdate(
      { key },
      { key, value },
      { upsert: true, new: true }
    );
    res.json({ ok: true, key: doc.key });
  } catch (err) {
    console.error('PUT /data/:key error:', err);
    res.status(500).json({ error: 'Server error.' });
  }
});

// DELETE /api/data/:key  — remove a key (admin only)
router.delete('/:key', requireAuth, async (req, res) => {
  const { key } = req.params;
  if (PRIVATE_KEYS.has(key)) {
    return res.status(403).json({ error: 'Forbidden.' });
  }
  try {
    await SiteData.deleteOne({ key });
    res.json({ ok: true });
  } catch (err) {
    console.error('DELETE /data/:key error:', err);
    res.status(500).json({ error: 'Server error.' });
  }
});

module.exports = router;
