const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const Consultation = sequelize.define(
    "Consultation",
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
        comment: "Full name of the person booking consultation",
      },
      email: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
          isEmail: true,
        },
        comment: "Email address",
      },
      phone: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
          notEmpty: true,
        },
        comment: "Phone number (required for consultation)",
      },
      consultationType: {
        type: DataTypes.ENUM(
          "Farm Consultation",
          "Project Design & Development",
          "BSF Training & Setup",
          "Proposal Writing",
          "Agribusiness Planning",
          "Financial Planning",
          "General Inquiry"
        ),
        allowNull: false,
        comment: "Type of consultation requested",
      },
      preferredDate: {
        type: DataTypes.DATEONLY,
        allowNull: true,
        comment: "Preferred date for consultation",
      },
      preferredTime: {
        type: DataTypes.TIME,
        allowNull: true,
        comment: "Preferred time for consultation",
      },
      message: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: "Additional notes or questions",
      },
      status: {
        type: DataTypes.ENUM("pending", "scheduled", "completed", "cancelled", "archived"),
        allowNull: false,
        defaultValue: "pending",
        comment: "Status of the consultation",
      },
      scheduledDate: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: "Actual scheduled date/time for consultation",
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
        comment: "Admin user who reviewed this consultation",
      },
      reviewedAt: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: "When this consultation was reviewed",
      },
    },
    {
      tableName: "consultations",
      timestamps: true,
      indexes: [
        { fields: ["status"] },
        { fields: ["consultationType"] },
        { fields: ["preferredDate"] },
        { fields: ["scheduledDate"] },
        { fields: ["createdAt"] },
      ],
    }
  );

  return Consultation;
};
