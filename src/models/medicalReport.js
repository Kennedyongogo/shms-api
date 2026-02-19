const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const MedicalReport = sequelize.define(
    "MedicalReport",
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
      report_text: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
    },
    {
      tableName: "medical_reports",
      timestamps: true,
      createdAt: "created_at",
      updatedAt: false,
      indexes: [
        { fields: ["patient_id"] },
        { fields: ["doctor_id"] },
        { fields: ["consultation_id"] },
      ],
    }
  );

  return MedicalReport;
};
