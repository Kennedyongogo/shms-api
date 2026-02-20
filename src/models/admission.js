const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const Admission = sequelize.define(
    "Admission",
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
      appointment_id: {
        type: DataTypes.UUID,
        allowNull: true,
        references: { model: "appointments", key: "id" },
      },
      doctor_id: {
        type: DataTypes.UUID,
        allowNull: true,
        references: { model: "staff", key: "id" },
      },
      bed_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: "beds", key: "id" },
      },
      admission_date: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
      discharge_date: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      status: {
        type: DataTypes.ENUM("admitted", "discharged", "transferred", "cancelled"),
        allowNull: false,
        defaultValue: "admitted",
      },
    },
    {
      tableName: "admissions",
      timestamps: true,
      indexes: [
        { fields: ["patient_id"] },
        { fields: ["appointment_id"] },
        { fields: ["doctor_id"] },
        { fields: ["bed_id"] },
        { fields: ["status"] },
        { fields: ["admission_date"] },
      ],
    }
  );

  return Admission;
};
