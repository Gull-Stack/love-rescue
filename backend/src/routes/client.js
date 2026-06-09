const express = require('express');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

/**
 * Consumer-facing "My Therapist" endpoints (Settings → My Therapist).
 *
 * Therapist<->client LINKING is not wired yet (the therapist console is a
 * deferred feature), so no consumer can have a linked therapist. These
 * endpoints therefore return empty results for authenticated users — which is
 * the correct state today and replaces the 404s the frontend was logging on
 * every Settings load.
 *
 * When the therapist console is built, swap these for real queries against the
 * therapist-link model (and implement the PATCH/DELETE permission routes the
 * frontend already calls).
 */

// GET /api/client/therapists -> { therapists: [] }
router.get('/therapists', authenticate, (req, res) => {
  res.json({ therapists: [] });
});

// GET /api/client/therapist-sharing-history -> { entries: [], total: 0 }
router.get('/therapist-sharing-history', authenticate, (req, res) => {
  res.json({ entries: [], total: 0 });
});

module.exports = router;
