const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const RoleMenuItem = sequelize.define(
    "RoleMenuItem",
    {
      role_id: {
        type: DataTypes.UUID,
        allowNull: false,
        primaryKey: true,
        references: { model: "roles", key: "id" },
        onDelete: "CASCADE",
      },
      menu_key: {
        type: DataTypes.STRING(50),
        allowNull: false,
        primaryKey: true,
      },
    },
    {
      tableName: "role_menu_items",
      timestamps: false,
      indexes: [
        { fields: ["role_id"] },
        { unique: true, fields: ["role_id", "menu_key"] },
      ],
    }
  );

  return RoleMenuItem;
};
