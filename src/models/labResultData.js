const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const LabResultData = sequelize.define(
    "LabResultData",
    {
      id: {
        type: DataTypes.UUID,
        primaryKey: true,
        defaultValue: DataTypes.UUIDV4,
      },
      lab_order_item_id: {
        type: DataTypes.UUID,
        allowNull: false,
        unique: true,
        references: { model: "lab_order_items", key: "id" },
      },
      lab_technician_id: {
        type: DataTypes.UUID,
        allowNull: true,
        references: { model: "staff", key: "id" },
      },
      result_date: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      template_version: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 1,
      },
      template_snapshot: {
        // Optional snapshot of template used at entry time for auditability
        type: DataTypes.JSON,
        allowNull: true,
      },
      results: {
        // Key/value map of filled fields (supports checkbox, single/multi text, numbers, selects, etc.)
        type: DataTypes.JSON,
        allowNull: false,
      },
      interpretation: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
    },
    {
      // IMPORTANT: this project syncs with alter:false, so we must not rename columns on an existing table.
      // Use a new table name for the template-based result store.
      tableName: "lab_order_results",
      timestamps: true,
      indexes: [
        { unique: true, fields: ["lab_order_item_id"] },
        { fields: ["lab_technician_id"] },
        { fields: ["result_date"] },
        { fields: ["template_version"] },
      ],
    }
  );

  return LabResultData;
};

