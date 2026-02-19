const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const BillItem = sequelize.define(
    "BillItem",
    {
      id: {
        type: DataTypes.UUID,
        primaryKey: true,
        defaultValue: DataTypes.UUIDV4,
      },
      bill_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: "bills", key: "id" },
      },
      item_type: {
        type: DataTypes.STRING(100),
        allowNull: false,
      },
      reference_id: {
        type: DataTypes.STRING(100),
        allowNull: true,
      },
      amount: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: false,
        defaultValue: 0,
      },
    },
    {
      tableName: "bill_items",
      timestamps: true,
      indexes: [{ fields: ["bill_id"] }, { fields: ["item_type"] }],
    }
  );

  return BillItem;
};
