const { Admission, Bed } = require("../models");

const admitPatient = async (req, res) => {
  try {
    const { patient_id, bed_id, admission_date } = req.body;
    if (!patient_id || !bed_id) {
      return res.status(400).json({ success: false, message: "patient_id and bed_id are required" });
    }

    const bed = await Bed.findByPk(bed_id);
    if (!bed) return res.status(404).json({ success: false, message: "Bed not found" });
    if (bed.status !== "available") {
      return res.status(400).json({ success: false, message: "Bed is not available" });
    }

    const admission = await Admission.create({
      patient_id,
      bed_id,
      admission_date: admission_date ?? new Date(),
      status: "admitted",
    });
    await bed.update({ status: "occupied" });

    return res.status(201).json({ success: true, data: admission });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Error admitting patient", error: error.message });
  }
};

const dischargePatient = async (req, res) => {
  try {
    const { id } = req.params; // admission id
    const admission = await Admission.findByPk(id);
    if (!admission) return res.status(404).json({ success: false, message: "Admission not found" });

    const bed = await Bed.findByPk(admission.bed_id);
    const updated = await admission.update({
      discharge_date: new Date(),
      status: "discharged",
    });
    if (bed) await bed.update({ status: "available" });

    return res.status(200).json({ success: true, data: updated });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Error discharging patient", error: error.message });
  }
};

module.exports = { admitPatient, dischargePatient };

