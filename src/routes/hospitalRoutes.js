const express = require("express");
const hospitalController = require("../controllers/hospitalController");
const { uploadHospitalLogo, handleUploadError } = require("../middleware/upload");
const { requireRoles } = require("../middleware/auth");

const router = express.Router();

// Authenticated user can view hospitals; admin or Super Admin can modify
const adminOrSuperAdmin = ["admin", "Super Admin"];
router.post("/", requireRoles(adminOrSuperAdmin), uploadHospitalLogo, handleUploadError, hospitalController.create);
router.get("/", hospitalController.getAll);
router.get("/:id", hospitalController.getById);
router.put("/:id", requireRoles(adminOrSuperAdmin), uploadHospitalLogo, handleUploadError, hospitalController.update);
router.delete("/:id", requireRoles(adminOrSuperAdmin), hospitalController.remove);

module.exports = router;

