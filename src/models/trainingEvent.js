const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const TrainingEvent = sequelize.define(
    "TrainingEvent",
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
      description: {
        type: DataTypes.TEXT,
        allowNull: false,
        validate: {
          notEmpty: true,
        },
      },
      date: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: "Event date",
      },
      startTime: {
        type: DataTypes.TIME,
        allowNull: true,
        field: "start_time",
        comment: "Event start time",
      },
      endTime: {
        type: DataTypes.TIME,
        allowNull: true,
        field: "end_time",
        comment: "Event end time",
      },
      endDate: {
        type: DataTypes.DATE,
        allowNull: true,
        field: "end_date",
        comment: "Event end date (for multi-day events)",
      },
      location: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
          notEmpty: true,
        },
      },
      latitude: {
        type: DataTypes.DECIMAL(10, 8),
        allowNull: true,
        comment: "Latitude coordinate for event location",
      },
      longitude: {
        type: DataTypes.DECIMAL(11, 8),
        allowNull: true,
        comment: "Longitude coordinate for event location",
      },
      type: {
        type: DataTypes.ENUM("Workshop", "Training"),
        allowNull: false,
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
        comment: "Alt text for the event image for accessibility",
      },
      registrationUrl: {
        type: DataTypes.STRING(500),
        allowNull: true,
        field: "registration_url",
        comment: "URL for registration (if external)",
      },
      capacity: {
        type: DataTypes.INTEGER,
        allowNull: true,
        comment: "Maximum number of participants",
      },
      price: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
        comment: "Event price (if paid)",
      },
      currency: {
        type: DataTypes.STRING(3),
        allowNull: true,
        defaultValue: "USD",
        comment: "Currency code",
      },
      organizer: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: "Organizing entity",
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
        comment: "Whether the event is currently active/visible",
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
      tableName: "training_events",
      timestamps: true,
      indexes: [
        { fields: ["date"] },
        { fields: ["type"] },
        { fields: ["location"] },
        { fields: ["featured"] },
        { fields: ["is_active"] },
        { fields: ["is_deleted"] },
        { fields: ["latitude", "longitude"] },
      ],
    }
  );

  return TrainingEvent;
};
