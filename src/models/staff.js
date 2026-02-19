const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const Staff = sequelize.define(
    "Staff",
    {
      id: {
        type: DataTypes.UUID,
        primaryKey: true,
        defaultValue: DataTypes.UUIDV4,
      },
      user_id: {
        type: DataTypes.UUID,
        allowNull: false,
        unique: true,
        references: { model: "users", key: "id" },
      },
      hospital_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: "hospitals", key: "id" },
      },
      department_id: {
        type: DataTypes.UUID,
        allowNull: true,
        references: { model: "departments", key: "id" },
      },
      staff_type: {
        type: DataTypes.STRING(100),
        allowNull: false,
      },
      specialization: {
        type: DataTypes.STRING(200),
        allowNull: true,
      },
      license_number: {
        type: DataTypes.STRING(100),
        allowNull: true,
      },
      hire_date: {
        type: DataTypes.DATEONLY,
        allowNull: true,
      },
    },
    {
      tableName: "staff",
      timestamps: true,
      indexes: [
        { unique: true, fields: ["user_id"] },
        { fields: ["hospital_id"] },
        { fields: ["department_id"] },
        { fields: ["staff_type"] },
      ],
    }
  );

  return Staff;
};
