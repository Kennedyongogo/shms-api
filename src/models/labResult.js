const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const LabResult = sequelize.define(
    "LabResult",
    {
      id: {
        type: DataTypes.UUID,
        primaryKey: true,
        defaultValue: DataTypes.UUIDV4,
      },
      lab_order_item_id: {
        type: DataTypes.UUID,
        allowNull: false,
        unique: true,
        references: { model: "lab_order_items", key: "id" },
      },
      result_value: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },
      reference_range: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },
      interpretation: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      lab_technician_id: {
        type: DataTypes.UUID,
        allowNull: true,
        references: { model: "staff", key: "id" },
      },
      result_date: {
        type: DataTypes.DATE,
        allowNull: true,
      },
    },
    {
      tableName: "lab_results",
      timestamps: true,
      indexes: [
        { unique: true, fields: ["lab_order_item_id"] },
        { fields: ["lab_technician_id"] },
        { fields: ["result_date"] },
      ],
    }
  );

  return LabResult;
};
