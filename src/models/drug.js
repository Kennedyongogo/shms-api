const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const Drug = sequelize.define(
    "Drug",
    {
      id: {
        type: DataTypes.UUID,
        primaryKey: true,
        defaultValue: DataTypes.UUIDV4,
      },
      drug_category_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: "drug_categories", key: "id" },
        onDelete: "CASCADE",
        comment: "Category or subcategory this drug belongs to.",
      },
      name: {
        type: DataTypes.STRING(300),
        allowNull: false,
        comment: "Drug name (e.g. Atracurium, Paracetamol).",
      },
      formulations: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: "Legacy: single text. Prefer drug_formulations table (dose_form + strength_size).",
      },
      sort_order: {
        type: DataTypes.INTEGER,
        allowNull: true,
        defaultValue: 0,
        comment: "Display order within category.",
      },
    },
    {
      tableName: "drugs",
      timestamps: true,
      indexes: [
        { fields: ["drug_category_id"] },
        { fields: ["drug_category_id", "sort_order"] },
        { fields: ["name"] },
        { fields: ["sort_order"] },
      ],
    }
  );

  return Drug;
};
