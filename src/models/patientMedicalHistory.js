const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const PatientMedicalHistory = sequelize.define(
    "PatientMedicalHistory",
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
      condition: {
        type: DataTypes.STRING(255),
        allowNull: false,
      },
      diagnosis_date: {
        type: DataTypes.DATEONLY,
        allowNull: true,
      },
      notes: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
    },
    {
      tableName: "patient_medical_history",
      timestamps: true,
      indexes: [{ fields: ["patient_id"] }],
    }
  );

  return PatientMedicalHistory;
};
