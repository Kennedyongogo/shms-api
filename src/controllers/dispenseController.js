const { DispenseRecord, Prescription, Staff } = require("../models");
const { parsePagination } = require("../utils/crudControllerFactory");
const { requirePaidByReferenceOrRespond } = require("../utils/paymentGate");

const recordDispensing = async (req, res) => {
  try {
    const { prescription_id, pharmacist_id, dispense_date } = req.body;
    if (!prescription_id) {
      return res.status(400).json({ success: false, message: "prescription_id is required" });
    }

    const pres = await Prescription.findByPk(prescription_id);
    if (!pres) return res.status(404).json({ success: false, message: "Prescription not found" });

    const ok = await requirePaidByReferenceOrRespond(res, {
      item_type: "prescription",
      reference_id: prescription_id,
      actionLabel: "dispensing this prescription",
    });
    if (!ok) return;

    const record = await DispenseRecord.create({
      prescription_id,
      pharmacist_id: pharmacist_id ?? null,
      dispense_date: dispense_date ?? new Date(),
    });
    return res.status(201).json({ success: true, data: record });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Error recording dispensing", error: error.message });
  }
};

const listDispenseRecords = async (req, res) => {
  try {
    const { page, limit, offset } = parsePagination(req.query);
    const { prescription_id, pharmacist_id } = req.query;
    const where = {};
    if (prescription_id) where.prescription_id = prescription_id;
    if (pharmacist_id) where.pharmacist_id = pharmacist_id;

    const { count, rows } = await DispenseRecord.findAndCountAll({
      where,
      limit,
      offset,
      order: [["dispense_date", "DESC"]],
      include: [
        { model: Prescription, as: "prescription" },
        { model: Staff, as: "pharmacist", required: false },
      ],
    });

    return res.status(200).json({
      success: true,
      data: rows,
      pagination: { total: count, page, limit, totalPages: Math.ceil(count / limit) },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Error listing dispense records", error: error.message });
  }
};

const getDispenseRecordById = async (req, res) => {
  try {
    const { id } = req.params;
    const record = await DispenseRecord.findByPk(id, {
      include: [
        { model: Prescription, as: "prescription" },
        { model: Staff, as: "pharmacist", required: false },
      ],
    });
    if (!record) return res.status(404).json({ success: false, message: "Dispense record not found" });
    return res.status(200).json({ success: true, data: record });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Error fetching dispense record", error: error.message });
  }
};

module.exports = { recordDispensing, listDispenseRecords, getDispenseRecordById };

