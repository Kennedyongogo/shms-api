const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const Ward = sequelize.define(
    "Ward",
    {
      id: {
        type: DataTypes.UUID,
        primaryKey: true,
        defaultValue: DataTypes.UUIDV4,
      },
      department_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: "departments", key: "id" },
      },
      name: {
        type: DataTypes.STRING(200),
        allowNull: false,
      },
      type: {
        type: DataTypes.STRING(100),
        allowNull: true,
      },
    },
    {
      tableName: "wards",
      timestamps: true,
      indexes: [{ fields: ["department_id"] }],
    }
  );

  return Ward;
};
