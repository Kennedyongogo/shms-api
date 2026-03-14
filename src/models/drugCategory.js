const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const DrugCategory = sequelize.define(
    "DrugCategory",
    {
      id: {
        type: DataTypes.UUID,
        primaryKey: true,
        defaultValue: DataTypes.UUIDV4,
      },
      name: {
        type: DataTypes.STRING(500),
        allowNull: false,
        comment: "Category or subcategory name (e.g. 'Muscle relaxants', '2.1 Muscle relaxants').",
      },
      parent_id: {
        type: DataTypes.UUID,
        allowNull: true,
        references: { model: "drug_categories", key: "id" },
        onDelete: "SET NULL",
        comment: "Parent category for subcategories; null for top-level sections.",
      },
      code: {
        type: DataTypes.STRING(50),
        allowNull: true,
        comment: "Section code for ordering (e.g. '2', '2.1', '7.2.1').",
      },
      sort_order: {
        type: DataTypes.INTEGER,
        allowNull: true,
        defaultValue: 0,
        comment: "Display order within parent.",
      },
    },
    {
      tableName: "drug_categories",
      timestamps: true,
      indexes: [
        { fields: ["parent_id"] },
        { fields: ["code"] },
        { fields: ["sort_order"] },
      ],
    }
  );

  return DrugCategory;
};
