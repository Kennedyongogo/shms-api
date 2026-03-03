const express = require("express");
const departmentController = require("../controllers/departmentController");
const { requireRoles } = require("../middleware/auth");

const router = express.Router();

// Any authenticated user can view departments; only Super Admin can modify
router.post("/", requireRoles(["Super Admin"]), departmentController.create);
router.get("/", departmentController.getAll);
router.get("/:id", departmentController.getById);
router.put("/:id", requireRoles(["Super Admin"]), departmentController.update);
router.delete("/:id", requireRoles(["Super Admin"]), departmentController.remove);

module.exports = router;

