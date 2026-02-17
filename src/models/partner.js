const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const Partner = sequelize.define(
    "Partner",
    {
      id: {
        type: DataTypes.UUID,
        primaryKey: true,
        defaultValue: DataTypes.UUIDV4,
      },
      name: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
        validate: {
          notEmpty: true,
        },
        comment: "Partner organization name (e.g., 'KALRO', 'ILRI')",
      },
      initial: {
        type: DataTypes.STRING(10),
        allowNull: true,
        comment: "Single letter or abbreviation for display",
      },
      logo: {
        type: DataTypes.STRING(500),
        allowNull: true,
        comment: "Logo image path (relative path from uploads directory)",
      },
      logoAltText: {
        type: DataTypes.STRING(200),
        allowNull: true,
        field: "logo_alt_text",
        comment: "Alt text for the partner logo for accessibility",
      },
      websiteUrl: {
        type: DataTypes.STRING(500),
        allowNull: true,
        field: "website_url",
        comment: "Partner organization website",
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: "Partner description",
      },
      partnershipType: {
        type: DataTypes.STRING(100),
        allowNull: true,
        field: "partnership_type",
        comment: "Type of partnership",
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
      address: {
        type: DataTypes.STRING(500),
        allowNull: true,
        comment: "Partner organization address",
      },
      sector: {
        type: DataTypes.STRING(200),
        allowNull: true,
        comment: "e.g. Agriculture, Technology, Finance",
      },
      services: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: "JSON array of service strings",
        get() {
          const raw = this.getDataValue("services");
          if (!raw) return null;
          try {
            return typeof raw === "string" ? JSON.parse(raw) : raw;
          } catch {
            return null;
          }
        },
        set(val) {
          this.setDataValue("services", Array.isArray(val) ? JSON.stringify(val) : val == null ? null : String(val));
        },
      },
      featured: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        comment: "Whether the partner is featured",
      },
      displayOrder: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        field: "display_order",
        comment: "Order for display (lower numbers first)",
      },
      isActive: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
        field: "is_active",
        comment: "Whether the partner is currently displayed",
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
      tableName: "partners",
      timestamps: true,
      indexes: [
        { unique: true, fields: ["name"] },
        { fields: ["display_order"] },
        { fields: ["is_active"] },
        { fields: ["is_deleted"] },
      ],
    }
  );

  return Partner;
};
