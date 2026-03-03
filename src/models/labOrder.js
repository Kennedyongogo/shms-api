const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const LabOrder = sequelize.define(
    "LabOrder",
    {
      id: {
        type: DataTypes.UUID,
        primaryKey: true,
        defaultValue: DataTypes.UUIDV4,
      },
      patient_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: "patients", key: "id" },
      },
      doctor_id: {
        type: DataTypes.UUID,
        allowNull: true,
        references: { model: "staff", key: "id" },
      },
      consultation_id: {
        type: DataTypes.UUID,
        allowNull: true,
        references: { model: "consultations", key: "id" },
      },
      status: {
        type: DataTypes.ENUM("pending", "in_progress", "completed", "cancelled"),
        allowNull: false,
        defaultValue: "pending",
      },
      hospital_id: {
        type: DataTypes.UUID,
        allowNull: true,
        references: { model: "hospitals", key: "id" },
      },
    },
    {
      tableName: "lab_orders",
      timestamps: true,
      indexes: [
        { fields: ["patient_id"] },
        { fields: ["doctor_id"] },
        { fields: ["consultation_id"] },
        { fields: ["status"] },
        { fields: ["hospital_id"] },
      ],
    }
  );

  return LabOrder;
};
