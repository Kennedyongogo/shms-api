const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const Bed = sequelize.define(
    "Bed",
    {
      id: {
        type: DataTypes.UUID,
        primaryKey: true,
        defaultValue: DataTypes.UUIDV4,
      },
      ward_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: "wards", key: "id" },
      },
      bed_number: {
        type: DataTypes.STRING(50),
        allowNull: false,
      },
      status: {
        type: DataTypes.ENUM("available", "occupied", "maintenance"),
        allowNull: false,
        defaultValue: "available",
      },
    },
    {
      tableName: "beds",
      timestamps: true,
      indexes: [{ fields: ["ward_id"] }, { fields: ["status"] }],
    }
  );

  return Bed;
};
