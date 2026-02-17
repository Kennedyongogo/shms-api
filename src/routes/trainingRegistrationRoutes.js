const express = require("express");
const router = express.Router();
const {
  registerForTraining,
  getUserRegistrations,
  cancelRegistration,
  getAllRegistrations,
  getTrainingEventRegistrations,
  updateRegistrationStatus,
} = require("../controllers/trainingRegistrationController");
const {
  authenticateAdmin,
  requireAdminOrHigher,
  authenticateMarketplace,
} = require("../middleware/auth");
const { errorHandler } = require("../middleware/errorHandler");

// Marketplace user routes
/**
 * @route   POST /api/training-registrations
 * @desc    Register for a training event
 * @access  Marketplace User
 */
router.post("/", authenticateMarketplace, registerForTraining);

/**
 * @route   GET /api/training-registrations/my-registrations
 * @desc    Get current user's registrations
 * @access  Marketplace User
 */
router.get("/my-registrations", authenticateMarketplace, getUserRegistrations);

/**
 * @route   PUT /api/training-registrations/:id/cancel
 * @desc    Cancel registration
 * @access  Marketplace User
 */
router.put("/:id/cancel", authenticateMarketplace, cancelRegistration);

// Admin routes
router.use(authenticateAdmin);
router.use(requireAdminOrHigher);

/**
 * @route   GET /api/training-registrations
 * @desc    Get all registrations (paginated, optional status filter)
 * @access  Admin
 */
router.get("/", getAllRegistrations);

/**
 * @route   GET /api/training-registrations/training-event/:trainingEventId
 * @desc    Get all registrations for a training event
 * @access  Admin
 */
router.get("/training-event/:trainingEventId", getTrainingEventRegistrations);

/**
 * @route   PUT /api/training-registrations/:id/status
 * @desc    Update registration status
 * @access  Admin
 */
router.put("/:id/status", updateRegistrationStatus);

router.use(errorHandler);

module.exports = router;
