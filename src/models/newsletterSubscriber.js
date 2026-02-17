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
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
        validate: {
          isEmail: true,
        },
        comment: "Subscriber email address",
      },
      status: {
        type: DataTypes.ENUM("subscribed", "unsubscribed"),
        allowNull: false,
        defaultValue: "subscribed",
        comment: "Subscription status",
      },
      source: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: "Where they subscribed (e.g. blog, footer)",
      },
      ipAddress: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: "IP address at subscription time",
      },
      userAgent: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: "User agent at subscription time",
      },
    },
    {
      tableName: "newsletter_subscribers",
      timestamps: true,
      indexes: [
        { fields: ["email"], unique: true },
        { fields: ["status"] },
        { fields: ["createdAt"] },
      ],
    }
  );

  return NewsletterSubscriber;
};
