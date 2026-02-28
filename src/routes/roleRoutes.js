const express = require("express");
const roleController = require("../controllers/roleController");
const { requireRoles } = require("../middleware/auth");

const router = express.Router();

// Authenticated user can view roles for their hospital; only admin or Super Admin can modify
const adminOrSuperAdmin = ["admin", "Super Admin"];
router.post("/", requireRoles(adminOrSuperAdmin), roleController.create);
router.get("/", roleController.getAll);
router.get("/:id/menu-items", roleController.getMenuItems);
router.put("/:id/menu-items", requireRoles(adminOrSuperAdmin), roleController.putMenuItems);
router.get("/:id", roleController.getById);
router.put("/:id", requireRoles(adminOrSuperAdmin), roleController.update);
router.delete("/:id", requireRoles(adminOrSuperAdmin), roleController.remove);

router.post("/:id/permissions", requireRoles(adminOrSuperAdmin), roleController.assignPermissions);

module.exports = router;

