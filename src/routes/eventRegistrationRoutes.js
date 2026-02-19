const express = require("express");
const eventRegistrationController = require("../controllers/eventRegistrationController");
const { authenticateUser } = require("../middleware/auth");

const router = express.Router();

router.post("/register", eventRegistrationController.registerForEvent);
router.patch("/:id/check-in", authenticateUser, eventRegistrationController.checkInAttendee);

module.exports = router;

