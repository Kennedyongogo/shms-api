const express = require("express");
const router = express.Router();
const {
  createPartner,
  getAllPartners,
  getPartnerById,
  getPublicPartners,
  updatePartner,
  deletePartner,
} = require("../controllers/partnerController");
const {
  authenticateAdmin,
  requireAdminOrHigher,
} = require("../middleware/auth");
const { uploadPartnerLogo, handleUploadError } = require("../middleware/upload");
const { errorHandler } = require("../middleware/errorHandler");

// Public routes
/**
 * @route   GET /api/partners/public
 * @desc    Get all active partners (public)
 * @access  Public
 */
router.get("/public", getPublicPartners);

// Admin routes
router.use(authenticateAdmin);
router.use(requireAdminOrHigher);

/**
 * @route   POST /api/partners
 * @desc    Create a new partner
 * @access  Admin
 */
router.post("/", uploadPartnerLogo, handleUploadError, createPartner);

/**
 * @route   GET /api/partners
 * @desc    Get all partners with filters (admin)
 * @access  Admin
 */
router.get("/", getAllPartners);

/**
 * @route   GET /api/partners/:id
 * @desc    Get partner by ID (admin)
 * @access  Admin
 */
router.get("/:id", getPartnerById);

/**
 * @route   PUT /api/partners/:id
 * @desc    Update partner (admin)
 * @access  Admin
 */
router.put("/:id", uploadPartnerLogo, handleUploadError, updatePartner);

/**
 * @route   DELETE /api/partners/:id
 * @desc    Delete partner (admin)
 * @access  Admin
 */
router.delete("/:id", deletePartner);

router.use(errorHandler);

module.exports = router;
