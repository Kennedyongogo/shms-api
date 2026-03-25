const express = require("express");
const hospitalController = require("../controllers/hospitalController");
const hospitalDataPortabilityController = require("../controllers/hospitalDataPortabilityController");
const { uploadHospitalLogo, handleUploadError } = require("../middleware/upload");
const { requireRoles } = require("../middleware/auth");

const router = express.Router();

// Authenticated user can view hospitals; Super Admin can modify
const superAdminOnly = ["Super Admin"];

/** Data portability — must be registered before "/:id" generic routes if paths overlap; use static segments first. */
router.get("/:id/export-data", requireRoles(superAdminOnly), hospitalDataPortabilityController.exportData);
router.post("/:id/purge-organization", requireRoles(superAdminOnly), hospitalDataPortabilityController.purgeOrganization);

router.post("/", requireRoles(superAdminOnly), uploadHospitalLogo, handleUploadError, hospitalController.create);
router.get("/", hospitalController.getAll);
router.get("/:id", hospitalController.getById);
router.put("/:id", requireRoles(superAdminOnly), uploadHospitalLogo, handleUploadError, hospitalController.update);
router.delete("/:id", requireRoles(superAdminOnly), hospitalController.remove);

module.exports = router;

