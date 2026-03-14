const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const Medication = sequelize.define(
    "Medication",
    {
      id: {
        type: DataTypes.UUID,
        primaryKey: true,
        defaultValue: DataTypes.UUIDV4,
      },
      name: {
        type: DataTypes.STRING(200),
        allowNull: false,
      },
      dosage_form: {
        type: DataTypes.STRING(100),
        allowNull: true,
      },
      manufacturer: {
        type: DataTypes.STRING(200),
        allowNull: true,
      },
      unit_price: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: true,
      },
      unit: {
        type: DataTypes.STRING(50),
        allowNull: true,
        comment: "Unit for silver hospitals (e.g. tablet, bottle, ml).",
      },
      pack_size: {
        type: DataTypes.INTEGER,
        allowNull: true,
        comment: "Units per pack for silver hospitals (e.g. 20 tablets per pack).",
      },
      inventory_item_id: {
        type: DataTypes.UUID,
        allowNull: true,
        references: { model: "inventory_items", key: "id" },
      },
      initial_quantity: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        comment: "Initial stock for silver package hospitals when inventory module is not used.",
      },
      current_quantity: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        comment: "Current stock for silver package hospitals; decremented on dispensing.",
      },
      hospital_id: {
        type: DataTypes.UUID,
        allowNull: true,
        references: { model: "hospitals", key: "id" },
      },
      drug_id: {
        type: DataTypes.UUID,
        allowNull: true,
        references: { model: "drugs", key: "id" },
        onDelete: "SET NULL",
        comment: "Optional link to catalogue drug (medicine list). When set, medication is linked to this drug.",
      },
      drug_formulation_id: {
        type: DataTypes.UUID,
        allowNull: true,
        references: { model: "drug_formulations", key: "id" },
        onDelete: "SET NULL",
        comment: "Optional link to catalogue formulation (e.g. Tablet 500mg). Can pre-fill dosage form.",
      },
    },
    {
      tableName: "medications",
      timestamps: true,
      indexes: [
        { fields: ["name"] },
        { fields: ["inventory_item_id"] },
        { fields: ["hospital_id"] },
        { fields: ["drug_id"] },
        { fields: ["drug_formulation_id"] },
      ],
    }
  );

  return Medication;
};
