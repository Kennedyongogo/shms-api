const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const PatientDietOrder = sequelize.define(
    "PatientDietOrder",
    {
      id: {
        type: DataTypes.UUID,
        primaryKey: true,
        defaultValue: DataTypes.UUIDV4,
      },
      admission_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: "admissions", key: "id" },
      },
      diet_type_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: "diet_types", key: "id" },
      },
      prescribed_by: {
        type: DataTypes.UUID,
        allowNull: true,
        references: { model: "staff", key: "id" },
      },
      start_date: {
        type: DataTypes.DATEONLY,
        allowNull: false,
      },
      end_date: {
        type: DataTypes.DATEONLY,
        allowNull: true,
      },
    },
    {
      tableName: "patient_diet_orders",
      timestamps: true,
      indexes: [
        { fields: ["admission_id"] },
        { fields: ["diet_type_id"] },
        { fields: ["prescribed_by"] },
        { fields: ["start_date"] },
      ],
    }
  );

  return PatientDietOrder;
};
