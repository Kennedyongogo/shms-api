const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const SystemSetting = sequelize.define(
    "SystemSetting",
    {
      id: {
        type: DataTypes.UUID,
        primaryKey: true,
        defaultValue: DataTypes.UUIDV4,
      },
      hospital_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: "hospitals", key: "id" },
      },
      setting_key: {
        type: DataTypes.STRING(200),
        allowNull: false,
      },
      setting_value: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
    },
    {
      tableName: "system_settings",
      timestamps: true,
      indexes: [{ unique: true, fields: ["hospital_id", "setting_key"] }],
    }
  );

  return SystemSetting;
};
