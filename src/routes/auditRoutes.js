const express = require("express");
const { viewLogs, viewOneLog } = require("../controllers/auditController");

const router = express.Router();

router.get("/", viewLogs);
router.get("/:id", viewOneLog);

module.exports = router;

