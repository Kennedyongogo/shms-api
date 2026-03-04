const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const MpesaSetting = sequelize.define(
    "MpesaSetting",
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
      environment: {
        type: DataTypes.ENUM("sandbox", "production"),
        allowNull: false,
        defaultValue: "sandbox",
      },
      payment_type: {
        type: DataTypes.ENUM("paybill", "till"),
        allowNull: false,
        defaultValue: "paybill",
      },
      shortcode: {
        type: DataTypes.STRING(50),
        allowNull: false,
      },
      consumer_key: {
        type: DataTypes.STRING(255),
        allowNull: false,
      },
      consumer_secret: {
        type: DataTypes.STRING(255),
        allowNull: false,
      },
      passkey: {
        type: DataTypes.STRING(255),
        allowNull: false,
      },
      callback_url: {
        type: DataTypes.STRING(500),
        allowNull: true,
      },
      is_active: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
    },
    {
      tableName: "mpesa_settings",
      timestamps: true,
      indexes: [
        { unique: true, fields: ["hospital_id"] },
        { fields: ["shortcode"] },
        { fields: ["environment"] },
      ],
    }
  );

  return MpesaSetting;
};

