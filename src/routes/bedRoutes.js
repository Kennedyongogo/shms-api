const express = require("express");
const bedController = require("../controllers/bedController");
const { requireRoles } = require("../middleware/auth");

const router = express.Router();

router.get("/", bedController.getAll);
router.get("/:id", bedController.getById);
router.post("/", requireRoles(["admin"]), bedController.create);
router.put("/:id", requireRoles(["admin"]), bedController.update);
router.patch("/:id/status", requireRoles(["admin"]), bedController.updateBedStatus);
router.delete("/:id", requireRoles(["admin"]), bedController.remove);

module.exports = router;

