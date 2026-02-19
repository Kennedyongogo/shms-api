const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const News = sequelize.define(
    "News",
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
      content: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
      featured_image_path: {
        type: DataTypes.STRING(500),
        allowNull: true,
      },
      category: {
        type: DataTypes.ENUM("announcement", "medical_update", "recruitment", "awareness"),
        allowNull: false,
        defaultValue: "announcement",
      },
      status: {
        type: DataTypes.ENUM("draft", "published", "archived"),
        allowNull: false,
        defaultValue: "draft",
      },
      published_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      created_by: {
        type: DataTypes.UUID,
        allowNull: true,
        references: { model: "staff", key: "id" },
      },
    },
    {
      tableName: "news",
      timestamps: true,
      indexes: [
        { fields: ["hospital_id"] },
        { unique: true, fields: ["slug"] },
        { fields: ["category"] },
        { fields: ["status"] },
        { fields: ["published_at"] },
        { fields: ["created_by"] },
      ],
    }
  );

  return News;
};
