const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const NursingNote = sequelize.define(
    "NursingNote",
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
      nurse_id: {
        type: DataTypes.UUID,
        allowNull: true,
        references: { model: "staff", key: "id" },
      },
      notes: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
      recorded_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
    },
    {
      tableName: "nursing_notes",
      timestamps: true,
      indexes: [{ fields: ["admission_id"] }, { fields: ["nurse_id"] }, { fields: ["recorded_at"] }],
    }
  );

  return NursingNote;
};
