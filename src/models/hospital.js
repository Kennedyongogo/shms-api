const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const Hospital = sequelize.define(
    "Hospital",
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
      address: {
        type: DataTypes.TEXT,
        allowNull: true,
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
      logo_path: {
        type: DataTypes.STRING(500),
        allowNull: true,
      },
      subscription_package: {
        type: DataTypes.ENUM("silver", "gold"),
        allowNull: false,
        defaultValue: "silver",
      },
      primary_color: {
        type: DataTypes.STRING(20),
        allowNull: true,
        defaultValue: "#00897B",
      },
    },
    {
      tableName: "hospitals",
      timestamps: true,
      indexes: [{ fields: ["name"] }, { fields: ["subscription_package"] }],
    }
  );

  return Hospital;
};
