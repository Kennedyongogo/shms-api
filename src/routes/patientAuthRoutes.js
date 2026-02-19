const express = require("express");
const { authenticatePatient } = require("../middleware/auth");
const patientAuthController = require("../controllers/patientAuthController");

const router = express.Router();

router.post("/register", patientAuthController.register);
router.post("/login", patientAuthController.login);
router.get("/me", authenticatePatient, patientAuthController.me);
router.post("/logout", patientAuthController.logout);

module.exports = router;

