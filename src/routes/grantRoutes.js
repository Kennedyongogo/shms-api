const express = require("express");
const router = express.Router();
const {
  createGrant,
  getAllGrants,
  getGrantById,
  getPublicGrants,
  updateGrant,
  deleteGrant,
} = require("../controllers/grantController");
const {
  authenticateAdmin,
  requireAdminOrHigher,
} = require("../middleware/auth");
const { uploadGrantImage, handleUploadError } = require("../middleware/upload");
const { errorHandler } = require("../middleware/errorHandler");

// Public routes
/**
 * @route   GET /api/grants/public
 * @desc    Get all active grants (public)
 * @access  Public
 */
router.get("/public", getPublicGrants);

// Admin routes
router.use(authenticateAdmin);
router.use(requireAdminOrHigher);

/**
 * @route   POST /api/grants
 * @desc    Create a new grant
 * @access  Admin
 */
router.post("/", uploadGrantImage, handleUploadError, createGrant);

/**
 * @route   GET /api/grants
 * @desc    Get all grants with filters (admin)
 * @access  Admin
 */
router.get("/", getAllGrants);

/**
 * @route   GET /api/grants/:id
 * @desc    Get grant by ID (admin)
 * @access  Admin
 */
router.get("/:id", getGrantById);

/**
 * @route   PUT /api/grants/:id
 * @desc    Update grant (admin)
 * @access  Admin
 */
router.put("/:id", uploadGrantImage, handleUploadError, updateGrant);

/**
 * @route   DELETE /api/grants/:id
 * @desc    Delete grant (admin)
 * @access  Admin
 */
router.delete("/:id", deleteGrant);

router.use(errorHandler);

module.exports = router;
