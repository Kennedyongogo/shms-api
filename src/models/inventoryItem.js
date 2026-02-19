const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const InventoryItem = sequelize.define(
    "InventoryItem",
    {
      id: {
        type: DataTypes.UUID,
        primaryKey: true,
        defaultValue: DataTypes.UUIDV4,
      },
      name: {
        type: DataTypes.STRING(200),
        allowNull: false,
      },
      category: {
        type: DataTypes.STRING(100),
        allowNull: true,
      },
      quantity_available: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      reorder_level: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
    },
    {
      tableName: "inventory_items",
      timestamps: true,
      indexes: [{ fields: ["name"] }, { fields: ["category"] }],
    }
  );

  return InventoryItem;
};
