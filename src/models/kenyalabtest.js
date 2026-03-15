const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const KenyaLabTest = sequelize.define(
    "KenyaLabTest",
    {
      id: {
        type: DataTypes.UUID,
        primaryKey: true,
        defaultValue: DataTypes.UUIDV4,
      },
      code: {
        type: DataTypes.STRING(50),
        allowNull: true,
        comment: "Test code (e.g. 3755H000); may be empty or '-' for uncoded tests.",
      },
      test_name: {
        type: DataTypes.STRING(300),
        allowNull: false,
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: "Description / common use of the test.",
      },
      category: {
        type: DataTypes.STRING(150),
        allowNull: true,
        comment: "Category e.g. Hematology, Clinical Chemistry, Microbiology / Serology / Molecular.",
      },
    },
    {
      tableName: "kenya_lab_tests",
      timestamps: true,
      indexes: [
        { fields: ["code"] },
        { fields: ["test_name"] },
        { fields: ["category"] },
      ],
    }
  );

  return KenyaLabTest;
};
