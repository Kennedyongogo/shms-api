const express = require("express");
const router = express.Router();
const {
  createContact,
  getAllContacts,
  getContactById,
  updateContact,
  updateContactStatus,
  deleteContact,
} = require("../controllers/contactController");
const {
  authenticateAdmin,
  requireAdminOrHigher,
} = require("../middleware/auth");
const { errorHandler } = require("../middleware/errorHandler");

// Public route
/**
 * @route   POST /api/contact
 * @desc    Create a new contact inquiry (public)
 * @access  Public
 */
router.post("/", createContact);

// Admin routes
router.use(authenticateAdmin);
router.use(requireAdminOrHigher);

/**
 * @route   GET /api/contact
 * @desc    Get all contacts with filters (admin)
 * @access  Admin
 */
router.get("/", getAllContacts);

/**
 * @route   GET /api/contact/:id
 * @desc    Get contact by ID (admin)
 * @access  Admin
 */
router.get("/:id", getContactById);

/**
 * @route   PUT /api/contact/:id
 * @desc    Update contact (admin)
 * @access  Admin
 */
router.put("/:id", updateContact);

/**
 * @route   PUT /api/contact/:id/status
 * @desc    Update contact status (admin)
 * @access  Admin
 */
router.put("/:id/status", updateContactStatus);

/**
 * @route   DELETE /api/contact/:id
 * @desc    Delete contact (admin)
 * @access  Admin
 */
router.delete("/:id", deleteContact);

router.use(errorHandler);

module.exports = router;
