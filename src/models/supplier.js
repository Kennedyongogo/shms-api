const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const Supplier = sequelize.define(
    "Supplier",
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
      phone: {
        type: DataTypes.STRING(50),
        allowNull: true,
      },
      email: {
        type: DataTypes.STRING(200),
        allowNull: true,
        validate: { isEmail: true },
      },
      address: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
    },
    {
      tableName: "suppliers",
      timestamps: true,
      indexes: [{ fields: ["name"] }],
    }
  );

  return Supplier;
};
