const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const NewsImage = sequelize.define(
    "NewsImage",
    {
      id: {
        type: DataTypes.UUID,
        primaryKey: true,
        defaultValue: DataTypes.UUIDV4,
      },
      news_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: "news", key: "id" },
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
      tableName: "news_images",
      timestamps: true,
      createdAt: "created_at",
      updatedAt: false,
      indexes: [{ fields: ["news_id"] }, { fields: ["uploaded_by"] }],
    }
  );

  return NewsImage;
};
