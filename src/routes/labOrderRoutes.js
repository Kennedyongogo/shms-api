const express = require("express");
const labOrderController = require("../controllers/labOrderController");
const { requireRoles } = require("../middleware/auth");

const router = express.Router();

router.post("/", labOrderController.createLabOrder);
router.patch("/:id/status", labOrderController.updateStatus);
router.get("/", labOrderController.list);
router.delete("/:id", requireRoles(["admin"]), labOrderController.remove);

module.exports = router;

