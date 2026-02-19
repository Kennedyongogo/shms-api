const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const DoctorSchedule = sequelize.define(
    "DoctorSchedule",
    {
      id: {
        type: DataTypes.UUID,
        primaryKey: true,
        defaultValue: DataTypes.UUIDV4,
      },
      doctor_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: "staff", key: "id" },
      },
      day_of_week: {
        type: DataTypes.INTEGER,
        allowNull: false,
        validate: { min: 0, max: 6 },
      },
      start_time: {
        type: DataTypes.TIME,
        allowNull: false,
      },
      end_time: {
        type: DataTypes.TIME,
        allowNull: false,
      },
    },
    {
      tableName: "doctor_schedules",
      timestamps: true,
      indexes: [{ fields: ["doctor_id"] }, { fields: ["day_of_week"] }],
    }
  );

  return DoctorSchedule;
};
