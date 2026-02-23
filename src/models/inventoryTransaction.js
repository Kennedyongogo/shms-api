const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const InventoryTransaction = sequelize.define(
    "InventoryTransaction",
    {
      id: {
        type: DataTypes.UUID,
        primaryKey: true,
        defaultValue: DataTypes.UUIDV4,
      },
      inventory_item_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: "inventory_items", key: "id" },
      },
      transaction_type: {
        type: DataTypes.ENUM("in", "out", "adjustment"),
        allowNull: false,
      },
      quantity: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      unit_type: {
        type: DataTypes.STRING(20),
        allowNull: true,
        defaultValue: "unit",
        comment: "unit = quantity in base units (tablets/bottles); pack = quantity in packs (multiply by item.pack_size).",
      },
      transaction_date: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
    },
    {
      tableName: "inventory_transactions",
      timestamps: true,
      indexes: [
        { fields: ["inventory_item_id"] },
        { fields: ["transaction_type"] },
        { fields: ["transaction_date"] },
      ],
    }
  );

  return InventoryTransaction;
};
