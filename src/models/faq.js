const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const FAQ = sequelize.define(
    "FAQ",
    {
      id: {
        type: DataTypes.UUID,
        primaryKey: true,
        defaultValue: DataTypes.UUIDV4,
      },
      question: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
          notEmpty: true,
          len: [5, 500],
        },
        comment: "The FAQ question text",
      },
      answer: {
        type: DataTypes.TEXT,
        allowNull: false,
        validate: {
          notEmpty: true,
        },
        comment: "The FAQ answer text",
      },
      category: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: "Optional category for grouping FAQs (e.g., 'Pricing', 'Services', 'General')",
      },
      displayOrder: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        comment: "Controls ordering of FAQs (lower numbers appear first)",
      },
      status: {
        type: DataTypes.ENUM("active", "inactive"),
        allowNull: false,
        defaultValue: "active",
        comment: "Whether the FAQ is active and visible",
      },
      views: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        comment: "Number of times this FAQ has been viewed/expanded",
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
      tableName: "faqs",
      timestamps: true,
      paranoid: true,
      indexes: [
        { fields: ["status"] },
        { fields: ["category"] },
        { fields: ["displayOrder"] },
      ],
    }
  );

  return FAQ;
};
