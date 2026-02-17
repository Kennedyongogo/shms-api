const express = require("express");
const router = express.Router();
const {
  createQuoteRequest,
  getAllQuoteRequests,
  getQuoteRequestById,
  updateQuoteRequest,
  updateQuoteRequestStatus,
  deleteQuoteRequest,
} = require("../controllers/quoteRequestController");
const {
  authenticateAdmin,
  requireAdminOrHigher,
} = require("../middleware/auth");
const { errorHandler } = require("../middleware/errorHandler");

// Public route
/**
 * @route   POST /api/quote
 * @desc    Create a new quote request (public)
 * @access  Public
 */
router.post("/", createQuoteRequest);

// Admin routes
router.use(authenticateAdmin);
router.use(requireAdminOrHigher);

/**
 * @route   GET /api/quote
 * @desc    Get all quote requests with filters (admin)
 * @access  Admin
 */
router.get("/", getAllQuoteRequests);

/**
 * @route   GET /api/quote/:id
 * @desc    Get quote request by ID (admin)
 * @access  Admin
 */
router.get("/:id", getQuoteRequestById);

/**
 * @route   PUT /api/quote/:id
 * @desc    Update quote request (admin)
 * @access  Admin
 */
router.put("/:id", updateQuoteRequest);

/**
 * @route   PUT /api/quote/:id/status
 * @desc    Update quote request status (admin)
 * @access  Admin
 */
router.put("/:id/status", updateQuoteRequestStatus);

/**
 * @route   DELETE /api/quote/:id
 * @desc    Delete quote request (admin)
 * @access  Admin
 */
router.delete("/:id", deleteQuoteRequest);

router.use(errorHandler);

module.exports = router;
