const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const Event = sequelize.define(
    "Event",
    {
      id: {
        type: DataTypes.UUID,
        primaryKey: true,
        defaultValue: DataTypes.UUIDV4,
      },
      hospital_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: "hospitals", key: "id" },
      },
      title: {
        type: DataTypes.STRING(200),
        allowNull: false,
      },
      slug: {
        type: DataTypes.STRING(250),
        allowNull: false,
        unique: true,
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      banner_image_path: {
        type: DataTypes.STRING(500),
        allowNull: true,
      },
      location: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },
      event_date: {
        type: DataTypes.DATEONLY,
        allowNull: false,
      },
      start_time: {
        type: DataTypes.TIME,
        allowNull: false,
      },
      end_time: {
        type: DataTypes.TIME,
        allowNull: false,
      },
      capacity: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      registration_required: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      status: {
        type: DataTypes.ENUM("draft", "published", "completed", "cancelled"),
        allowNull: false,
        defaultValue: "draft",
      },
      created_by: {
        type: DataTypes.UUID,
        allowNull: true,
        references: { model: "staff", key: "id" },
      },
    },
    {
      tableName: "events",
      timestamps: true,
      indexes: [
        { fields: ["hospital_id"] },
        { unique: true, fields: ["slug"] },
        { fields: ["event_date"] },
        { fields: ["status"] },
        { fields: ["created_by"] },
      ],
    }
  );

  return Event;
};
