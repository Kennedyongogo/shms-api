const express = require("express");
const router = express.Router();
const {
  createConsultation,
  getAllConsultations,
  getConsultationById,
  updateConsultation,
  updateConsultationStatus,
  deleteConsultation,
} = require("../controllers/consultationController");
const {
  authenticateAdmin,
  requireAdminOrHigher,
} = require("../middleware/auth");
const { errorHandler } = require("../middleware/errorHandler");

// Public route
/**
 * @route   POST /api/consultation
 * @desc    Create a new consultation booking (public)
 * @access  Public
 */
router.post("/", createConsultation);

// Admin routes
router.use(authenticateAdmin);
router.use(requireAdminOrHigher);

/**
 * @route   GET /api/consultation
 * @desc    Get all consultations with filters (admin)
 * @access  Admin
 */
router.get("/", getAllConsultations);

/**
 * @route   GET /api/consultation/:id
 * @desc    Get consultation by ID (admin)
 * @access  Admin
 */
router.get("/:id", getConsultationById);

/**
 * @route   PUT /api/consultation/:id
 * @desc    Update consultation (admin)
 * @access  Admin
 */
router.put("/:id", updateConsultation);

/**
 * @route   PUT /api/consultation/:id/status
 * @desc    Update consultation status (admin)
 * @access  Admin
 */
router.put("/:id/status", updateConsultationStatus);

/**
 * @route   DELETE /api/consultation/:id
 * @desc    Delete consultation (admin)
 * @access  Admin
 */
router.delete("/:id", deleteConsultation);

router.use(errorHandler);

module.exports = router;
