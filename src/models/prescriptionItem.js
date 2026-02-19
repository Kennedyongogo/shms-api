const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const PrescriptionItem = sequelize.define(
    "PrescriptionItem",
    {
      id: {
        type: DataTypes.UUID,
        primaryKey: true,
        defaultValue: DataTypes.UUIDV4,
      },
      prescription_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: "prescriptions", key: "id" },
      },
      medication_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: "medications", key: "id" },
      },
      dosage: {
        type: DataTypes.STRING(100),
        allowNull: true,
      },
      frequency: {
        type: DataTypes.STRING(100),
        allowNull: true,
      },
      duration: {
        type: DataTypes.STRING(100),
        allowNull: true,
      },
    },
    {
      tableName: "prescription_items",
      timestamps: true,
      indexes: [{ fields: ["prescription_id"] }, { fields: ["medication_id"] }],
    }
  );

  return PrescriptionItem;
};
