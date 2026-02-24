const express = require("express");
const consultationController = require("../controllers/consultationController");
const { requireAppointmentDoctorOnlyFromBody, requireAppointmentDoctorOnlyParam, requireConsultationDoctorOnly } = require("../middleware/doctorAccess");

const router = express.Router();

// Only the doctor assigned to the appointment can record or manage its consultation; admin cannot.
router.post("/record", requireAppointmentDoctorOnlyFromBody("appointment_id"), consultationController.recordConsultation);
router.patch("/:id/diagnosis", requireConsultationDoctorOnly, consultationController.updateDiagnosis);

router.post("/", requireAppointmentDoctorOnlyFromBody("appointment_id"), consultationController.create);
router.get("/", consultationController.listConsultations);
router.get("/appointment/:appointment_id", requireAppointmentDoctorOnlyParam("appointment_id"), consultationController.getByAppointmentId);
router.get("/:id", consultationController.getConsultationById);
router.put("/:id", requireConsultationDoctorOnly, consultationController.update);
router.delete("/:id", requireConsultationDoctorOnly, consultationController.remove);

module.exports = router;

