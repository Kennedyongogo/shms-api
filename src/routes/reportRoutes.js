const express = require("express");
const { generateAnalyticsReports } = require("../controllers/reportController");

const router = express.Router();

router.get("/analytics", generateAnalyticsReports);

module.exports = router;

