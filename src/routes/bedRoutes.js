const express = require("express");
const bedController = require("../controllers/bedController");
const { requireRoles } = require("../middleware/auth");

const adminOrSuperAdmin = ["admin", "Super Admin"];
const router = express.Router();

router.get("/", bedController.getAll);
router.get("/:id", bedController.getById);
router.post("/", requireRoles(adminOrSuperAdmin), bedController.create);
router.put("/:id", requireRoles(adminOrSuperAdmin), bedController.update);
router.patch("/:id/status", requireRoles(adminOrSuperAdmin), bedController.updateBedStatus);
router.delete("/:id", requireRoles(adminOrSuperAdmin), bedController.remove);

module.exports = router;

