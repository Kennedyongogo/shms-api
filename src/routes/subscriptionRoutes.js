const express = require("express");
const { authenticateUser } = require("../middleware/auth");
const { extendSubscription, getStatus } = require("../controllers/subscriptionController");

const router = express.Router();

router.get("/status", authenticateUser, getStatus);
router.post("/extend", authenticateUser, extendSubscription);

module.exports = router;
