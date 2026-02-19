const { Prescription, PrescriptionItem, Medication, Consultation, Appointment, Staff } = require("../models");
const { parsePagination } = require("../utils/crudControllerFactory");

const isAdmin = (req) => req.userType === "user" && req.role?.name === "admin";

async function getCurrentStaff(req) {
  if (!req.userId) return null;
  const staff = await Staff.findOne({ where: { user_id: req.userId } });
  return staff || null;
}

const createPrescription = async (req, res) => {
  try {
    const { patient_id, doctor_id, consultation_id, prescription_date, items } = req.body;
    if (!patient_id) {
      return res.status(400).json({ success: false, message: "patient_id is required" });
    }

    let finalDoctorId = doctor_id ?? null;

    if (!isAdmin(req)) {
      const staff = await getCurrentStaff(req);
      if (!staff) return res.status(403).json({ success: false, message: "Access denied: staff account required" });

      if (!consultation_id) {
        return res.status(400).json({ success: false, message: "consultation_id is required" });
      }

      const consultation = await Consultation.findByPk(consultation_id);
      if (!consultation) return res.status(404).json({ success: false, message: "Consultation not found" });

      const appt = await Appointment.findByPk(consultation.appointment_id);
      if (!appt) return res.status(404).json({ success: false, message: "Appointment not found" });
      if (String(appt.doctor_id) !== String(staff.id)) {
        return res.status(403).json({ success: false, message: "Access denied: only assigned doctor can prescribe for this consultation" });
      }
      if (String(appt.patient_id) !== String(patient_id)) {
        return res.status(400).json({ success: false, message: "patient_id does not match consultation appointment patient" });
      }

      finalDoctorId = staff.id;
    }

    const prescription = await Prescription.create({
      patient_id,
      doctor_id: finalDoctorId,
      consultation_id: consultation_id ?? null,
      prescription_date: prescription_date ?? new Date(),
    });

    if (Array.isArray(items) && items.length) {
      const medIds = items.map((i) => i.medication_id).filter(Boolean);
      const meds = await Medication.findAll({ where: { id: medIds } });
      const valid = new Set(meds.map((m) => m.id));
      const rows = items
        .filter((i) => valid.has(i.medication_id))
        .map((i) => ({
          prescription_id: prescription.id,
          medication_id: i.medication_id,
          dosage: i.dosage ?? null,
          frequency: i.frequency ?? null,
          duration: i.duration ?? null,
        }));
      if (rows.length) await PrescriptionItem.bulkCreate(rows);
    }

    const reloaded = await Prescription.findByPk(prescription.id, {
      include: [{ model: PrescriptionItem, as: "items" }],
    });
    return res.status(201).json({ success: true, data: reloaded });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Error creating prescription", error: error.message });
  }
};

const listPrescriptions = async (req, res) => {
  try {
    const { page, limit, offset } = parsePagination(req.query);
    const { patient_id, doctor_id } = req.query;
    const where = {};
    if (patient_id) where.patient_id = patient_id;
    if (doctor_id) where.doctor_id = doctor_id;

    const { count, rows } = await Prescription.findAndCountAll({
      where,
      limit,
      offset,
      order: [["prescription_date", "DESC"]],
    });
    return res.status(200).json({
      success: true,
      data: rows,
      pagination: { total: count, page, limit, totalPages: Math.ceil(count / limit) },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Error listing prescriptions", error: error.message });
  }
};

const getPrescriptionById = async (req, res) => {
  try {
    const { id } = req.params;
    const prescription = await Prescription.findByPk(id, {
      include: [
        {
          model: PrescriptionItem,
          as: "items",
          include: [{ model: Medication, as: "medication" }],
        },
      ],
    });
    if (!prescription) return res.status(404).json({ success: false, message: "Prescription not found" });
    return res.status(200).json({ success: true, data: prescription });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Error fetching prescription", error: error.message });
  }
};

module.exports = { createPrescription, listPrescriptions, getPrescriptionById };

