const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const ChatMessage = sequelize.define(
    "ChatMessage",
    {
      id: {
        type: DataTypes.UUID,
        primaryKey: true,
        defaultValue: DataTypes.UUIDV4,
      },
      chat_room_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: "chat_rooms", key: "id" },
        onDelete: "CASCADE",
      },
      sender_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: "users", key: "id" },
        onDelete: "CASCADE",
      },
      message: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
      status: {
        type: DataTypes.STRING(20),
        allowNull: false,
        defaultValue: "sent",
        comment: "sent | delivered | read",
      },
    },
    {
      tableName: "chat_messages",
      timestamps: true,
      updatedAt: false,
      underscored: true,
      indexes: [
        { fields: ["chat_room_id"] },
        { fields: ["sender_id"] },
        { fields: ["created_at"] },
      ],
    }
  );

  return ChatMessage;
};
