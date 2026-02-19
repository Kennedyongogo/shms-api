const express = require("express");
const appointmentController = require("../controllers/appointmentController");
const { requireRoles } = require("../middleware/auth");
const { requireAppointmentDoctorOrAdmin } = require("../middleware/doctorAccess");

const router = express.Router();

router.post("/", appointmentController.bookAppointment);
router.patch("/:id/confirm", requireAppointmentDoctorOrAdmin, appointmentController.confirm);
router.patch("/:id/cancel", requireAppointmentDoctorOrAdmin, appointmentController.cancel);
router.patch("/:id/status", requireAppointmentDoctorOrAdmin, appointmentController.setStatus);
router.get("/", appointmentController.listAll);
router.get("/doctor/:doctor_id", appointmentController.listByDoctor);
router.get("/patient/:patient_id", appointmentController.listByPatient);
router.get("/:id", appointmentController.getById);
router.delete("/:id", requireRoles(["admin"]), appointmentController.remove);

module.exports = router;

