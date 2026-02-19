const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const InsuranceClaim = sequelize.define(
    "InsuranceClaim",
    {
      id: {
        type: DataTypes.UUID,
        primaryKey: true,
        defaultValue: DataTypes.UUIDV4,
      },
      patient_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: "patients", key: "id" },
      },
      bill_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: "bills", key: "id" },
      },
      insurance_provider: {
        type: DataTypes.STRING(200),
        allowNull: false,
      },
      claim_status: {
        type: DataTypes.ENUM("draft", "submitted", "approved", "rejected", "paid"),
        allowNull: false,
        defaultValue: "draft",
      },
    },
    {
      tableName: "insurance_claims",
      timestamps: true,
      indexes: [{ fields: ["patient_id"] }, { fields: ["bill_id"] }, { fields: ["claim_status"] }],
    }
  );

  return InsuranceClaim;
};
