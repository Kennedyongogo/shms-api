const express = require("express");
const router = express.Router();
const {
  applyForGrant,
  saveDraftApplication,
  getUserApplications,
  withdrawApplication,
  getAllGrantApplications,
  getGrantApplications,
  updateApplicationStatus,
} = require("../controllers/grantApplicationController");
const {
  authenticateAdmin,
  requireAdminOrHigher,
  authenticateMarketplace,
} = require("../middleware/auth");
const { errorHandler } = require("../middleware/errorHandler");

// Marketplace user routes
/**
 * @route   POST /api/grant-applications
 * @desc    Apply for a grant
 * @access  Marketplace User
 */
router.post("/", authenticateMarketplace, applyForGrant);

/**
 * @route   POST /api/grant-applications/draft
 * @desc    Save draft application
 * @access  Marketplace User
 */
router.post("/draft", authenticateMarketplace, saveDraftApplication);

/**
 * @route   GET /api/grant-applications/my-applications
 * @desc    Get current user's applications
 * @access  Marketplace User
 */
router.get("/my-applications", authenticateMarketplace, getUserApplications);

/**
 * @route   PUT /api/grant-applications/:id/withdraw
 * @desc    Withdraw application
 * @access  Marketplace User
 */
router.put("/:id/withdraw", authenticateMarketplace, withdrawApplication);

// Admin routes
router.use(authenticateAdmin);
router.use(requireAdminOrHigher);

/**
 * @route   GET /api/grant-applications
 * @desc    Get all grant applications (paginated, optional status filter)
 * @access  Admin
 */
router.get("/", getAllGrantApplications);

/**
 * @route   GET /api/grant-applications/grant/:grantId
 * @desc    Get all applications for a grant
 * @access  Admin
 */
router.get("/grant/:grantId", getGrantApplications);

/**
 * @route   PUT /api/grant-applications/:id/status
 * @desc    Update application status
 * @access  Admin
 */
router.put("/:id/status", updateApplicationStatus);

router.use(errorHandler);

module.exports = router;
