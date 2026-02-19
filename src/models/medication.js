const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const Medication = sequelize.define(
    "Medication",
    {
      id: {
        type: DataTypes.UUID,
        primaryKey: true,
        defaultValue: DataTypes.UUIDV4,
      },
      name: {
        type: DataTypes.STRING(200),
        allowNull: false,
      },
      dosage_form: {
        type: DataTypes.STRING(100),
        allowNull: true,
      },
      manufacturer: {
        type: DataTypes.STRING(200),
        allowNull: true,
      },
      unit_price: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: true,
      },
    },
    {
      tableName: "medications",
      timestamps: true,
      indexes: [{ fields: ["name"] }],
    }
  );

  return Medication;
};
