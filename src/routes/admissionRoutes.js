const express = require("express");
const admissionController = require("../controllers/admissionController");

const router = express.Router();

router.get("/", admissionController.listAdmissions);
router.get("/:id", admissionController.getAdmissionById);
router.post("/admit", admissionController.admitPatient);
router.post("/:id/generate-billing", admissionController.generateAdmissionBilling);
router.patch("/:id/discharge", admissionController.dischargePatient);

module.exports = router;

