const { DataTypes } = require("sequelize");

/**
 * Registration package invoice (unpaid at signup, paid after Paystack).
 */
module.exports = (sequelize) => {
  const RegistrationInvoice = sequelize.define(
    "RegistrationInvoice",
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
      subscription_package: {
        type: DataTypes.ENUM("silver", "gold"),
        allowNull: false,
      },
      amount_kes_subunits: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      currency: {
        type: DataTypes.STRING(10),
        allowNull: false,
        defaultValue: "KES",
      },
      status: {
        type: DataTypes.ENUM("unpaid", "paid"),
        allowNull: false,
        defaultValue: "unpaid",
      },
      paid_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
    },
    {
      tableName: "registration_invoices",
      timestamps: true,
      indexes: [{ fields: ["hospital_id"] }, { fields: ["status"] }],
    }
  );

  return RegistrationInvoice;
};
