const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const MealPlan = sequelize.define(
    "MealPlan",
    {
      id: {
        type: DataTypes.UUID,
        primaryKey: true,
        defaultValue: DataTypes.UUIDV4,
      },
      diet_type_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: "diet_types", key: "id" },
      },
      breakfast: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      lunch: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      dinner: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      snack: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
    },
    {
      tableName: "meal_plans",
      timestamps: true,
      indexes: [{ fields: ["diet_type_id"] }],
    }
  );

  return MealPlan;
};
