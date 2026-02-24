const { VitalSigns, Consultation } = require("../models");
const { auditLog } = require("../utils/auditLog");

const recordVitals = async (req, res) => {
  try {
    const { consultation_id, temperature, blood_pressure, pulse, weight, height } = req.body;
    if (!consultation_id) {
      return res.status(400).json({ success: false, message: "consultation_id is required" });
    }

    const consultation = await Consultation.findByPk(consultation_id);
    if (!consultation) return res.status(404).json({ success: false, message: "Consultation not found" });

    const existing = await VitalSigns.findOne({ where: { consultation_id } });
    if (existing) {
      const updated = await existing.update({ temperature, blood_pressure, pulse, weight, height });
      await auditLog(req, { action: "UPDATE_VITALSIGNS", table_name: "VitalSigns", record_id: existing?.id });
      return res.status(200).json({ success: true, data: updated });
    }

    const vitals = await VitalSigns.create({
      consultation_id,
      temperature: temperature ?? null,
      blood_pressure: blood_pressure ?? null,
      pulse: pulse ?? null,
      weight: weight ?? null,
      height: height ?? null,
    });
    await auditLog(req, { action: "CREATE_VITALSIGNS", table_name: "VitalSigns", record_id: vitals?.id });
    return res.status(201).json({ success: true, data: vitals });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Error recording vital signs", error: error.message });
  }
};

module.exports = { recordVitals };

