const express = require("express");
const patientController = require("../controllers/patientController");
const { requireRoles } = require("../middleware/auth");

const router = express.Router();

router.post("/", patientController.create);
router.get("/", patientController.getAll);
router.get("/:id", patientController.getById);
router.put("/:id", patientController.update);
router.delete("/:id", requireRoles(["Super Admin"]), patientController.remove);

module.exports = router;

