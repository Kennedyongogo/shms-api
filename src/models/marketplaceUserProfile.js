const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const MarketplaceUserProfile = sequelize.define(
    "MarketplaceUserProfile",
    {
      id: {
        type: DataTypes.UUID,
        primaryKey: true,
        defaultValue: DataTypes.UUIDV4,
      },
      userId: {
        type: DataTypes.UUID,
        allowNull: false,
        unique: true,
        references: { model: "marketplace_users", key: "id" },
        onDelete: "CASCADE",
        field: "user_id",
      },
      country: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      region: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      district: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      latitude: {
        type: DataTypes.DECIMAL(10, 8),
        allowNull: true,
        comment: "Latitude coordinate for user location",
      },
      longitude: {
        type: DataTypes.DECIMAL(11, 8),
        allowNull: true,
        comment: "Longitude coordinate for user location",
      },
      preferredLanguage: {
        type: DataTypes.STRING,
        allowNull: true,
        field: "preferred_language",
      },
      profilePhotoUrl: {
        type: DataTypes.STRING,
        allowNull: true,
        field: "profile_photo_url",
      },
      // Role-specific: farmer
      primaryActivity: {
        type: DataTypes.ENUM("crop", "livestock", "mixed", "aquaculture", "agro_processing", "other"),
        allowNull: true,
        field: "primary_activity",
      },
      produces: {
        type: DataTypes.JSON,
        allowNull: true,
        comment: "e.g. [\"maize\", \"beans\"] or livestock types",
      },
      scaleOfOperation: {
        type: DataTypes.ENUM("small", "medium", "large", "commercial", "industrial"),
        allowNull: true,
        field: "scale_of_operation",
      },
      farmOrBusinessName: {
        type: DataTypes.STRING,
        allowNull: true,
        field: "farm_or_business_name",
      },
      bio: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      // Extra role-specific data (buyer, input_supplier, veterinarian, consultant)
      roleSpecificData: {
        type: DataTypes.JSON,
        allowNull: true,
        field: "role_specific_data",
        comment: "e.g. { whatTheyBuy: [], specialization: '', coverageArea: '' }",
      },
      // Availability status (mainly for farmers)
      availability: {
        type: DataTypes.ENUM("available", "pre_order_only", "unavailable"),
        allowNull: true,
        comment: "Availability status for farmers (e.g., AVAILABLE, PRE-ORDER ONLY)",
      },
    },
    {
      tableName: "marketplace_user_profiles",
      timestamps: true,
      underscored: true,
      indexes: [
        { fields: ["user_id"] },
        { fields: ["latitude", "longitude"] },
        { fields: ["availability"] },
      ],
    }
  );

  return MarketplaceUserProfile;
};
