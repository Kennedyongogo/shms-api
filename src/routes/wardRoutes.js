const express = require("express");
const wardController = require("../controllers/wardController");
const { requireRoles } = require("../middleware/auth");

const router = express.Router();

router.get("/", wardController.getAll);
router.get("/:id", wardController.getById);
router.post("/", requireRoles(["admin"]), wardController.create);
router.put("/:id", requireRoles(["admin"]), wardController.update);
router.delete("/:id", requireRoles(["admin"]), wardController.remove);

module.exports = router;

