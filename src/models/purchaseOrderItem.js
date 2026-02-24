const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const PurchaseOrderItem = sequelize.define(
    "PurchaseOrderItem",
    {
      id: {
        type: DataTypes.UUID,
        primaryKey: true,
        defaultValue: DataTypes.UUIDV4,
      },
      purchase_order_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: "purchase_orders", key: "id" },
        onDelete: "CASCADE",
      },
      inventory_item_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: "inventory_items", key: "id" },
      },
      quantity_ordered: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 1,
      },
      unit_price: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: true,
        comment: "Price per unit when ordered (optional).",
      },
    },
    {
      tableName: "purchase_order_items",
      timestamps: true,
      indexes: [
        { fields: ["purchase_order_id"] },
        { fields: ["inventory_item_id"] },
      ],
    }
  );

  return PurchaseOrderItem;
};
