const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const GrantApplication = sequelize.define(
    "GrantApplication",
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
        comment: "Reference to marketplace user",
      },
      grantId: {
        type: DataTypes.UUID,
        allowNull: false,
        field: "grant_id",
        references: {
          model: "grants",
          key: "id",
        },
        comment: "Reference to grant",
      },
      applicationDate: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
        field: "application_date",
        comment: "Date when user applied",
      },
      status: {
        type: DataTypes.ENUM("draft", "submitted", "under_review", "approved", "rejected", "withdrawn"),
        allowNull: false,
        defaultValue: "draft",
        comment: "Application status",
      },
      applicationData: {
        type: DataTypes.JSON,
        allowNull: true,
        field: "application_data",
        comment: "Structured application data (answers, documents, etc.)",
      },
      notes: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: "Additional notes about the application",
      },
    },
    {
      tableName: "grant_applications",
      timestamps: true,
      indexes: [
        { fields: ["user_id"] },
        { fields: ["grant_id"] },
        { fields: ["status"] },
        { fields: ["application_date"] },
      ],
    }
  );

  return GrantApplication;
};
