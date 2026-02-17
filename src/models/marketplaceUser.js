const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const MarketplaceUser = sequelize.define(
    "MarketplaceUser",
    {
      id: {
        type: DataTypes.UUID,
        primaryKey: true,
        defaultValue: DataTypes.UUIDV4,
      },
      email: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
        validate: { isEmail: true },
      },
      phone: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      password: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      fullName: {
        type: DataTypes.STRING,
        allowNull: false,
        field: "full_name",
      },
      termsAcceptedAt: {
        type: DataTypes.DATE,
        allowNull: false,
        field: "terms_accepted_at",
      },
      privacyAcceptedAt: {
        type: DataTypes.DATE,
        allowNull: false,
        field: "privacy_accepted_at",
      },
      profileCompleted: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        field: "profile_completed",
      },
      profileCompletedAt: {
        type: DataTypes.DATE,
        allowNull: true,
        field: "profile_completed_at",
      },
      role: {
        type: DataTypes.ENUM(
          "farmer",
          "buyer",
          "input_supplier",
          "veterinarian",
          "consultant"
        ),
        allowNull: true,
        comment: "Set on profile completion",
      },
      status: {
        type: DataTypes.ENUM("pending_profile", "active"),
        allowNull: false,
        defaultValue: "pending_profile",
      },
      lastLogin: {
        type: DataTypes.DATE,
        allowNull: true,
        field: "last_login",
      },
      isVerified: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        field: "is_verified",
        comment: "Whether the user is MK-verified (for display in Farmers Hub and Veterinary Services)",
      },
    },
    {
      tableName: "marketplace_users",
      timestamps: true,
      underscored: true,
      indexes: [
        { fields: ["email"] },
        { fields: ["status"] },
        { fields: ["role"] },
        { fields: ["is_verified"] },
      ],
    }
  );

  return MarketplaceUser;
};
