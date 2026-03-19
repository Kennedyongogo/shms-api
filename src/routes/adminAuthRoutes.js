const express = require("express");
const {
  register,
  login,
  me,
  updateMe,
  changePassword,
  updateMyProfileImage,
  getOverview,
  create,
  getAll,
  getById,
  update,
  updateProfileImage,
  remove,
} = require("../controllers/adminAuthController");
const { authenticateAdmin } = require("../middleware/auth");
const { uploadAdminProfileImage, handleUploadError } = require("../middleware/upload");

const router = express.Router();

router.post("/register", register);
router.post("/login", login);
router.get("/me", authenticateAdmin, me);
router.patch("/me", authenticateAdmin, updateMe);
router.post("/change-password", authenticateAdmin, changePassword);
router.put("/me/profile-image", authenticateAdmin, uploadAdminProfileImage, handleUploadError, updateMyProfileImage);
router.get("/overview", authenticateAdmin, getOverview);
router.get("/", authenticateAdmin, getAll);
router.get("/:id", authenticateAdmin, getById);
router.post("/", authenticateAdmin, uploadAdminProfileImage, handleUploadError, create);
router.put("/:id", authenticateAdmin, uploadAdminProfileImage, handleUploadError, update);
router.put("/:id/profile-image", authenticateAdmin, uploadAdminProfileImage, handleUploadError, updateProfileImage);
router.delete("/:id", authenticateAdmin, remove);

module.exports = router;

