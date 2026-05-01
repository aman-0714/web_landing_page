const express    = require('express');
const cloudinary = require('cloudinary').v2;
const requireAuth = require('../middleware/auth');

const router = express.Router();

// Configure Cloudinary from env vars
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// POST /api/upload  — upload a base64 image to Cloudinary, return URL
// Admin only
router.post('/', requireAuth, async (req, res) => {
  const { data, folder } = req.body; // data = base64 string, folder = optional subfolder
  if (!data) return res.status(400).json({ error: '"data" field is required.' });

  try {
    const result = await cloudinary.uploader.upload(data, {
      folder: folder || 'faculty-site',
      transformation: [
        { width: 800, height: 800, crop: 'limit' }, // max size
        { quality: 'auto:good' },                   // auto compress
        { fetch_format: 'auto' }                    // serve webp/avif when supported
      ]
    });
    res.json({ ok: true, url: result.secure_url, publicId: result.public_id });
  } catch (err) {
    console.error('Cloudinary upload error:', err);
    res.status(500).json({ error: 'Image upload failed: ' + err.message });
  }
});

module.exports = router;
