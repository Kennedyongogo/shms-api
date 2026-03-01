const express = require("express");
const wardController = require("../controllers/wardController");
const { requireRoles } = require("../middleware/auth");

const adminOrSuperAdmin = ["admin", "Super Admin"];
const router = express.Router();

router.get("/", wardController.getAll);
router.get("/:id", wardController.getById);
router.post("/", requireRoles(adminOrSuperAdmin), wardController.create);
router.put("/:id", requireRoles(adminOrSuperAdmin), wardController.update);
router.delete("/:id", requireRoles(adminOrSuperAdmin), wardController.remove);

module.exports = router;

