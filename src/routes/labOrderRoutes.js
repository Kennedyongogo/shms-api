const express = require("express");
const labOrderController = require("../controllers/labOrderController");
const { requireRoles } = require("../middleware/auth");

const router = express.Router();

router.post("/", labOrderController.createLabOrder);
router.patch("/:id/status", labOrderController.updateStatus);
router.get("/", labOrderController.list);
router.get("/:id", labOrderController.getById);
router.delete("/:id", requireRoles(["Super Admin"]), labOrderController.remove);

module.exports = router;

