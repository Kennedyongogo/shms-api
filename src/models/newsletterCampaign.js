const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const NewsletterCampaign = sequelize.define(
    "NewsletterCampaign",
    {
      id: {
        type: DataTypes.UUID,
        primaryKey: true,
        defaultValue: DataTypes.UUIDV4,
      },
      subject: {
        type: DataTypes.STRING(500),
        allowNull: false,
      },
      body: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: "Plain text or HTML body for the newsletter",
      },
      sent_at: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: "Set when email provider has actually sent; null = draft/queued",
      },
      recipient_count: {
        type: DataTypes.INTEGER,
        allowNull: true,
        comment: "Number of recipients at time of send",
      },
    },
    {
      tableName: "newsletter_campaigns",
      timestamps: true,
      indexes: [{ fields: ["sent_at"] }, { fields: ["createdAt"] }],
    }
  );

  return NewsletterCampaign;
};
