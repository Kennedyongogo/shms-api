const { InventoryTransaction, InventoryItem } = require("../models");
const { parsePagination } = require("../utils/crudControllerFactory");
const { auditLog } = require("../utils/auditLog");

const getAll = async (req, res) => {
  try {
    const { page, limit, offset } = parsePagination(req.query);
    const { transaction_type, inventory_item_id } = req.query;
    const where = {};
    if (transaction_type && String(transaction_type).trim()) where.transaction_type = String(transaction_type).trim();
    if (inventory_item_id && String(inventory_item_id).trim()) where.inventory_item_id = String(inventory_item_id).trim();
    const { count, rows } = await InventoryTransaction.findAndCountAll({
      where,
      limit,
      offset,
      include: [{ model: InventoryItem, as: "item", attributes: ["id", "name", "unit", "pack_size"] }],
      order: [["transaction_date", "DESC"]],
    });
    return res.status(200).json({
      success: true,
      data: rows,
      pagination: { total: count, page, limit, totalPages: Math.ceil(count / limit) },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Error fetching inventory transactions",
      error: error.message,
    });
  }
};

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

    await auditLog(req, { action: "STOCK_IN_OUT", table_name: "InventoryTransaction", record_id: tx?.id });
    return res.status(201).json({
      success: true,
      data: { ...tx.toJSON(), effective_quantity: effectiveQuantity },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Error creating inventory transaction", error: error.message });
  }
};

module.exports = { getAll, stockInOut };

