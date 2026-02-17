const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const Service = sequelize.define(
    "Service",
    {
      id: {
        type: DataTypes.UUID,
        primaryKey: true,
        defaultValue: DataTypes.UUIDV4,
      },
      slug: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
        comment: "URL-friendly identifier for the service",
      },
      title: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
          notEmpty: true,
          len: [2, 200],
        },
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: false,
        validate: {
          notEmpty: true,
        },
      },
      shortDescription: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: "Brief description for cards/previews",
      },
      image: {
        type: DataTypes.STRING(500),
        allowNull: true,
        comment: "Main image path (relative path from uploads directory)",
      },
      imageAltText: {
        type: DataTypes.STRING(200),
        allowNull: true,
        comment: "Alt text for the service image accessibility",
      },
      icon: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: "Material-UI icon component name (e.g., 'Architecture', 'Description')",
      },
      isKeyService: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        comment: "If true, service appears in KeyServicesSection on home page",
      },
      badgeLabel: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: "Optional badge label (e.g., 'Specialized', 'Innovative')",
      },
      badgeColor: {
        type: DataTypes.ENUM("primary", "info", "success", "warning", "error"),
        allowNull: true,
        comment: "Badge color for display",
      },
      displayOrder: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        comment: "Controls ordering within the same service type (key vs general)",
      },
      priority: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        comment: "Overall priority for sorting (higher = more important)",
      },
      status: {
        type: DataTypes.ENUM("draft", "published", "archived"),
        allowNull: false,
        defaultValue: "draft",
      },
      featured: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        comment: "Whether service is featured",
      },
      // SEO fields
      metaTitle: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: "SEO meta title",
      },
      metaDescription: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: "SEO meta description",
      },
      // Additional content fields
      fullContent: {
        type: DataTypes.TEXT("long"),
        allowNull: true,
        comment: "Full detailed content for service detail page",
      },
      benefits: {
        type: DataTypes.JSON,
        allowNull: true,
        defaultValue: [],
        comment: "Array of benefit strings",
      },
      useCases: {
        type: DataTypes.JSON,
        allowNull: true,
        defaultValue: [],
        comment: "Array of use case strings",
      },
      relatedServiceIds: {
        type: DataTypes.JSON,
        allowNull: false,
        defaultValue: [],
        comment: "Array of related service IDs (UUIDs)",
      },
      // Analytics
      views: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      // Audit fields
      created_by: {
        type: DataTypes.UUID,
        allowNull: true,
        references: {
          model: "admin_users",
          key: "id",
        },
      },
      updated_by: {
        type: DataTypes.UUID,
        allowNull: true,
        references: {
          model: "admin_users",
          key: "id",
        },
      },
      isDeleted: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
    },
    {
      tableName: "services",
      timestamps: true,
      paranoid: true,
      indexes: [
        { unique: true, fields: ["slug"] },
        { fields: ["isKeyService"] },
        { fields: ["status"] },
        { fields: ["featured"] },
        { fields: ["displayOrder"] },
        { fields: ["priority"] },
      ],
    }
  );

  return Service;
};
