const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const Contact = sequelize.define(
    "Contact",
    {
      id: {
        type: DataTypes.UUID,
        primaryKey: true,
        defaultValue: DataTypes.UUIDV4,
      },
      fullName: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
          notEmpty: true,
          len: [2, 200],
        },
        comment: "Full name of the contact",
      },
      email: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
          isEmail: true,
        },
        comment: "Email address of the contact",
      },
      phone: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: "Phone number (optional)",
      },
      serviceType: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: "Type of service interested in (optional dropdown)",
      },
      message: {
        type: DataTypes.TEXT,
        allowNull: false,
        validate: {
          notEmpty: true,
        },
        comment: "Message from the contact",
      },
      status: {
        type: DataTypes.ENUM("new", "read", "replied", "archived"),
        allowNull: false,
        defaultValue: "new",
        comment: "Status of the contact inquiry",
      },
      adminNotes: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: "Internal notes about this contact",
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
        comment: "Admin user who reviewed this contact",
      },
      reviewedAt: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: "When this contact was reviewed",
      },
    },
    {
      tableName: "contacts",
      timestamps: true,
      indexes: [
        { fields: ["status"] },
        { fields: ["email"] },
        { fields: ["createdAt"] },
      ],
    }
  );

  return Contact;
};
