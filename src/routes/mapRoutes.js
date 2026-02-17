const express = require("express");
const router = express.Router();
const { getMapLocations } = require("../controllers/mapController");
const { authenticateAdmin } = require("../middleware/auth");

/**
 * GET /api/map/locations
 * All map points (projects, training events, marketplace users with lat/long).
 * For users, category = role (farmer, veterinarian, etc.).
 * Admin only.
 */
router.get("/locations", authenticateAdmin, getMapLocations);

module.exports = router;
