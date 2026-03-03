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
        comment: "Stock in main store / general inventory.",
      },
      quantity_in_pharmacy: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        comment: "Stock transferred to pharmacy for dispensing.",
      },
      reorder_level: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      unit: {
        type: DataTypes.STRING(50),
        allowNull: true,
        comment: "Unit of measure: tablet, bottle, pack, box, ml, etc.",
      },
      pack_size: {
        type: DataTypes.INTEGER,
        allowNull: true,
        comment: "Units per pack when supplied in packs (e.g. 20 tablets per packet).",
      },
      hospital_id: {
        type: DataTypes.UUID,
        allowNull: true,
        references: { model: "hospitals", key: "id" },
      },
    },
    {
      tableName: "inventory_items",
      timestamps: true,
      indexes: [{ fields: ["name"] }, { fields: ["category"] }, { fields: ["hospital_id"] }],
    }
  );

  return InventoryItem;
};
