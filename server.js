require("dotenv").config();
const express    = require("express");
const mongoose   = require("mongoose");
const cors       = require("cors");
const multer     = require("multer");
const cloudinary = require("cloudinary").v2;
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const path       = require("path");

const app  = express();
const PORT = process.env.PORT || 3000;

// ── Middleware ────────────────────────────────────────────────
app.use(cors());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// ── Serve all your HTML/CSS/JS files as static ───────────────
// This replaces Netlify — Render serves your static files AND the API
app.use(express.static(path.join(__dirname)));

// ── Cloudinary config ─────────────────────────────────────────
cloudinary.config({
  cloud_name : process.env.CLOUDINARY_CLOUD_NAME,
  api_key    : process.env.CLOUDINARY_API_KEY,
  api_secret : process.env.CLOUDINARY_API_SECRET,
});

const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder          : "nitj_website",
    allowed_formats : ["jpg", "jpeg", "png", "webp", "gif"],
    transformation  : [{ quality: "auto", fetch_format: "auto" }],
  },
});
const upload = multer({ storage });

// ── MongoDB connection ────────────────────────────────────────
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log("✅ MongoDB connected"))
  .catch(err => { console.error("❌ MongoDB error:", err); process.exit(1); });

// ══════════════════════════════════════════════════════════════
// MONGOOSE SCHEMAS
// ══════════════════════════════════════════════════════════════

// Gallery photos shown on students.html
const PhotoSchema = new mongoose.Schema({
  eventName : { type: String, default: "Student Event" },
  desc      : { type: String, default: "" },
  imageUrl  : { type: String, required: true }, // Cloudinary URL
  publicId  : { type: String },                 // Cloudinary public_id for deletion
  createdAt : { type: Date, default: Date.now },
});
const Photo = mongoose.model("Photo", PhotoSchema);

// All other site content stored as key-value pairs
const ContentSchema = new mongoose.Schema({
  key   : { type: String, unique: true, required: true },
  value : { type: mongoose.Schema.Types.Mixed },
});
const Content = mongoose.model("Content", ContentSchema);

// ── Helper functions ──────────────────────────────────────────
async function setContent(key, value) {
  await Content.findOneAndUpdate({ key }, { value }, { upsert: true, new: true });
}
async function getContent(key, defaultVal = null) {
  const doc = await Content.findOne({ key });
  return doc ? doc.value : defaultVal;
}

// ══════════════════════════════════════════════════════════════
// AUTH MIDDLEWARE — admin routes need the correct password header
// ══════════════════════════════════════════════════════════════
function adminAuth(req, res, next) {
  const token = req.headers["x-admin-token"];
  if (token && token === process.env.ADMIN_PASSWORD) return next();
  return res.status(401).json({ error: "Unauthorized" });
}

// ══════════════════════════════════════════════════════════════
// API ROUTES
// ══════════════════════════════════════════════════════════════

// ── Admin Login ───────────────────────────────────────────────
app.post("/api/login", (req, res) => {
  const { username, password } = req.body;
  if (
    username === process.env.ADMIN_USERNAME &&
    password === process.env.ADMIN_PASSWORD
  ) {
    // Return the password as the session token (stored in sessionStorage)
    return res.json({ ok: true, token: password });
  }
  return res.status(401).json({ ok: false, error: "Invalid credentials" });
});

// ── Gallery Photos (PUBLIC read) ──────────────────────────────
app.get("/api/photos", async (req, res) => {
  try {
    const photos = await Photo.find().sort({ createdAt: -1 });
    res.json({ photos });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST new photo (admin only) — image file goes to Cloudinary
app.post("/api/photos", adminAuth, upload.single("image"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No image uploaded" });
    const photo = await Photo.create({
      eventName : req.body.eventName || "Student Event",
      desc      : req.body.desc || "",
      imageUrl  : req.file.path,     // Full Cloudinary URL
      publicId  : req.file.filename, // e.g. "nitj_website/abc123"
    });
    res.json({ ok: true, photo });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// DELETE a photo (admin only) — removes from MongoDB + Cloudinary
app.delete("/api/photos/:id", adminAuth, async (req, res) => {
  try {
    const photo = await Photo.findById(req.params.id);
    if (!photo) return res.status(404).json({ error: "Not found" });
    if (photo.publicId) await cloudinary.uploader.destroy(photo.publicId);
    await photo.deleteOne();
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── Site Content (profile, publications, students, etc.) ─────

// GET single key (public)
app.get("/api/content/:key", async (req, res) => {
  try {
    const value = await getContent(req.params.key);
    res.json({ key: req.params.key, value });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST/update single key (admin only)
app.post("/api/content/:key", adminAuth, async (req, res) => {
  try {
    await setContent(req.params.key, req.body.value);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST bulk save multiple keys at once (admin only)
app.post("/api/save-all", adminAuth, async (req, res) => {
  try {
    const ops = Object.entries(req.body).map(([key, value]) =>
      Content.findOneAndUpdate({ key }, { value }, { upsert: true, new: true })
    );
    await Promise.all(ops);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET all site content in one request (for fast page loads)
app.get("/api/all-content", async (req, res) => {
  try {
    const docs = await Content.find();
    const result = {};
    docs.forEach(d => { result[d.key] = d.value; });
    res.json(result);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── Health check ──────────────────────────────────────────────
app.get("/api/health", (req, res) => res.json({ ok: true, time: new Date() }));

// ── Serve index.html for all non-API routes ───────────────────
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

// ── Start ─────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});