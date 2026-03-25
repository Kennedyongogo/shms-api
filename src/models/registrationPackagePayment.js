const { DataTypes } = require("sequelize");

/**
 * Paystack package payment at hospital self-registration (Silver/Gold).
 * Separate from billing `payments` (which require a patient bill).
 */
module.exports = (sequelize) => {
  const RegistrationPackagePayment = sequelize.define(
    "RegistrationPackagePayment",
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
      paystack_reference: {
        type: DataTypes.STRING(255),
        allowNull: false,
        unique: true,
        comment: "Paystack transaction reference (same as stored on hospitals.registration_paystack_reference)",
      },
      paystack_transaction_id: {
        type: DataTypes.STRING(64),
        allowNull: true,
        comment: "Paystack transaction id from verify API (data.id)",
      },
      payer_email: {
        type: DataTypes.STRING(200),
        allowNull: false,
      },
      subscription_package: {
        type: DataTypes.ENUM("silver", "gold"),
        allowNull: false,
      },
      /** Amount in KES smallest units (cents), as returned by Paystack */
      amount_kes_subunits: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      currency: {
        type: DataTypes.STRING(10),
        allowNull: false,
        defaultValue: "KES",
      },
      paid_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      channel: {
        type: DataTypes.STRING(50),
        allowNull: true,
        comment: "Paystack channel e.g. card, bank",
      },
      paystack_customer_code: {
        type: DataTypes.STRING(100),
        allowNull: true,
      },
      raw_paystack_data: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: "Optional JSON string of key fields from Paystack verify response for audit",
      },
    },
    {
      tableName: "registration_package_payments",
      timestamps: true,
      indexes: [
        { fields: ["hospital_id"] },
        { fields: ["payer_email"] },
        { fields: ["paid_at"] },
        { fields: ["subscription_package"] },
      ],
    }
  );

  return RegistrationPackagePayment;
};
