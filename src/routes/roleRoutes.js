const express = require("express");
const roleController = require("../controllers/roleController");
const { requireRoles } = require("../middleware/auth");

const router = express.Router();

// Any authenticated user can view roles; only admin can modify
router.post("/", requireRoles(["admin"]), roleController.create);
router.get("/", roleController.getAll);
router.get("/:id", roleController.getById);
router.put("/:id", requireRoles(["admin"]), roleController.update);
router.delete("/:id", requireRoles(["admin"]), roleController.remove);

router.post("/:id/permissions", requireRoles(["admin"]), roleController.assignPermissions);

module.exports = router;

