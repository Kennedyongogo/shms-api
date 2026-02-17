const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const MarketplaceListing = sequelize.define(
    "MarketplaceListing",
    {
      id: {
        type: DataTypes.UUID,
        primaryKey: true,
        defaultValue: DataTypes.UUIDV4,
      },
      userId: {
        type: DataTypes.UUID,
        allowNull: false,
        field: "user_id",
        references: {
          model: "marketplace_users",
          key: "id",
        },
        onDelete: "CASCADE",
      },
      title: {
        type: DataTypes.STRING(255),
        allowNull: false,
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      category: {
        type: DataTypes.STRING(128),
        allowNull: true,
      },
      price: {
        type: DataTypes.DECIMAL(14, 2),
        allowNull: true,
      },
      priceUnit: {
        type: DataTypes.STRING(32),
        allowNull: true,
        field: "price_unit",
      },
      quantity: {
        type: DataTypes.DECIMAL(14, 2),
        allowNull: true,
      },
      quantityUnit: {
        type: DataTypes.STRING(32),
        allowNull: true,
        field: "quantity_unit",
      },
      location: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },
      imageUrl: {
        type: DataTypes.STRING(512),
        allowNull: true,
        field: "image_url",
        comment: "Relative path (uploads/marketplace-listings/...) from file upload, or legacy URL",
      },
      status: {
        type: DataTypes.ENUM("pending_approval", "approved", "rejected"),
        allowNull: false,
        defaultValue: "pending_approval",
      },
      rejectedReason: {
        type: DataTypes.TEXT,
        allowNull: true,
        field: "rejected_reason",
      },
      approvedAt: {
        type: DataTypes.DATE,
        allowNull: true,
        field: "approved_at",
      },
      approvedBy: {
        type: DataTypes.UUID,
        allowNull: true,
        field: "approved_by",
        references: {
          model: "admin_users",
          key: "id",
        },
      },
    },
    {
      tableName: "marketplace_listings",
      timestamps: true,
      underscored: true,
      indexes: [
        { fields: ["user_id"] },
        { fields: ["status"] },
        { fields: ["category"] },
        { fields: ["created_at"] },
      ],
    }
  );

  return MarketplaceListing;
};
