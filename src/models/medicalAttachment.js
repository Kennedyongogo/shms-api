const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const MedicalAttachment = sequelize.define(
    "MedicalAttachment",
    {
      id: {
        type: DataTypes.UUID,
        primaryKey: true,
        defaultValue: DataTypes.UUIDV4,
      },
      patient_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: "patients", key: "id" },
      },
      file_path: {
        type: DataTypes.STRING(500),
        allowNull: false,
      },
      file_type: {
        type: DataTypes.STRING(100),
        allowNull: true,
      },
      uploaded_by: {
        type: DataTypes.UUID,
        allowNull: true,
        references: { model: "users", key: "id" },
      },
    },
    {
      tableName: "medical_attachments",
      timestamps: true,
      indexes: [{ fields: ["patient_id"] }, { fields: ["uploaded_by"] }],
    }
  );

  return MedicalAttachment;
};
