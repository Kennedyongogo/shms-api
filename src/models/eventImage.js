const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const EventImage = sequelize.define(
    "EventImage",
    {
      id: {
        type: DataTypes.UUID,
        primaryKey: true,
        defaultValue: DataTypes.UUIDV4,
      },
      event_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: "events", key: "id" },
      },
      image_path: {
        type: DataTypes.STRING(500),
        allowNull: false,
      },
      caption: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },
      uploaded_by: {
        type: DataTypes.UUID,
        allowNull: true,
        references: { model: "staff", key: "id" },
      },
    },
    {
      tableName: "event_images",
      timestamps: true,
      createdAt: "created_at",
      updatedAt: false,
      indexes: [{ fields: ["event_id"] }, { fields: ["uploaded_by"] }],
    }
  );

  return EventImage;
};
