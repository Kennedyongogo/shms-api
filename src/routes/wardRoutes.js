const express = require("express");
const wardController = require("../controllers/wardController");
const { requireRoles } = require("../middleware/auth");

const superAdminOnly = ["Super Admin"];
const router = express.Router();

router.get("/", wardController.getAll);
router.get("/:id", wardController.getById);
router.post("/", requireRoles(superAdminOnly), wardController.create);
router.put("/:id", requireRoles(superAdminOnly), wardController.update);
router.delete("/:id", requireRoles(superAdminOnly), wardController.remove);

module.exports = router;

