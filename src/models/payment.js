const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const Payment = sequelize.define(
    "Payment",
    {
      id: {
        type: DataTypes.UUID,
        primaryKey: true,
        defaultValue: DataTypes.UUIDV4,
      },
      bill_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: "bills", key: "id" },
      },
      amount_paid: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: false,
        defaultValue: 0,
      },
      payment_method: {
        type: DataTypes.STRING(100),
        allowNull: false,
      },
      payment_date: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
    },
    {
      tableName: "payments",
      timestamps: true,
      indexes: [{ fields: ["bill_id"] }, { fields: ["payment_date"] }],
    }
  );

  return Payment;
};
