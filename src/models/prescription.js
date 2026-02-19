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
      prescription_date: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
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
      ],
    }
  );

  return Prescription;
};
