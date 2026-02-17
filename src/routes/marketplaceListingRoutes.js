const express = require("express");
const router = express.Router();
const {
  createListing,
  getMyListings,
  getPublicListings,
  getListingById,
  updateListing,
  deleteListing,
  deleteListingAdmin,
  getListingsForAdmin,
  approveListing,
  rejectListing,
  getMarketplaceStats,
} = require("../controllers/marketplaceListingController");
const { authenticateMarketplace, authenticateAdmin, optionalAuthenticateMarketplace } = require("../middleware/auth");
const { uploadListingImage, handleUploadError } = require("../middleware/upload");

// User (marketplace authenticated). Listing image: multipart form with listing_image file (stored as path like project).
router.post("/listings", authenticateMarketplace, uploadListingImage, handleUploadError, createListing);
router.get("/listings/my", authenticateMarketplace, getMyListings);
router.get("/listings/public", getPublicListings);
router.get("/listings/:id", optionalAuthenticateMarketplace, getListingById);
router.patch("/listings/:id", authenticateMarketplace, uploadListingImage, handleUploadError, updateListing);
router.delete("/listings/:id", authenticateMarketplace, deleteListing);

// Admin
router.get("/admin/stats", authenticateAdmin, getMarketplaceStats);
router.get("/admin/listings", authenticateAdmin, getListingsForAdmin);
router.patch("/admin/listings/:id/approve", authenticateAdmin, approveListing);
router.patch("/admin/listings/:id/reject", authenticateAdmin, rejectListing);
router.delete("/admin/listings/:id", authenticateAdmin, deleteListingAdmin);

module.exports = router;
