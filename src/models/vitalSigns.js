const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const VitalSigns = sequelize.define(
    "VitalSigns",
    {
      id: {
        type: DataTypes.UUID,
        primaryKey: true,
        defaultValue: DataTypes.UUIDV4,
      },
      consultation_id: {
        type: DataTypes.UUID,
        allowNull: false,
        unique: true,
        references: { model: "consultations", key: "id" },
      },
      temperature: {
        type: DataTypes.DECIMAL(5, 2),
        allowNull: true,
      },
      blood_pressure: {
        type: DataTypes.STRING(50),
        allowNull: true,
      },
      pulse: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      weight: {
        type: DataTypes.DECIMAL(7, 2),
        allowNull: true,
      },
      height: {
        type: DataTypes.DECIMAL(7, 2),
        allowNull: true,
      },
    },
    {
      tableName: "vital_signs",
      timestamps: true,
      indexes: [{ unique: true, fields: ["consultation_id"] }],
    }
  );

  return VitalSigns;
};
