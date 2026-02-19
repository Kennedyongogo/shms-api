const express = require("express");
const staffController = require("../controllers/staffController");
const { requireRoles } = require("../middleware/auth");

const router = express.Router();

// Any authenticated user can view staff; only admin can modify
router.post("/", requireRoles(["admin"]), staffController.create);
router.get("/", staffController.getAll);
router.get("/:id", staffController.getById);
router.put("/:id", requireRoles(["admin"]), staffController.update);
router.delete("/:id", requireRoles(["admin"]), staffController.remove);

module.exports = router;

