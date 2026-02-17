const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const QuoteRequest = sequelize.define(
    "QuoteRequest",
    {
      id: {
        type: DataTypes.UUID,
        primaryKey: true,
        defaultValue: DataTypes.UUIDV4,
      },
      projectType: {
        type: DataTypes.ENUM(
          "Crop",
          "Livestock",
          "BSF",
          "Mixed Farming",
          "Aquaculture",
          "Agro-processing",
          "Other"
        ),
        allowNull: false,
        comment: "Type of project for quote",
      },
      location: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
          notEmpty: true,
        },
        comment: "Project location",
      },
      scaleOfOperation: {
        type: DataTypes.ENUM(
          "Small Scale",
          "Medium Scale",
          "Large Scale",
          "Commercial",
          "Industrial"
        ),
        allowNull: false,
        comment: "Scale of operation",
      },
      expectedOutcomes: {
        type: DataTypes.TEXT,
        allowNull: false,
        validate: {
          notEmpty: true,
        },
        comment: "Expected outcomes and project goals",
      },
      service: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: "Service title (if quote requested from service detail page)",
      },
      status: {
        type: DataTypes.ENUM("new", "quoted", "in_progress", "completed", "archived"),
        allowNull: false,
        defaultValue: "new",
        comment: "Status of the quote request",
      },
      quoteAmount: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: true,
        comment: "Quoted amount (if quote has been prepared)",
      },
      quoteNotes: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: "Internal notes about the quote",
      },
      adminNotes: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: "Internal admin notes",
      },
      ipAddress: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: "IP address of the submitter",
      },
      userAgent: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: "User agent of the submitter",
      },
      reviewedBy: {
        type: DataTypes.UUID,
        allowNull: true,
        references: {
          model: "admin_users",
          key: "id",
        },
        comment: "Admin user who reviewed this quote request",
      },
      reviewedAt: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: "When this quote request was reviewed",
      },
    },
    {
      tableName: "quote_requests",
      timestamps: true,
      indexes: [
        { fields: ["status"] },
        { fields: ["projectType"] },
        { fields: ["createdAt"] },
      ],
    }
  );

  return QuoteRequest;
};
