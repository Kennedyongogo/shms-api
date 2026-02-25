const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const MealDeliveryLog = sequelize.define(
    "MealDeliveryLog",
    {
      id: {
        type: DataTypes.UUID,
        primaryKey: true,
        defaultValue: DataTypes.UUIDV4,
      },
      admission_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: "admissions", key: "id" },
      },
      meal_type: {
        type: DataTypes.STRING(50),
        allowNull: false,
      },
      date: {
        type: DataTypes.DATEONLY,
        allowNull: false,
      },
      delivered_by: {
        type: DataTypes.UUID,
        allowNull: true,
        references: { model: "staff", key: "id" },
      },
      status: {
        type: DataTypes.STRING(50),
        allowNull: false,
        defaultValue: "delivered",
      },
    },
    {
      tableName: "meal_delivery_logs",
      timestamps: true,
      indexes: [
        { fields: ["admission_id"] },
        { fields: ["date"] },
        { fields: ["delivered_by"] },
      ],
    }
  );

  return MealDeliveryLog;
};
