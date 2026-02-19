const express = require("express");
const { authenticateUser } = require("../middleware/auth");
const { login, logout, register, resetPassword, bootstrapPromoteMe } = require("../controllers/authController");

const router = express.Router();

router.post("/register", register);
router.post("/login", login);
router.post("/logout", logout);
router.post("/reset-password", resetPassword);
router.post("/bootstrap/promote-me", authenticateUser, bootstrapPromoteMe);

module.exports = router;

