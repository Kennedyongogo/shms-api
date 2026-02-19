const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const PurchaseOrder = sequelize.define(
    "PurchaseOrder",
    {
      id: {
        type: DataTypes.UUID,
        primaryKey: true,
        defaultValue: DataTypes.UUIDV4,
      },
      supplier_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: "suppliers", key: "id" },
      },
      order_date: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
      status: {
        type: DataTypes.ENUM("draft", "ordered", "received", "cancelled"),
        allowNull: false,
        defaultValue: "draft",
      },
    },
    {
      tableName: "purchase_orders",
      timestamps: true,
      indexes: [{ fields: ["supplier_id"] }, { fields: ["status"] }, { fields: ["order_date"] }],
    }
  );

  return PurchaseOrder;
};
