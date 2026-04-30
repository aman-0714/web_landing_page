/**
 * api.js — shared helper used by every public page AND the admin dashboard.
 * All data is stored in MongoDB via the backend. Nothing is stored in localStorage.
 *
 * HOW IT WORKS:
 *   - Public pages call  API.get('profile')   → returns the saved value
 *   - Admin dashboard calls  API.save('profile', data)  → writes to DB
 *   - Token (JWT) is kept in sessionStorage only for the admin session
 */

const API = (() => {
  // ── Change this ONE line when you deploy to a real server ──────────────────
  // During local development with "node server.js" it is http://localhost:3000
  // On Render / any host, set it to your deployed URL e.g. https://yourapp.onrender.com
  const BASE = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://localhost:3000'
    : window.location.origin; // same origin when deployed

  function token() { return sessionStorage.getItem('adminToken') || ''; }

  /** Fetch a value from the database. Returns the value or null. */
  async function get(key) {
    try {
      const res = await fetch(`${BASE}/api/data/${key}`);
      if (!res.ok) return null;
      const json = await res.json();
      return json.value ?? null;
    } catch (e) {
      console.warn('API.get failed', key, e);
      return null;
    }
  }

  /** Fetch ALL public data at once (used by pages that need multiple sections). */
  async function getAll() {
    try {
      const res = await fetch(`${BASE}/api/data`);
      if (!res.ok) return {};
      return await res.json();
    } catch (e) {
      console.warn('API.getAll failed', e);
      return {};
    }
  }

  /** Save a value to the database (admin only — needs JWT). */
  async function save(key, value) {
    const res = await fetch(`${BASE}/api/data/${key}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token()}`
      },
      body: JSON.stringify({ value })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `Save failed (${res.status})`);
    }
    return res.json();
  }

  /** Login — stores the JWT in sessionStorage on success. */
  async function login(username, password) {
    const res = await fetch(`${BASE}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Login failed');
    sessionStorage.setItem('adminToken', json.token);
    sessionStorage.setItem('adminLoggedIn', 'true');
    return json;
  }

  function logout() {
    sessionStorage.removeItem('adminToken');
    sessionStorage.removeItem('adminLoggedIn');
  }

  function isLoggedIn() {
    return !!sessionStorage.getItem('adminToken');
  }

  return { get, getAll, save, login, logout, isLoggedIn, BASE };
})();
