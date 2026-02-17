const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const Grant = sequelize.define(
    "Grant",
    {
      id: {
        type: DataTypes.UUID,
        primaryKey: true,
        defaultValue: DataTypes.UUIDV4,
      },
      title: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
          notEmpty: true,
          len: [2, 255],
        },
      },
      badge: {
        type: DataTypes.STRING(50),
        allowNull: false,
        comment: "Badge label (e.g., 'Funding', 'Grant')",
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: false,
        validate: {
          notEmpty: true,
        },
      },
      amount: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: "Grant amount as string (e.g., 'Up to $10,000', 'Flexible Grants')",
      },
      amountMin: {
        type: DataTypes.DECIMAL(15, 2),
        allowNull: true,
        field: "amount_min",
        comment: "Minimum grant amount (for filtering/sorting)",
      },
      amountMax: {
        type: DataTypes.DECIMAL(15, 2),
        allowNull: true,
        field: "amount_max",
        comment: "Maximum grant amount (for filtering/sorting)",
      },
      currency: {
        type: DataTypes.STRING(3),
        allowNull: true,
        defaultValue: "USD",
        comment: "Currency code",
      },
      deadline: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: "Application deadline",
      },
      deadlineText: {
        type: DataTypes.STRING,
        allowNull: true,
        field: "deadline_text",
        comment: "Human-readable deadline (e.g., 'Open Rolling Basis')",
      },
      isRolling: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        field: "is_rolling",
        comment: "Whether it's a rolling deadline",
      },
      image: {
        type: DataTypes.STRING(500),
        allowNull: true,
        comment: "Main image path (relative path from uploads directory)",
      },
      imageAltText: {
        type: DataTypes.STRING(200),
        allowNull: true,
        field: "image_alt_text",
        comment: "Alt text for the grant image for accessibility",
      },
      applicationUrl: {
        type: DataTypes.STRING(500),
        allowNull: true,
        field: "application_url",
        comment: "URL to apply for the grant",
      },
      eligibilityCriteria: {
        type: DataTypes.TEXT,
        allowNull: true,
        field: "eligibility_criteria",
        comment: "Eligibility requirements",
      },
      requirements: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: "Application requirements",
      },
      fundingType: {
        type: DataTypes.ENUM("Grant", "Loan", "Equity", "Other"),
        allowNull: true,
        field: "funding_type",
        comment: "Type of funding",
      },
      sector: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: "Target sector (e.g., 'Agriculture', 'Technology')",
      },
      targetAudience: {
        type: DataTypes.STRING,
        allowNull: true,
        field: "target_audience",
        comment: "Target audience (e.g., 'Women-led', 'Smallholders')",
      },
      organization: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: "Grant provider organization",
      },
      contactEmail: {
        type: DataTypes.STRING,
        allowNull: true,
        field: "contact_email",
        validate: {
          isEmail: true,
        },
      },
      contactPhone: {
        type: DataTypes.STRING(50),
        allowNull: true,
        field: "contact_phone",
      },
      tags: {
        type: DataTypes.JSON,
        allowNull: true,
        defaultValue: [],
        comment: "Array of tags for filtering",
      },
      featured: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        comment: "Whether to feature on homepage",
      },
      isActive: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
        field: "is_active",
        comment: "Whether the grant is currently active/visible",
      },
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
        field: "is_deleted",
      },
    },
    {
      tableName: "grants",
      timestamps: true,
      indexes: [
        { fields: ["deadline"] },
        { fields: ["funding_type"] },
        { fields: ["featured"] },
        { fields: ["is_active"] },
        { fields: ["is_rolling"] },
        { fields: ["is_deleted"] },
      ],
    }
  );

  return Grant;
};
