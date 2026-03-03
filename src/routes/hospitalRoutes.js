const express = require("express");
const hospitalController = require("../controllers/hospitalController");
const { uploadHospitalLogo, handleUploadError } = require("../middleware/upload");
const { requireRoles } = require("../middleware/auth");

const router = express.Router();

// Authenticated user can view hospitals; Super Admin can modify
const superAdminOnly = ["Super Admin"];
router.post("/", requireRoles(superAdminOnly), uploadHospitalLogo, handleUploadError, hospitalController.create);
router.get("/", hospitalController.getAll);
router.get("/:id", hospitalController.getById);
router.put("/:id", requireRoles(superAdminOnly), uploadHospitalLogo, handleUploadError, hospitalController.update);
router.delete("/:id", requireRoles(superAdminOnly), hospitalController.remove);

module.exports = router;

