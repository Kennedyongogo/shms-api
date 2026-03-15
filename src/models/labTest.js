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
        allowNull: true,
        comment: "Display name for the test.",
      },
      test_code: {
        type: DataTypes.STRING(100),
        allowNull: true,
        comment: "Display name for the test.",
      },
      price: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: true,
        comment: "Charges for this test at this hospital.",
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
      indexes: [
        { unique: true, fields: ["hospital_id", "test_code"], name: "lab_tests_hospital_id_test_code_unique" },
        { fields: ["test_name"] },
        { fields: ["hospital_id"] },
      ],
    }
  );

  return LabTest;
};
