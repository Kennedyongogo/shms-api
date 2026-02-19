const express = require("express");
const patientController = require("../controllers/patientController");
const { requireRoles } = require("../middleware/auth");

const router = express.Router();

router.post("/", requireRoles(["admin"]), patientController.create);
router.get("/", patientController.getAll);
router.get("/:id", patientController.getById);
router.put("/:id", requireRoles(["admin"]), patientController.update);
router.delete("/:id", requireRoles(["admin"]), patientController.remove);

module.exports = router;

