const express = require("express");
const consultationController = require("../controllers/consultationController");
const { requireAppointmentDoctorOrAdminFromBody, requireAppointmentDoctorOrAdminParam, requireConsultationDoctorOrAdmin } = require("../middleware/doctorAccess");

const router = express.Router();

router.post("/record", requireAppointmentDoctorOrAdminFromBody("appointment_id"), consultationController.recordConsultation);
router.patch("/:id/diagnosis", requireConsultationDoctorOrAdmin, consultationController.updateDiagnosis);

router.post("/", requireAppointmentDoctorOrAdminFromBody("appointment_id"), consultationController.create);
router.get("/", consultationController.listConsultations);
router.get("/appointment/:appointment_id", requireAppointmentDoctorOrAdminParam("appointment_id"), consultationController.getByAppointmentId);
router.get("/:id", consultationController.getConsultationById);
router.put("/:id", requireConsultationDoctorOrAdmin, consultationController.update);
router.delete("/:id", requireConsultationDoctorOrAdmin, consultationController.remove);

module.exports = router;

