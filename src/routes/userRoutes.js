const express = require("express");
const userController = require("../controllers/userController");
const { requireRoles } = require("../middleware/auth");
const { uploadUserProfileImage, handleUploadError } = require("../middleware/upload");

const router = express.Router();

// Authenticated user can view users for their hospital; only Super Admin can modify
const superAdminOnly = ["Super Admin"];
router.post("/", requireRoles(superAdminOnly), userController.create);
router.get("/", userController.getAll);
router.get("/:id", userController.getById);
router.put("/:id", requireRoles(superAdminOnly), userController.update);
router.put(
  "/:id/profile-image",
  requireRoles(superAdminOnly),
  uploadUserProfileImage,
  handleUploadError,
  userController.updateProfileImage
);
router.patch("/:id/deactivate", requireRoles(superAdminOnly), userController.deactivate);
router.delete("/:id", requireRoles(superAdminOnly), userController.remove);

module.exports = router;

