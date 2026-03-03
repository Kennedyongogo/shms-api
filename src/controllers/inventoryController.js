const { InventoryItem, Medication, InventoryTransaction } = require("../models");
const { createCrudController } = require("../utils/crudControllerFactory");
const { auditLog } = require("../utils/auditLog");
const { getHospitalId } = require("../utils/hospitalScope");

const crud = createCrudController({
  Model: InventoryItem,
  name: "InventoryItem",
  searchableFields: ["name", "category"],
  scopeByHospital: true,
});

/** Create or get a Medication linked to this inventory item so pharmacy can prescribe/dispense without manual setup. */
const addToPharmacy = async (req, res) => {
  try {
    const { id } = req.params;
    const item = await InventoryItem.findByPk(id);
    if (!item) {
      return res.status(404).json({ success: false, message: "Inventory item not found" });
    }
    let medication = await Medication.findOne({ where: { inventory_item_id: id } });
    if (medication) {
      return res.status(200).json({
        success: true,
        data: medication,
        message: "Already available in pharmacy",
      });
    }
    const hospitalId = getHospitalId(req) ?? item.hospital_id ?? null;
    medication = await Medication.create({
      name: item.name,
      dosage_form: item.category || null,
      inventory_item_id: item.id,
      hospital_id: hospitalId,
    });
    await auditLog(req, { action: "ADD_TO_PHARMACY", table_name: "Medication", record_id: medication?.id });
    return res.status(201).json({
      success: true,
      data: medication,
      message: "Added to pharmacy. You can prescribe and dispense this item from Pharmacy.",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Error adding to pharmacy",
      error: error.message,
    });
  }
};

/** Move stock from main inventory to pharmacy. Dispensing uses pharmacy stock first. */
const transferToPharmacy = async (req, res) => {
  try {
    const { id } = req.params;
    const quantity = parseInt(req.body.quantity, 10);
    if (Number.isNaN(quantity) || quantity < 1) {
      return res.status(400).json({ success: false, message: "quantity must be a positive number" });
    }
    const item = await InventoryItem.findByPk(id);
    if (!item) {
      return res.status(404).json({ success: false, message: "Inventory item not found" });
    }
    const available = item.quantity_available ?? 0;
    if (available < quantity) {
      return res.status(400).json({
        success: false,
        message: `Not enough stock in main inventory. Available: ${available}, requested: ${quantity}`,
        quantity_available: available,
      });
    }
    await item.update({
      quantity_available: available - quantity,
      quantity_in_pharmacy: (item.quantity_in_pharmacy ?? 0) + quantity,
    });
    // Record as stock out so it appears in Stock in/out list (stock left main store for pharmacy)
    await InventoryTransaction.create({
      inventory_item_id: id,
      transaction_type: "out",
      quantity,
      unit_type: "unit",
      transaction_date: new Date(),
    });
    const updated = await InventoryItem.findByPk(id);
    await auditLog(req, { action: "TRANSFER_TO_PHARMACY", table_name: "InventoryItem", record_id: id });
    return res.status(200).json({
      success: true,
      data: updated,
      message: `Transferred ${quantity} to pharmacy. Main: ${updated.quantity_available}, Pharmacy: ${updated.quantity_in_pharmacy}`,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Error transferring to pharmacy",
      error: error.message,
    });
  }
};

module.exports = { ...crud, addToPharmacy, transferToPharmacy };

