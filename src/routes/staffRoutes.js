const express = require("express");
const staffController = require("../controllers/staffController");
const { requireRoles } = require("../middleware/auth");

const adminOrSuperAdmin = ["admin", "Super Admin"];
const router = express.Router();

// Any authenticated user can view staff; only admin or Super Admin can modify
router.post("/", requireRoles(adminOrSuperAdmin), staffController.create);
router.get("/", staffController.getAll);
router.get("/:id", staffController.getById);
router.put("/:id", requireRoles(adminOrSuperAdmin), staffController.update);
router.delete("/:id", requireRoles(adminOrSuperAdmin), staffController.remove);

module.exports = router;

