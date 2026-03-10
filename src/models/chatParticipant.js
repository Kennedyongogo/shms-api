const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const ChatParticipant = sequelize.define(
    "ChatParticipant",
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
      user_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: "users", key: "id" },
        onDelete: "CASCADE",
      },
      role_in_room: {
        type: DataTypes.STRING(20),
        allowNull: true,
        defaultValue: "member",
        comment: "member | admin",
      },
      last_read_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
    },
    {
      tableName: "chat_participants",
      timestamps: true,
      underscored: true,
      indexes: [
        { unique: true, fields: ["chat_room_id", "user_id"] },
        { fields: ["user_id"] },
        { fields: ["chat_room_id"] },
      ],
    }
  );

  return ChatParticipant;
};
