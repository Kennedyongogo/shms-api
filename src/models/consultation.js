const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const Consultation = sequelize.define(
    "Consultation",
    {
      id: {
        type: DataTypes.UUID,
        primaryKey: true,
        defaultValue: DataTypes.UUIDV4,
      },
      appointment_id: {
        type: DataTypes.UUID,
        allowNull: false,
        unique: true,
        references: { model: "appointments", key: "id" },
      },
      symptoms: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      diagnosis: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      notes: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
    },
    {
      tableName: "consultations",
      timestamps: true,
      indexes: [
        { unique: true, fields: ["appointment_id"] },
      ],
    }
  );

  return Consultation;
};
