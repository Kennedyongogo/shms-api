const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const ChatRoom = sequelize.define(
    "ChatRoom",
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
        allowNull: true,
      },
      is_private: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
      type: {
        type: DataTypes.STRING(50),
        allowNull: true,
        defaultValue: "direct",
        comment: "direct | department | hospital | support",
      },
      created_by: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: "users", key: "id" },
      },
    },
    {
      tableName: "chat_rooms",
      timestamps: true,
      underscored: true,
      indexes: [
        { fields: ["hospital_id"] },
        { fields: ["created_by"] },
        { fields: ["is_private", "type"] },
      ],
    }
  );

  return ChatRoom;
};
