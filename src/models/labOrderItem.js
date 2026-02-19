const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const LabOrderItem = sequelize.define(
    "LabOrderItem",
    {
      id: {
        type: DataTypes.UUID,
        primaryKey: true,
        defaultValue: DataTypes.UUIDV4,
      },
      lab_order_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: "lab_orders", key: "id" },
      },
      lab_test_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: "lab_tests", key: "id" },
      },
    },
    {
      tableName: "lab_order_items",
      timestamps: true,
      indexes: [{ fields: ["lab_order_id"] }, { fields: ["lab_test_id"] }],
    }
  );

  return LabOrderItem;
};
