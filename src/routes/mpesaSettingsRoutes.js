const express = require("express");
const {
  getCurrentSettings,
  upsertCurrentSettings,
  testCurrentSettings,
} = require("../controllers/mpesaSettingsController");

const router = express.Router();

// Get M-Pesa settings for the current hospital
router.get("/", getCurrentSettings);

// Create or update M-Pesa settings for the current hospital
router.post("/", upsertCurrentSettings);

// Test connection (Daraja OAuth) for the current hospital's settings
router.post("/test", testCurrentSettings);

module.exports = router;

