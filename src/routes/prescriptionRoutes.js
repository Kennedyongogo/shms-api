const express = require("express");
const prescriptionController = require("../controllers/prescriptionController");

const router = express.Router();

router.post("/", prescriptionController.createPrescription);
router.post("/pos", prescriptionController.createPrescription);
router.get("/", prescriptionController.listPrescriptions);
router.get("/:id", prescriptionController.getPrescriptionById);

module.exports = router;

