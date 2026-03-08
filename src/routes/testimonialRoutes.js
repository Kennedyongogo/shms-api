const express = require("express");
const testimonialController = require("../controllers/testimonialController");
const { authenticateUser } = require("../middleware/auth");

const router = express.Router();

// Public (no auth): list approved testimonials, submit a review
router.get("/", testimonialController.getApproved);
router.post("/", testimonialController.create);

// Optional admin: full list, get by id, update, delete
router.get("/all", authenticateUser, testimonialController.getAll);
router.get("/:id", testimonialController.getById);
router.put("/:id", authenticateUser, testimonialController.update);
router.delete("/:id", authenticateUser, testimonialController.remove);

module.exports = router;
