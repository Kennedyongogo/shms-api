const express = require("express");
const userController = require("../controllers/userController");
const { requireRoles } = require("../middleware/auth");
const { uploadUserProfileImage, handleUploadError } = require("../middleware/upload");

const router = express.Router();

// Authenticated user can view users for their hospital; only admin or Super Admin can modify
const adminOrSuperAdmin = ["admin", "Super Admin"];
router.post("/", requireRoles(adminOrSuperAdmin), userController.create);
router.get("/", userController.getAll);
router.get("/:id", userController.getById);
router.put("/:id", requireRoles(adminOrSuperAdmin), userController.update);
router.put(
  "/:id/profile-image",
  requireRoles(adminOrSuperAdmin),
  uploadUserProfileImage,
  handleUploadError,
  userController.updateProfileImage
);
router.patch("/:id/deactivate", requireRoles(adminOrSuperAdmin), userController.deactivate);
router.delete("/:id", requireRoles(adminOrSuperAdmin), userController.remove);

module.exports = router;

