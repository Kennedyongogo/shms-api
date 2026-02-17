const express = require("express");
const router = express.Router();
const {
  createTrainingEvent,
  getAllTrainingEvents,
  getTrainingEventById,
  getPublicTrainingEvents,
  updateTrainingEvent,
  deleteTrainingEvent,
} = require("../controllers/trainingEventController");
const {
  authenticateAdmin,
  requireAdminOrHigher,
  authenticateMarketplace,
} = require("../middleware/auth");
const { uploadTrainingEventImage, handleUploadError } = require("../middleware/upload");
const { errorHandler } = require("../middleware/errorHandler");

// Public routes
/**
 * @route   GET /api/training-events/public
 * @desc    Get all active training events (public)
 * @access  Public
 */
router.get("/public", getPublicTrainingEvents);

// Admin routes
router.use(authenticateAdmin);
router.use(requireAdminOrHigher);

/**
 * @route   POST /api/training-events
 * @desc    Create a new training event
 * @access  Admin
 */
router.post("/", uploadTrainingEventImage, handleUploadError, createTrainingEvent);

/**
 * @route   GET /api/training-events
 * @desc    Get all training events with filters (admin)
 * @access  Admin
 */
router.get("/", getAllTrainingEvents);

/**
 * @route   GET /api/training-events/:id
 * @desc    Get training event by ID (admin)
 * @access  Admin
 */
router.get("/:id", getTrainingEventById);

/**
 * @route   PUT /api/training-events/:id
 * @desc    Update training event (admin)
 * @access  Admin
 */
router.put("/:id", uploadTrainingEventImage, handleUploadError, updateTrainingEvent);

/**
 * @route   DELETE /api/training-events/:id
 * @desc    Delete training event (admin)
 * @access  Admin
 */
router.delete("/:id", deleteTrainingEvent);

router.use(errorHandler);

module.exports = router;
