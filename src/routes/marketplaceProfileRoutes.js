const express = require("express");
const router = express.Router();
const {
  getMe,
  completeProfile,
  uploadProfilePhoto,
  getPublicFarmers,
  getPublicVeterinarians,
  getPublicInputSuppliers,
  submitFeedFormulationRequest,
  getFeedFormulationRequests,
  updateFeedFormulationRequest,
  getAllMarketplaceUsers,
  updateMarketplaceUser,
  deleteMarketplaceUser,
} = require("../controllers/marketplaceProfileController");
const { authenticateMarketplace, authenticateAdmin, optionalAuthenticateMarketplace } = require("../middleware/auth");
const { uploadMarketplaceProfilePhoto, handleUploadError } = require("../middleware/upload");

router.get("/me", authenticateMarketplace, getMe);
router.put("/complete", authenticateMarketplace, completeProfile);
router.post("/upload-photo", authenticateMarketplace, uploadMarketplaceProfilePhoto, handleUploadError, uploadProfilePhoto);

// Public: list farmers for Farmers Hub, veterinarians for Veterinary Services (no auth)
router.get("/public/farmers", getPublicFarmers);
router.get("/public/veterinarians", getPublicVeterinarians);
router.get("/public/input-suppliers", getPublicInputSuppliers);

// Public: submit custom feed formulation request (Inputs & Feeds; optional auth to attach user)
router.post("/public/feed-formulation-request", optionalAuthenticateMarketplace, submitFeedFormulationRequest);

// Admin only: feed formulation requests (list + update)
router.get("/feed-formulation-requests", authenticateAdmin, getFeedFormulationRequests);
router.patch("/feed-formulation-requests/:id", authenticateAdmin, updateFeedFormulationRequest);

// Admin only: list all marketplace users, update user (e.g. verification), delete user
router.get("/users", authenticateAdmin, getAllMarketplaceUsers);
router.patch("/users/:id", authenticateAdmin, updateMarketplaceUser);
router.delete("/users/:id", authenticateAdmin, deleteMarketplaceUser);

module.exports = router;
