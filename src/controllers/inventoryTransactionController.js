const { InventoryTransaction, InventoryItem } = require("../models");

const stockInOut = async (req, res) => {
  try {
    const { inventory_item_id, transaction_type, quantity, transaction_date, unit_type: reqUnitType } = req.body;
    if (!inventory_item_id || !transaction_type || typeof quantity !== "number") {
      return res.status(400).json({
        success: false,
        message: "inventory_item_id, transaction_type, quantity(number) are required",
      });
    }

    const item = await InventoryItem.findByPk(inventory_item_id);
    if (!item) return res.status(404).json({ success: false, message: "Inventory item not found" });

    const unitType = (reqUnitType && String(reqUnitType).toLowerCase() === "pack") ? "pack" : "unit";
    const packSize = item.pack_size != null && item.pack_size > 0 ? item.pack_size : 1;
    const effectiveQuantity = unitType === "pack" ? quantity * packSize : quantity;

    if (unitType === "pack" && (item.pack_size == null || item.pack_size < 1)) {
      return res.status(400).json({
        success: false,
        message: "This item has no pack size set. Record in units or set pack_size on the inventory item.",
      });
    }

    const tx = await InventoryTransaction.create({
      inventory_item_id,
      transaction_type,
      quantity,
      unit_type: unitType,
      transaction_date: transaction_date ?? new Date(),
    });

    let delta = 0;
    if (transaction_type === "in") delta = effectiveQuantity;
    if (transaction_type === "out") delta = -effectiveQuantity;
    if (transaction_type === "adjustment") delta = effectiveQuantity;

    await item.update({ quantity_available: item.quantity_available + delta });

    return res.status(201).json({
      success: true,
      data: { ...tx.toJSON(), effective_quantity: effectiveQuantity },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Error creating inventory transaction", error: error.message });
  }
};

module.exports = { stockInOut };

