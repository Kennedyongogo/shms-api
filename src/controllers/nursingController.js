const { NursingNote, Admission, Staff } = require("../models");
const { createCrudController } = require("../utils/crudControllerFactory");

async function getCurrentStaff(req) {
  if (!req.userId) return null;
  const staff = await Staff.findOne({ where: { user_id: req.userId } });
  return staff || null;
}

const crud = createCrudController({
  Model: NursingNote,
  name: "NursingNote",
  searchableFields: ["notes", "blood_pressure"],
});

const recordNursingNote = async (req, res) => {
  try {
    const {
      admission_id,
      patient_id,
      notes,
      recorded_at,
      date_time,
      temperature,
      blood_pressure,
      pulse,
      respiratory_rate,
      pain_scale,
    } = req.body;

    let finalPatientId = patient_id ?? null;
    if (admission_id) {
      const admission = await Admission.findByPk(admission_id);
      if (!admission) return res.status(404).json({ success: false, message: "Admission not found" });
      finalPatientId = finalPatientId || admission.patient_id;
    }
    if (!admission_id && !finalPatientId) {
      return res.status(400).json({ success: false, message: "admission_id or patient_id is required" });
    }

    // Capture the logged-in staff as the recorder (any staff can record notes, not restricted to nurses)
    const staff = await getCurrentStaff(req);
    const recordedByStaffId = staff?.id ?? null;

    const now = new Date();
    const created = await NursingNote.create({
      admission_id: admission_id ?? null,
      patient_id: finalPatientId,
      nurse_id: recordedByStaffId,
      notes: notes ?? null,
      recorded_at: recorded_at ?? now,
      date_time: date_time ?? now,
      temperature: temperature != null ? Number(temperature) : null,
      blood_pressure: blood_pressure ?? null,
      pulse: pulse != null ? parseInt(pulse, 10) : null,
      respiratory_rate: respiratory_rate != null ? parseInt(respiratory_rate, 10) : null,
      pain_scale: pain_scale != null ? parseInt(pain_scale, 10) : null,
    });
    return res.status(201).json({ success: true, data: created });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Error recording nursing note", error: error.message });
  }
};

module.exports = { ...crud, recordNursingNote };

