const { DataTypes } = require("sequelize");

/**
 * Dose-form and strength per drug (Kenya Essential Medicines List format).
 * E.g. Paracetamol: Tablet 500mg, Oral liquid 120mg/5mL, Suppository 125mg.
 */
module.exports = (sequelize) => {
  const DrugFormulation = sequelize.define(
    "DrugFormulation",
    {
      id: {
        type: DataTypes.UUID,
        primaryKey: true,
        defaultValue: DataTypes.UUIDV4,
      },
      drug_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: "drugs", key: "id" },
        onDelete: "CASCADE",
      },
      dose_form: {
        type: DataTypes.STRING(100),
        allowNull: false,
        comment: "Dose-form: Tablet, Oral liquid, Injection, Capsule, PFI, Suppository, etc.",
      },
      strength_size: {
        type: DataTypes.STRING(300),
        allowNull: true,
        comment: "Strength / Size (e.g. 300mg, 100mg/5mL, 10mg/mL (5mL amp)).",
      },
      lou: {
        type: DataTypes.INTEGER,
        allowNull: true,
        comment: "Level of Use (Kenya EML 2023).",
      },
      sort_order: {
        type: DataTypes.INTEGER,
        allowNull: true,
        defaultValue: 0,
      },
    },
    {
      tableName: "drug_formulations",
      timestamps: true,
      indexes: [
        { fields: ["drug_id"] },
        { fields: ["dose_form"] },
      ],
    }
  );

  return DrugFormulation;
};
