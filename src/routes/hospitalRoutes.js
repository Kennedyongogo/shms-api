const express = require("express");
const hospitalController = require("../controllers/hospitalController");
const { uploadHospitalLogo, handleUploadError } = require("../middleware/upload");
const { requireRoles } = require("../middleware/auth");

const router = express.Router();

// Any authenticated user can view hospitals; only admin can modify
router.post("/", requireRoles(["admin"]), uploadHospitalLogo, handleUploadError, hospitalController.create);
router.get("/", hospitalController.getAll);
router.get("/:id", hospitalController.getById);
router.put("/:id", requireRoles(["admin"]), uploadHospitalLogo, handleUploadError, hospitalController.update);
router.delete("/:id", requireRoles(["admin"]), hospitalController.remove);

module.exports = router;

