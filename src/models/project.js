const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const Project = sequelize.define(
    "Project",
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
        comment: "URL-friendly identifier for the project",
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
      location: {
        type: DataTypes.STRING,
        allowNull: false,
        comment: "Project location (e.g., 'Kiambu County, Kenya')",
      },
      image: {
        type: DataTypes.STRING(500),
        allowNull: true,
        comment: "Main image path (relative path from uploads directory)",
      },
      imageAltText: {
        type: DataTypes.STRING(200),
        allowNull: true,
        comment: "Alt text for the project image for accessibility",
      },
      tags: {
        type: DataTypes.JSON,
        allowNull: false,
        defaultValue: [],
        comment: "Array of tag strings (e.g., ['5-ton production', 'Zero Waste'])",
      },
      category: {
        type: DataTypes.ENUM(
          "Waste Management",
          "Dairy Value Chain",
          "Ag-Tech",
          "Irrigation",
          "Other"
        ),
        allowNull: true,
        comment: "Project category for filtering",
      },
      featured: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        comment: "Whether project is featured",
      },
      priority: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        comment: "Overall priority for sorting (higher = more important)",
      },
      displayOrder: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        comment: "Controls ordering within the same category",
      },
      status: {
        type: DataTypes.ENUM("draft", "published", "archived"),
        allowNull: false,
        defaultValue: "draft",
        comment: "Content publishing status",
      },
      projectStatus: {
        type: DataTypes.ENUM("pending", "ongoing", "completed", "cancelled", "on_hold"),
        allowNull: false,
        defaultValue: "pending",
        comment: "Project execution status (pending, ongoing, completed, cancelled, on_hold)",
      },
      // Additional content fields
      fullContent: {
        type: DataTypes.TEXT("long"),
        allowNull: true,
        comment: "Full detailed content for project detail page",
      },
      // Project details
      clientName: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: "Name of client/organization",
      },
      startDate: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: "Project start date",
      },
      endDate: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: "Project end date",
      },
      impactMetrics: {
        type: DataTypes.JSON,
        allowNull: true,
        defaultValue: [],
        comment: "Array of impact metrics/statistics",
      },
      farmersTrained: {
        type: DataTypes.INTEGER,
        allowNull: true,
        comment: "Number of farmers trained in this project (for stats aggregation)",
      },
      roiIncreasePercent: {
        type: DataTypes.DECIMAL(5, 2),
        allowNull: true,
        comment: "ROI increase percentage achieved (e.g. 25 for 25%)",
      },
      // Map/Location data for CharityMap component
      latitude: {
        type: DataTypes.DECIMAL(10, 8),
        allowNull: true,
        comment: "Latitude for map marker",
      },
      longitude: {
        type: DataTypes.DECIMAL(11, 8),
        allowNull: true,
        comment: "Longitude for map marker",
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
      tableName: "projects",
      timestamps: true,
      paranoid: true,
      indexes: [
        { unique: true, fields: ["slug"] },
        { fields: ["category"] },
        { fields: ["status"] },
        { fields: ["projectStatus"] },
        { fields: ["featured"] },
        { fields: ["displayOrder"] },
        { fields: ["priority"] },
        { fields: ["latitude", "longitude"] },
      ],
    }
  );

  return Project;
};
