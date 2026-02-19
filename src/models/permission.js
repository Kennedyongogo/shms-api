const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const Permission = sequelize.define(
    "Permission",
    {
      id: {
        type: DataTypes.UUID,
        primaryKey: true,
        defaultValue: DataTypes.UUIDV4,
      },
      name: {
        type: DataTypes.STRING(100),
        allowNull: false,
      },
      module: {
        type: DataTypes.STRING(100),
        allowNull: false,
      },
    },
    {
      tableName: "permissions",
      timestamps: true,
      indexes: [{ fields: ["module"] }, { fields: ["name"] }],
    }
  );

  return Permission;
};
