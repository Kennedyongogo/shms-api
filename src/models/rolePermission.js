const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const RolePermission = sequelize.define(
    "RolePermission",
    {
      role_id: {
        type: DataTypes.UUID,
        allowNull: false,
        primaryKey: true,
        references: {
          model: "roles",
          key: "id",
        },
      },
      permission_id: {
        type: DataTypes.UUID,
        allowNull: false,
        primaryKey: true,
        references: {
          model: "permissions",
          key: "id",
        },
      },
    },
    {
      tableName: "role_permissions",
      timestamps: true,
      updatedAt: false,
      indexes: [{ fields: ["role_id"] }, { fields: ["permission_id"] }],
    }
  );

  return RolePermission;
};
