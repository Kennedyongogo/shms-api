const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const NewsletterSubscriber = sequelize.define(
    "NewsletterSubscriber",
    {
      id: {
        type: DataTypes.UUID,
        primaryKey: true,
        defaultValue: DataTypes.UUIDV4,
      },
      email: {
        type: DataTypes.STRING(255),
        allowNull: false,
        unique: true,
        validate: { isEmail: true },
      },
      status: {
        type: DataTypes.ENUM("subscribed", "unsubscribed"),
        allowNull: false,
        defaultValue: "subscribed",
      },
    },
    {
      tableName: "newsletter_subscribers",
      timestamps: true,
      updatedAt: true,
      indexes: [
        { unique: true, fields: ["email"] },
        { fields: ["status"] },
        { fields: ["createdAt"] },
      ],
    }
  );

  return NewsletterSubscriber;
};
