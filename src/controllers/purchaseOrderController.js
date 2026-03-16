const { PurchaseOrder, PurchaseOrderItem, Supplier, InventoryItem } = require("../models");
const { createCrudController } = require("../utils/crudControllerFactory");

const poInclude = [
  { model: Supplier, as: "supplier", attributes: ["id", "name", "phone", "email"] },
  {
    model: PurchaseOrderItem,
    as: "items",
    include: [{ model: InventoryItem, as: "inventoryItem", attributes: ["id", "name", "unit", "category"] }],
  },
];

const crud = createCrudController({
  Model: PurchaseOrder,
  name: "PurchaseOrder",
  searchableFields: ["status"],
  include: poInclude,
  scopeByHospital: true,
});

const create = async (req, res) => {
  try {
    const { supplier_id, order_date, status, items } = req.body;
    if (!supplier_id) {
      return res.status(400).json({ success: false, message: "supplier_id is required" });
    }
    const po = await PurchaseOrder.create({
      supplier_id,
      order_date: order_date ? new Date(order_date) : new Date(),
      status: status || "draft",
      hospital_id: req.user?.hospital_id || null,
    });
    if (Array.isArray(items) && items.length > 0) {
      const rows = items
        .filter((i) => i.inventory_item_id && (i.quantity_ordered == null || Number(i.quantity_ordered) > 0))
        .map((i) => ({
          purchase_order_id: po.id,
          inventory_item_id: i.inventory_item_id,
          quantity_ordered: Math.max(1, parseInt(i.quantity_ordered, 10) || 1),
          unit_price: i.unit_price != null && i.unit_price !== "" ? parseFloat(i.unit_price) : null,
        }));
      if (rows.length) await PurchaseOrderItem.bulkCreate(rows);
    }
    const withItems = await PurchaseOrder.findByPk(po.id, { include: poInclude });
    return res.status(201).json({ success: true, data: withItems });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Error creating purchase order",
      error: error.message,
    });
  }
};

const addItem = async (req, res) => {
  try {
    const { id } = req.params;
    const { inventory_item_id, quantity_ordered, unit_price } = req.body;
    const po = await PurchaseOrder.findByPk(id);
    if (!po) return res.status(404).json({ success: false, message: "Purchase order not found" });
    if (!inventory_item_id) {
      return res.status(400).json({ success: false, message: "inventory_item_id is required" });
    }
    const item = await PurchaseOrderItem.create({
      purchase_order_id: id,
      inventory_item_id,
      quantity_ordered: quantity_ordered != null ? Math.max(1, parseInt(quantity_ordered, 10) || 1) : 1,
      unit_price: unit_price != null && unit_price !== "" ? parseFloat(unit_price) : null,
    });
    const withItem = await PurchaseOrderItem.findByPk(item.id, {
      include: [{ model: InventoryItem, as: "inventoryItem", attributes: ["id", "name", "unit", "category"] }],
    });
    return res.status(201).json({ success: true, data: withItem });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Error adding line item",
      error: error.message,
    });
  }
};

const updateItem = async (req, res) => {
  try {
    const { id: orderId, itemId } = req.params;
    const { inventory_item_id, quantity_ordered, unit_price } = req.body;
    const line = await PurchaseOrderItem.findOne({
      where: { id: itemId, purchase_order_id: orderId },
    });
    if (!line) {
      return res.status(404).json({ success: false, message: "Line item not found" });
    }
    const updates = {};
    if (inventory_item_id != null) updates.inventory_item_id = inventory_item_id;
    if (quantity_ordered != null) {
      const q = parseInt(quantity_ordered, 10);
      if (!Number.isNaN(q) && q >= 1) updates.quantity_ordered = q;
    }
    if (unit_price !== undefined) {
      updates.unit_price = unit_price !== "" && unit_price != null ? parseFloat(unit_price) : null;
    }
    await line.update(updates);
    const withItem = await PurchaseOrderItem.findByPk(line.id, {
      include: [{ model: InventoryItem, as: "inventoryItem", attributes: ["id", "name", "unit", "category"] }],
    });
    return res.json({ success: true, data: withItem });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Error updating line item",
      error: error.message,
    });
  }
};

const deleteItem = async (req, res) => {
  try {
    const { id: orderId, itemId } = req.params;
    const line = await PurchaseOrderItem.findOne({
      where: { id: itemId, purchase_order_id: orderId },
    });
    if (!line) {
      return res.status(404).json({ success: false, message: "Line item not found" });
    }
    await line.destroy();
    return res.json({ success: true, message: "Line item deleted" });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Error deleting line item",
      error: error.message,
    });
  }
};

module.exports = {
  ...crud,
  create,
  addItem,
  updateItem,
  deleteItem,
};
