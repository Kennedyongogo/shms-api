const express = require("express");
const router = express.Router();
const {
  createService,
  getAllServices,
  getServiceById,
  getPublicServices,
  getPublicServiceBySlug,
  getKeyServices,
  updateService,
  updateServiceStatus,
  deleteService,
} = require("../controllers/serviceController");
const {
  authenticateAdmin,
  requireAdminOrHigher,
} = require("../middleware/auth");
const { uploadServiceImage, handleUploadError } = require("../middleware/upload");
const { errorHandler } = require("../middleware/errorHandler");

// Public routes
/**
 * @route   GET /api/services/public
 * @desc    Get all published services (public)
 * @access  Public
 */
router.get("/public", getPublicServices);

/**
 * @route   GET /api/services/public/key
 * @desc    Get key services for home page (public)
 * @access  Public
 */
router.get("/public/key", getKeyServices);

/**
 * @route   GET /api/services/public/:slug
 * @desc    Get single service by slug (public)
 * @access  Public
 */
router.get("/public/:slug", getPublicServiceBySlug);

// Admin routes
router.use(authenticateAdmin);
router.use(requireAdminOrHigher);

/**
 * @route   POST /api/services
 * @desc    Create a new service
 * @access  Admin
 */
router.post("/", uploadServiceImage, handleUploadError, createService);

/**
 * @route   GET /api/services
 * @desc    Get all services with filters (admin)
 * @access  Admin
 */
router.get("/", getAllServices);

/**
 * @route   GET /api/services/:id
 * @desc    Get service by ID (admin)
 * @access  Admin
 */
router.get("/:id", getServiceById);

/**
 * @route   PUT /api/services/:id
 * @desc    Update service (admin)
 * @access  Admin
 */
router.put("/:id", uploadServiceImage, handleUploadError, updateService);

/**
 * @route   PUT /api/services/:id/status
 * @desc    Update service status (admin)
 * @access  Admin
 */
router.put("/:id/status", updateServiceStatus);

/**
 * @route   DELETE /api/services/:id
 * @desc    Delete service (admin)
 * @access  Admin
 */
router.delete("/:id", deleteService);

router.use(errorHandler);

module.exports = router;
