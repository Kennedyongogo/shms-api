const { InventoryTransaction, InventoryItem } = require("../models");

const stockInOut = async (req, res) => {
  try {
    const { inventory_item_id, transaction_type, quantity, transaction_date } = req.body;
    if (!inventory_item_id || !transaction_type || typeof quantity !== "number") {
      return res.status(400).json({
        success: false,
        message: "inventory_item_id, transaction_type, quantity(number) are required",
      });
    }

    const item = await InventoryItem.findByPk(inventory_item_id);
    if (!item) return res.status(404).json({ success: false, message: "Inventory item not found" });

    const tx = await InventoryTransaction.create({
      inventory_item_id,
      transaction_type,
      quantity,
      transaction_date: transaction_date ?? new Date(),
    });

    // Update quantity_available
    let delta = 0;
    if (transaction_type === "in") delta = quantity;
    if (transaction_type === "out") delta = -quantity;
    if (transaction_type === "adjustment") delta = quantity;

    await item.update({ quantity_available: item.quantity_available + delta });

    return res.status(201).json({ success: true, data: tx });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Error creating inventory transaction", error: error.message });
  }
};

module.exports = { stockInOut };

