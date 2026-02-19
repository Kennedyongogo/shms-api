const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const DispenseRecord = sequelize.define(
    "DispenseRecord",
    {
      id: {
        type: DataTypes.UUID,
        primaryKey: true,
        defaultValue: DataTypes.UUIDV4,
      },
      prescription_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: "prescriptions", key: "id" },
      },
      pharmacist_id: {
        type: DataTypes.UUID,
        allowNull: true,
        references: { model: "staff", key: "id" },
      },
      dispense_date: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
    },
    {
      tableName: "dispense_records",
      timestamps: true,
      indexes: [
        { fields: ["prescription_id"] },
        { fields: ["pharmacist_id"] },
        { fields: ["dispense_date"] },
      ],
    }
  );

  return DispenseRecord;
};
