const { NursingNote, Admission } = require("../models");
const { createCrudController } = require("../utils/crudControllerFactory");

const crud = createCrudController({
  Model: NursingNote,
  name: "NursingNote",
  searchableFields: ["notes"],
});

const recordNursingNote = async (req, res) => {
  try {
    const { admission_id, nurse_id, notes, recorded_at } = req.body;
    if (!admission_id || !notes) {
      return res.status(400).json({ success: false, message: "admission_id and notes are required" });
    }
    const admission = await Admission.findByPk(admission_id);
    if (!admission) return res.status(404).json({ success: false, message: "Admission not found" });

    const created = await NursingNote.create({
      admission_id,
      nurse_id: nurse_id ?? null,
      notes,
      recorded_at: recorded_at ?? new Date(),
    });
    return res.status(201).json({ success: true, data: created });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Error recording nursing note", error: error.message });
  }
};

module.exports = { ...crud, recordNursingNote };

