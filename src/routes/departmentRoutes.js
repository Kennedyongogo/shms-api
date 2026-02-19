const express = require("express");
const departmentController = require("../controllers/departmentController");
const { requireRoles } = require("../middleware/auth");

const router = express.Router();

// Any authenticated user can view departments; only admin can modify
router.post("/", requireRoles(["admin"]), departmentController.create);
router.get("/", departmentController.getAll);
router.get("/:id", departmentController.getById);
router.put("/:id", requireRoles(["admin"]), departmentController.update);
router.delete("/:id", requireRoles(["admin"]), departmentController.remove);

module.exports = router;

