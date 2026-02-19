const express = require("express");
const userController = require("../controllers/userController");
const { requireRoles } = require("../middleware/auth");
const { uploadUserProfileImage, handleUploadError } = require("../middleware/upload");

const router = express.Router();

// Any authenticated user can view users; only admin can modify
router.post("/", requireRoles(["admin"]), userController.create);
router.get("/", userController.getAll);
router.get("/:id", userController.getById);
router.put("/:id", requireRoles(["admin"]), userController.update);
router.put(
  "/:id/profile-image",
  requireRoles(["admin"]),
  uploadUserProfileImage,
  handleUploadError,
  userController.updateProfileImage
);
router.patch("/:id/deactivate", requireRoles(["admin"]), userController.deactivate);
router.delete("/:id", requireRoles(["admin"]), userController.remove);

module.exports = router;

