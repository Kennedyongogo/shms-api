const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const LabTestTemplate = sequelize.define(
    "LabTestTemplate",
    {
      id: {
        type: DataTypes.UUID,
        primaryKey: true,
        defaultValue: DataTypes.UUIDV4,
      },
      lab_test_id: {
        type: DataTypes.UUID,
        allowNull: false,
        unique: true,
        references: { model: "lab_tests", key: "id" },
      },
      version: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 1,
      },
      template: {
        // JSON schema describing dynamic result entry fields
        type: DataTypes.JSON,
        allowNull: false,
      },
    },
    {
      tableName: "lab_test_templates",
      timestamps: true,
      indexes: [{ unique: true, fields: ["lab_test_id"] }, { fields: ["version"] }],
    }
  );

  return LabTestTemplate;
};

