const mongoose = require('mongoose');

// One collection: sitedata
// Each document is { key: String, value: Mixed }
// e.g. { key: "profile",   value: { name, title, dept, ... } }
//      { key: "pubs_journal", value: [ {...}, {...} ] }
const siteDataSchema = new mongoose.Schema(
  {
    key:   { type: String, required: true, unique: true, index: true },
    value: { type: mongoose.Schema.Types.Mixed, required: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('SiteData', siteDataSchema);
