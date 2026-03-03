const express = require("express");
const staffController = require("../controllers/staffController");
const { requireRoles } = require("../middleware/auth");

const superAdminOnly = ["Super Admin"];
const router = express.Router();

// Any authenticated user can view staff; only Super Admin can modify
router.post("/", requireRoles(superAdminOnly), staffController.create);
router.get("/", staffController.getAll);
router.get("/:id", staffController.getById);
router.put("/:id", requireRoles(superAdminOnly), staffController.update);
router.delete("/:id", requireRoles(superAdminOnly), staffController.remove);

module.exports = router;

