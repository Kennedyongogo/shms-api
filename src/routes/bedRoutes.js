const express = require("express");
const bedController = require("../controllers/bedController");
const { requireRoles } = require("../middleware/auth");

const superAdminOnly = ["Super Admin"];
const router = express.Router();

router.get("/", bedController.getAll);
router.get("/:id", bedController.getById);
router.post("/", requireRoles(superAdminOnly), bedController.create);
router.put("/:id", requireRoles(superAdminOnly), bedController.update);
router.patch("/:id/status", requireRoles(superAdminOnly), bedController.updateBedStatus);
router.delete("/:id", requireRoles(superAdminOnly), bedController.remove);

module.exports = router;

