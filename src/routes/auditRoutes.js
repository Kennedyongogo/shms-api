const express = require("express");
const { viewLogs } = require("../controllers/auditController");

const router = express.Router();

router.get("/", viewLogs);

module.exports = router;

