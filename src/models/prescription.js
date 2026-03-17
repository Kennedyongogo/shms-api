const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const Prescription = sequelize.define(
    "Prescription",
    {
      id: {
        type: DataTypes.UUID,
        primaryKey: true,
        defaultValue: DataTypes.UUIDV4,
      },
      patient_id: {
        type: DataTypes.UUID,
        allowNull: true,
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
      prescription_date: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
      source: {
        type: DataTypes.STRING(32),
        allowNull: false,
        defaultValue: "clinic", // clinic | pos | external
      },
      hospital_id: {
        type: DataTypes.UUID,
        allowNull: true,
        references: { model: "hospitals", key: "id" },
      },
    },
    {
      tableName: "prescriptions",
      timestamps: true,
      indexes: [
        { fields: ["patient_id"] },
        { fields: ["doctor_id"] },
        { fields: ["consultation_id"] },
        { fields: ["prescription_date"] },
        { fields: ["hospital_id"] },
        { fields: ["source"] },
      ],
    }
  );

  return Prescription;
};
