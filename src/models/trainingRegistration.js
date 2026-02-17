const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const TrainingRegistration = sequelize.define(
    "TrainingRegistration",
    {
      id: {
        type: DataTypes.UUID,
        primaryKey: true,
        defaultValue: DataTypes.UUIDV4,
      },
      userId: {
        type: DataTypes.UUID,
        allowNull: false,
        field: "user_id",
        references: {
          model: "marketplace_users",
          key: "id",
        },
        comment: "Reference to marketplace user",
      },
      trainingEventId: {
        type: DataTypes.UUID,
        allowNull: false,
        field: "training_event_id",
        references: {
          model: "training_events",
          key: "id",
        },
        comment: "Reference to training event",
      },
      registrationDate: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
        field: "registration_date",
        comment: "Date when user registered",
      },
      status: {
        type: DataTypes.ENUM("pending", "confirmed", "cancelled", "attended"),
        allowNull: false,
        defaultValue: "pending",
        comment: "Registration status",
      },
      notes: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: "Additional notes about the registration",
      },
    },
    {
      tableName: "training_registrations",
      timestamps: true,
      indexes: [
        { unique: true, fields: ["user_id", "training_event_id"], name: "unique_registration" },
        { fields: ["user_id"] },
        { fields: ["training_event_id"] },
        { fields: ["status"] },
        { fields: ["registration_date"] },
      ],
    }
  );

  return TrainingRegistration;
};
