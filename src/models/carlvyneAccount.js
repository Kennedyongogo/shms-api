const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const CarlvyneAccount = sequelize.define(
    "CarlvyneAccount",
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
      email: {
        type: DataTypes.STRING(200),
        allowNull: true,
        validate: { isEmail: true },
      },
      phone_number: {
        type: DataTypes.STRING(50),
        allowNull: true,
      },
      password: {
        type: DataTypes.STRING(255),
        allowNull: true,
        comment: "Bcrypt hash for M&E portal login",
      },
      profile_picture_path: {
        type: DataTypes.STRING(500),
        allowNull: true,
      },
      // Social media links
      facebook_url: {
        type: DataTypes.STRING(500),
        allowNull: true,
      },
      twitter_url: {
        type: DataTypes.STRING(500),
        allowNull: true,
      },
      linkedin_url: {
        type: DataTypes.STRING(500),
        allowNull: true,
      },
      instagram_url: {
        type: DataTypes.STRING(500),
        allowNull: true,
      },
      website_url: {
        type: DataTypes.STRING(500),
        allowNull: true,
      },
      // Optional design/branding (for owner profile display)
      primary_color: {
        type: DataTypes.STRING(20),
        allowNull: true,
      },
      bio: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      is_active: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
    },
    {
      tableName: "carlvyne_accounts",
      timestamps: true,
      defaultScope: {
        attributes: { exclude: ["password"] },
      },
      indexes: [
        { fields: ["name"] },
        { fields: ["email"] },
        { fields: ["is_active"] },
      ],
    }
  );

  CarlvyneAccount.prototype.toJSON = function () {
    const values = { ...this.get() };
    delete values.password;
    return values;
  };

  return CarlvyneAccount;
};
