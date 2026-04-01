const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const Hospital = sequelize.define(
    "Hospital",
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
      address: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      phone: {
        type: DataTypes.STRING(50),
        allowNull: true,
      },
      email: {
        type: DataTypes.STRING(200),
        allowNull: true,
        validate: { isEmail: true },
      },
      logo_path: {
        type: DataTypes.STRING(500),
        allowNull: true,
      },
      subscription_package: {
        type: DataTypes.ENUM("silver", "gold"),
        allowNull: false,
        defaultValue: "silver",
      },
      trial_ends_at: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: "End of package trial (Silver: 7 days, Gold: 14 days). After this, a paid 30-day subscription is required for login.",
      },
      subscription_ends_at: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: "End of current paid period. When past, all users in this hospital are blocked from login until renewed.",
      },
      primary_color: {
        type: DataTypes.STRING(20),
        allowNull: true,
        defaultValue: "#00897B",
      },
      registration_paystack_reference: {
        type: DataTypes.STRING(255),
        allowNull: true,
        unique: true,
        comment: "Paystack transaction reference used when this hospital was created (prevents reuse).",
      },
    },
    {
      tableName: "hospitals",
      timestamps: true,
      indexes: [
        { fields: ["name"] },
        { fields: ["subscription_package"] },
        { fields: ["trial_ends_at"] },
        { fields: ["subscription_ends_at"] },
      ],
    }
  );

  return Hospital;
};
