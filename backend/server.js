require('dotenv').config();
const express    = require('express');
const mongoose   = require('mongoose');
const cors       = require('cors');
const path       = require('path');

const authRouter = require('./routes/auth');
const dataRouter = require('./routes/data');

const app  = express();
const PORT = process.env.PORT || 3000;

// ── CORS ─────────────────────────────────────────────────────────────────────
// Allow requests from the frontend origin (set FRONTEND_URL in .env).
// Also allow Render's preview URLs and local dev automatically.
const allowedOrigins = [
  process.env.FRONTEND_URL,
  'http://localhost:5500',
  'http://127.0.0.1:5500',
  'http://localhost:3000',
  'http://127.0.0.1:3000',
].filter(Boolean);

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no Origin header (e.g. curl, Postman, same-origin)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin) || origin.endsWith('.onrender.com')) {
      return callback(null, true);
    }
    callback(new Error('Not allowed by CORS: ' + origin));
  },
  credentials: true,
}));

app.use(express.json({ limit: '20mb' })); // large limit for base64 images

// ── Serve static HTML files (the existing website) ───────────────────────────
// This lets Render serve both the API and the HTML from one service.
app.use(express.static(path.join(__dirname, '..')));

// ── Routes ───────────────────────────────────────────────────────────────────
app.use('/api/auth', authRouter);
app.use('/api/data', dataRouter);

// Health-check — Render pings this to confirm the service is up
app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));

// Catch-all: serve index.html for any unmatched route (SPA-style)
app.get('*', (_req, res) => {
  res.sendFile(path.join(__dirname, '..', 'index.html'));
});

// ── MongoDB connection + server start ─────────────────────────────────────────
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log('✅  MongoDB connected');
    app.listen(PORT, () => console.log(`🚀  Server running on port ${PORT}`));
  })
  .catch(err => {
    console.error('❌  MongoDB connection error:', err.message);
    process.exit(1);
  });
