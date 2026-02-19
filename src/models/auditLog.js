const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const AuditLog = sequelize.define(
    "AuditLog",
    {
      id: {
        type: DataTypes.UUID,
        primaryKey: true,
        defaultValue: DataTypes.UUIDV4,
      },
      user_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: "users", key: "id" },
      },
      action: {
        type: DataTypes.STRING(255),
        allowNull: false,
      },
      table_name: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },
      record_id: {
        type: DataTypes.STRING(100),
        allowNull: true,
      },
    },
    {
      tableName: "audit_logs",
      timestamps: true,
      createdAt: "timestamp",
      updatedAt: false,
      indexes: [{ fields: ["user_id"] }, { fields: ["table_name"] }, { fields: ["timestamp"] }],
    }
  );

  return AuditLog;
};
