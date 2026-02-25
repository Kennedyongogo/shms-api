const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const DietType = sequelize.define(
    "DietType",
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
      description: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
    },
    {
      tableName: "diet_types",
      timestamps: true,
      indexes: [{ fields: ["name"] }],
    }
  );

  return DietType;
};
