const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const LabTest = sequelize.define(
    "LabTest",
    {
      id: {
        type: DataTypes.UUID,
        primaryKey: true,
        defaultValue: DataTypes.UUIDV4,
      },
      test_name: {
        type: DataTypes.STRING(200),
        allowNull: false,
      },
      test_code: {
        type: DataTypes.STRING(100),
        allowNull: false,
        unique: true,
      },
      price: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: true,
      },
      hospital_id: {
        type: DataTypes.UUID,
        allowNull: true,
        references: { model: "hospitals", key: "id" },
      },
    },
    {
      tableName: "lab_tests",
      timestamps: true,
      indexes: [{ unique: true, fields: ["test_code"] }, { fields: ["test_name"] }, { fields: ["hospital_id"] }],
    }
  );

  return LabTest;
};
