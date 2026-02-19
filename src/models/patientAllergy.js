const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const PatientAllergy = sequelize.define(
    "PatientAllergy",
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
      allergy_name: {
        type: DataTypes.STRING(200),
        allowNull: false,
      },
      reaction: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },
    },
    {
      tableName: "patient_allergies",
      timestamps: true,
      indexes: [{ fields: ["patient_id"] }],
    }
  );

  return PatientAllergy;
};
