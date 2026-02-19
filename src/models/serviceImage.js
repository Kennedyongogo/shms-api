const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const ServiceImage = sequelize.define(
    "ServiceImage",
    {
      id: {
        type: DataTypes.UUID,
        primaryKey: true,
        defaultValue: DataTypes.UUIDV4,
      },
      service_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: "services", key: "id" },
      },
      image_path: {
        type: DataTypes.STRING(500),
        allowNull: false,
      },
      caption: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },
    },
    {
      tableName: "service_images",
      timestamps: true,
      indexes: [{ fields: ["service_id"] }],
    }
  );

  return ServiceImage;
};
