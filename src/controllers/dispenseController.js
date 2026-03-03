const {
  DispenseRecord,
  Prescription,
  PrescriptionItem,
  Medication,
  InventoryItem,
  InventoryTransaction,
  Staff,
  User,
  Patient,
  sequelize,
} = require("../models");
const { parsePagination } = require("../utils/crudControllerFactory");
const { requirePaidByReferenceOrRespond } = require("../utils/paymentGate");
const { auditLog } = require("../utils/auditLog");
const { getHospitalId } = require("../utils/hospitalScope");

async function getCurrentStaff(req) {
  if (!req.userId) return null;
  const staff = await Staff.findOne({ where: { user_id: req.userId } });
  return staff || null;
}

const prescriptionInclude = [
  { model: Patient, as: "patient", attributes: ["id", "full_name"], required: false, include: [{ model: User, as: "user", attributes: ["id", "full_name"], required: false }] },
  { model: PrescriptionItem, as: "items", required: false, include: [{ model: Medication, as: "medication", attributes: ["id", "name"], required: false }] },
];

const recordDispensing = async (req, res) => {
  try {
    const { prescription_id, pharmacist_id, dispense_date } = req.body;
    if (!prescription_id) {
      return res
        .status(400)
        .json({ success: false, message: "prescription_id is required" });
    }

    const pres = await Prescription.findByPk(prescription_id, {
      include: [
        {
          model: PrescriptionItem,
          as: "items",
          include: [
            {
              model: Medication,
              as: "medication",
              include: [{ model: InventoryItem, as: "inventoryItem", required: false }],
            },
          ],
        },
      ],
    });
    if (!pres)
      return res
        .status(404)
        .json({ success: false, message: "Prescription not found" });

    if (!pres.items || pres.items.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Prescription has no items to dispense",
      });
    }

    // Validate: every item must be linked to inventory and have enough stock
    const insufficient = [];
    const notLinked = [];
    for (const item of pres.items) {
      const med = item.medication;
      if (!med) {
        notLinked.push(item.id);
        continue;
      }
      if (!med.inventory_item_id || !med.inventoryItem) {
        notLinked.push(med.name || med.id);
        continue;
      }
      const qty = item.quantity || 1;
      const inPharmacy = med.inventoryItem.quantity_in_pharmacy ?? 0;
      const inMain = med.inventoryItem.quantity_available ?? 0;
      const availableToDispense = inPharmacy + inMain;
      if (availableToDispense < qty) {
        insufficient.push({
          medication: med.name,
          required: qty,
          available: availableToDispense,
          in_pharmacy: inPharmacy,
          in_main: inMain,
        });
      }
    }
    if (notLinked.length) {
      return res.status(400).json({
        success: false,
        message:
          "Some medications are not linked to inventory. Link Medication to InventoryItem (inventory_item_id) before dispensing.",
        notLinked,
      });
    }
    if (insufficient.length) {
      return res.status(400).json({
        success: false,
        message: "Insufficient stock for one or more prescription items",
        insufficient,
      });
    }

    const ok = await requirePaidByReferenceOrRespond(res, {
      item_type: "prescription",
      reference_id: prescription_id,
      actionLabel: "dispensing this prescription",
    });
    if (!ok) return;

    const staff = await getCurrentStaff(req);
    const finalPharmacistId = pharmacist_id ?? staff?.id ?? null;
    const dispenseDate = dispense_date ?? new Date();

    const hospitalId = getHospitalId(req);
    const record = await sequelize.transaction(async (t) => {
      const dispenseRecord = await DispenseRecord.create(
        {
          prescription_id,
          pharmacist_id: finalPharmacistId,
          dispense_date: dispenseDate,
          hospital_id: hospitalId ?? pres.hospital_id ?? null,
        },
        { transaction: t }
      );

      // Group by inventory_item_id so duplicate medications on the same prescription deduct once
      const byInventoryItem = new Map();
      for (const item of pres.items) {
        const invId = item.medication.inventory_item_id;
        const qty = item.quantity || 1;
        byInventoryItem.set(invId, (byInventoryItem.get(invId) || 0) + qty);
      }

      for (const [inventoryItemId, totalQty] of byInventoryItem) {
        await InventoryTransaction.create(
          {
            inventory_item_id: inventoryItemId,
            transaction_type: "out",
            quantity: totalQty,
            transaction_date: dispenseDate,
          },
          { transaction: t }
        );
        const invItem = await InventoryItem.findByPk(inventoryItemId, { transaction: t });
        const fromPharmacy = Math.min(invItem.quantity_in_pharmacy ?? 0, totalQty);
        const fromMain = totalQty - fromPharmacy;
        if (fromPharmacy > 0) {
          await InventoryItem.decrement("quantity_in_pharmacy", { by: fromPharmacy, where: { id: inventoryItemId }, transaction: t });
        }
        if (fromMain > 0) {
          await InventoryItem.decrement("quantity_available", { by: fromMain, where: { id: inventoryItemId }, transaction: t });
        }
      }

      return dispenseRecord;
    });

    await auditLog(req, { action: "RECORD_DISPENSING", table_name: "DispenseRecord", record_id: record?.id });
    return res.status(201).json({ success: true, data: record });
  } catch (error) {
    return res
      .status(500)
      .json({
        success: false,
        message: "Error recording dispensing",
        error: error.message,
      });
  }
};

const listDispenseRecords = async (req, res) => {
  try {
    const { page, limit, offset } = parsePagination(req.query);
    const { prescription_id, pharmacist_id } = req.query;
    const where = {};
    const hid = getHospitalId(req);
    if (hid != null) where.hospital_id = hid;
    if (prescription_id) where.prescription_id = prescription_id;
    if (pharmacist_id) where.pharmacist_id = pharmacist_id;

    const { count, rows } = await DispenseRecord.findAndCountAll({
      where,
      limit,
      offset,
      order: [["dispense_date", "DESC"]],
      include: [
        { model: Prescription, as: "prescription", required: false, include: prescriptionInclude },
        {
          model: Staff,
          as: "pharmacist",
          required: false,
          include: [{ model: User, as: "user", attributes: ["id", "full_name", "email", "phone"], required: false }],
        },
      ],
    });

    return res.status(200).json({
      success: true,
      data: rows,
      pagination: {
        total: count,
        page,
        limit,
        totalPages: Math.ceil(count / limit),
      },
    });
  } catch (error) {
    return res
      .status(500)
      .json({
        success: false,
        message: "Error listing dispense records",
        error: error.message,
      });
  }
};

const getDispenseRecordById = async (req, res) => {
  try {
    const { id } = req.params;
    const record = await DispenseRecord.findByPk(id, {
      include: [
        { model: Prescription, as: "prescription", required: false, include: prescriptionInclude },
        {
          model: Staff,
          as: "pharmacist",
          required: false,
          include: [{ model: User, as: "user", attributes: ["id", "full_name", "email", "phone"], required: false }],
        },
      ],
    });
    if (!record)
      return res
        .status(404)
        .json({ success: false, message: "Dispense record not found" });
    const hid = getHospitalId(req);
    if (hid != null && record.hospital_id != null && record.hospital_id !== hid)
      return res.status(404).json({ success: false, message: "Dispense record not found" });
    return res.status(200).json({ success: true, data: record });
  } catch (error) {
    return res
      .status(500)
      .json({
        success: false,
        message: "Error fetching dispense record",
        error: error.message,
      });
  }
};

module.exports = {
  recordDispensing,
  listDispenseRecords,
  getDispenseRecordById,
};
