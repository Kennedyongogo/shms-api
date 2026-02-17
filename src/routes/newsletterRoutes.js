const express = require("express");
const router = express.Router();
const {
  subscribe,
  getAllSubscribers,
  getSubscriberById,
  updateStatus,
  deleteSubscriber,
} = require("../controllers/newsletterController");
const {
  authenticateAdmin,
  requireAdminOrHigher,
} = require("../middleware/auth");
const { errorHandler } = require("../middleware/errorHandler");

// Public route
/**
 * @route   POST /api/newsletter
 * @desc    Subscribe to newsletter (public)
 * @access  Public
 */
router.post("/", subscribe);

// Admin routes
router.use(authenticateAdmin);
router.use(requireAdminOrHigher);

/**
 * @route   GET /api/newsletter
 * @desc    Get all newsletter subscribers (admin)
 * @access  Admin
 */
router.get("/", getAllSubscribers);

/**
 * @route   GET /api/newsletter/:id
 * @desc    Get subscriber by ID (admin)
 * @access  Admin
 */
router.get("/:id", getSubscriberById);

/**
 * @route   PUT /api/newsletter/:id/status
 * @desc    Update subscriber status (admin)
 * @access  Admin
 */
router.put("/:id/status", updateStatus);

/**
 * @route   DELETE /api/newsletter/:id
 * @desc    Delete subscriber (admin)
 * @access  Admin
 */
router.delete("/:id", deleteSubscriber);

router.use(errorHandler);

module.exports = router;
