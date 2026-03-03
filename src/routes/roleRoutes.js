const express = require("express");
const roleController = require("../controllers/roleController");
const { requireRoles } = require("../middleware/auth");

const router = express.Router();

// Authenticated user can view roles for their hospital; only Super Admin can modify
const superAdminOnly = ["Super Admin"];
router.post("/", requireRoles(superAdminOnly), roleController.create);
router.get("/", roleController.getAll);
router.get("/:id/menu-items", roleController.getMenuItems);
router.put("/:id/menu-items", requireRoles(superAdminOnly), roleController.putMenuItems);
router.get("/:id", roleController.getById);
router.put("/:id", requireRoles(superAdminOnly), roleController.update);
router.delete("/:id", requireRoles(superAdminOnly), roleController.remove);

router.post("/:id/permissions", requireRoles(superAdminOnly), roleController.assignPermissions);

module.exports = router;

