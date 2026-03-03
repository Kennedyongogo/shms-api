const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const Bill = sequelize.define(
    "Bill",
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
      consultation_id: {
        type: DataTypes.UUID,
        allowNull: true,
        references: { model: "consultations", key: "id" },
      },
      appointment_id: {
        type: DataTypes.UUID,
        allowNull: true,
        references: { model: "appointments", key: "id" },
      },
      total_amount: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: false,
        defaultValue: 0,
      },
      status: {
        type: DataTypes.ENUM("unpaid", "partial", "paid", "cancelled"),
        allowNull: false,
        defaultValue: "unpaid",
      },
      hospital_id: {
        type: DataTypes.UUID,
        allowNull: true,
        references: { model: "hospitals", key: "id" },
      },
    },
    {
      tableName: "bills",
      timestamps: true,
      indexes: [
        { fields: ["patient_id"] },
        { fields: ["consultation_id"] },
        { fields: ["appointment_id"] },
        { fields: ["status"] },
        { fields: ["hospital_id"] },
      ],
    }
  );

  return Bill;
};
