const express = require("express");
const router = express.Router();
const {
  createFAQ,
  getAllFAQs,
  getFAQById,
  getPublicFAQs,
  incrementFAQView,
  updateFAQ,
  updateFAQStatus,
  deleteFAQ,
} = require("../controllers/faqController");
const {
  authenticateAdmin,
  requireAdminOrHigher,
} = require("../middleware/auth");
const { errorHandler } = require("../middleware/errorHandler");

// Public routes
/**
 * @route   GET /api/faqs/public
 * @desc    Get all active FAQs (public)
 * @access  Public
 */
router.get("/public", getPublicFAQs);

/**
 * @route   POST /api/faqs/public/:id/view
 * @desc    Increment FAQ view count when expanded (public)
 * @access  Public
 */
router.post("/public/:id/view", incrementFAQView);

// Admin routes
router.use(authenticateAdmin);
router.use(requireAdminOrHigher);

/**
 * @route   POST /api/faqs
 * @desc    Create a new FAQ
 * @access  Admin
 */
router.post("/", createFAQ);

/**
 * @route   GET /api/faqs
 * @desc    Get all FAQs with filters (admin)
 * @access  Admin
 */
router.get("/", getAllFAQs);

/**
 * @route   GET /api/faqs/:id
 * @desc    Get FAQ by ID (admin)
 * @access  Admin
 */
router.get("/:id", getFAQById);

/**
 * @route   PUT /api/faqs/:id
 * @desc    Update FAQ (admin)
 * @access  Admin
 */
router.put("/:id", updateFAQ);

/**
 * @route   PUT /api/faqs/:id/status
 * @desc    Update FAQ status (admin)
 * @access  Admin
 */
router.put("/:id/status", updateFAQStatus);

/**
 * @route   DELETE /api/faqs/:id
 * @desc    Delete FAQ (admin)
 * @access  Admin
 */
router.delete("/:id", deleteFAQ);

router.use(errorHandler);

module.exports = router;
