const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const NursingNote = sequelize.define(
    "NursingNote",
    {
      id: {
        type: DataTypes.UUID,
        primaryKey: true,
        defaultValue: DataTypes.UUIDV4,
      },
      admission_id: {
        type: DataTypes.UUID,
        allowNull: true,
        references: { model: "admissions", key: "id" },
      },
      patient_id: {
        type: DataTypes.UUID,
        allowNull: true,
        references: { model: "patients", key: "id" },
      },
      nurse_id: {
        type: DataTypes.UUID,
        allowNull: true,
        references: { model: "staff", key: "id" },
      },
      temperature: {
        type: DataTypes.DECIMAL(4, 1),
        allowNull: true,
      },
      blood_pressure: {
        type: DataTypes.STRING(20),
        allowNull: true,
      },
      pulse: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      respiratory_rate: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      pain_scale: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      notes: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      date_time: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      recorded_at: {
        type: DataTypes.DATE,
        allowNull: true,
        defaultValue: DataTypes.NOW,
      },
      hospital_id: {
        type: DataTypes.UUID,
        allowNull: true,
        references: { model: "hospitals", key: "id" },
      },
    },
    {
      tableName: "nursing_notes",
      timestamps: true,
      indexes: [
        { fields: ["admission_id"] },
        { fields: ["patient_id"] },
        { fields: ["nurse_id"] },
        { fields: ["date_time"] },
        { fields: ["recorded_at"] },
        { fields: ["hospital_id"] },
      ],
    }
  );

  return NursingNote;
};
