const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const EventRegistration = sequelize.define(
    "EventRegistration",
    {
      id: {
        type: DataTypes.UUID,
        primaryKey: true,
        defaultValue: DataTypes.UUIDV4,
      },
      event_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: "events", key: "id" },
      },
      patient_id: {
        type: DataTypes.UUID,
        allowNull: true,
        references: { model: "patients", key: "id" },
      },
      full_name: {
        type: DataTypes.STRING(200),
        allowNull: false,
      },
      phone: {
        type: DataTypes.STRING(50),
        allowNull: false,
      },
      email: {
        type: DataTypes.STRING(200),
        allowNull: true,
        validate: { isEmail: true },
      },
      gender: {
        type: DataTypes.STRING(20),
        allowNull: true,
      },
      age: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      registration_date: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
      attendance_status: {
        type: DataTypes.ENUM("registered", "attended", "cancelled", "no_show"),
        allowNull: false,
        defaultValue: "registered",
      },
      check_in_time: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      checked_in_by: {
        type: DataTypes.UUID,
        allowNull: true,
        references: { model: "staff", key: "id" },
      },
    },
    {
      tableName: "event_registrations",
      timestamps: true,
      createdAt: "created_at",
      updatedAt: false,
      indexes: [
        { fields: ["event_id"] },
        { fields: ["patient_id"] },
        { fields: ["attendance_status"] },
        { fields: ["checked_in_by"] },
        { fields: ["registration_date"] },
      ],
    }
  );

  return EventRegistration;
};
