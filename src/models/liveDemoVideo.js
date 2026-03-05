const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const LiveDemoVideo = sequelize.define(
    "LiveDemoVideo",
    {
      id: {
        type: DataTypes.UUID,
        primaryKey: true,
        defaultValue: DataTypes.UUIDV4,
      },
      subscription_package: {
        type: DataTypes.ENUM("silver", "gold"),
        allowNull: false,
        comment: "Which subscription package this demo is for",
      },
      title: {
        type: DataTypes.STRING(200),
        allowNull: true,
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      video_path: {
        type: DataTypes.STRING(500),
        allowNull: true,
        comment: "Relative path to stored video file (e.g. uploads/demo-videos/...)",
      },
      video_url: {
        type: DataTypes.STRING(500),
        allowNull: true,
        comment: "Optional external URL if video is hosted elsewhere",
      },
      sort_order: {
        type: DataTypes.INTEGER,
        allowNull: true,
        defaultValue: 0,
      },
      is_active: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
    },
    {
      tableName: "live_demo_videos",
      timestamps: true,
      indexes: [
        { fields: ["subscription_package"] },
        { fields: ["is_active"] },
        { fields: ["sort_order"] },
      ],
    }
  );

  return LiveDemoVideo;
};
