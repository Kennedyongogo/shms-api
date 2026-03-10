const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const SupportTicket = sequelize.define(
    "SupportTicket",
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
      subject: {
        type: DataTypes.STRING(255),
        allowNull: false,
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      created_by: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: "users", key: "id" },
      },
      assigned_to: {
        type: DataTypes.UUID,
        allowNull: true,
        references: { model: "users", key: "id" },
      },
      status: {
        type: DataTypes.STRING(30),
        allowNull: false,
        defaultValue: "open",
        comment: "open | in-progress | resolved | closed",
      },
      priority: {
        type: DataTypes.STRING(20),
        allowNull: false,
        defaultValue: "medium",
        comment: "low | medium | high",
      },
      chat_room_id: {
        type: DataTypes.UUID,
        allowNull: true,
        references: { model: "chat_rooms", key: "id" },
        onDelete: "SET NULL",
      },
    },
    {
      tableName: "support_tickets",
      timestamps: true,
      underscored: true,
      indexes: [
        { fields: ["hospital_id"] },
        { fields: ["created_by"] },
        { fields: ["assigned_to"] },
        { fields: ["status"] },
        { fields: ["chat_room_id"] },
      ],
    }
  );

  return SupportTicket;
};
