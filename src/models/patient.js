const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const Patient = sequelize.define(
    "Patient",
    {
      id: {
        type: DataTypes.UUID,
        primaryKey: true,
        defaultValue: DataTypes.UUIDV4,
      },
      user_id: {
        type: DataTypes.UUID,
        allowNull: true,
        unique: true,
        references: { model: "users", key: "id" },
      },
      // Patient identity (separate from system Users)
      full_name: {
        type: DataTypes.STRING(200),
        allowNull: true,
      },
      email: {
        type: DataTypes.STRING(200),
        allowNull: true,
        validate: { isEmail: true },
      },
      phone: {
        type: DataTypes.STRING(50),
        allowNull: true,
      },
      // Auth for patient portal (bcrypt hash)
      password: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },
      status: {
        type: DataTypes.ENUM("active", "inactive", "suspended"),
        allowNull: false,
        defaultValue: "active",
      },
      last_login: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      hospital_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: "hospitals", key: "id" },
      },
      date_of_birth: {
        type: DataTypes.DATEONLY,
        allowNull: true,
      },
      gender: {
        type: DataTypes.STRING(20),
        allowNull: true,
      },
      blood_group: {
        type: DataTypes.STRING(10),
        allowNull: true,
      },
      insurance_provider: {
        type: DataTypes.STRING(200),
        allowNull: true,
      },
      emergency_contact: {
        type: DataTypes.STRING(200),
        allowNull: true,
      },
      patient_source: {
        type: DataTypes.STRING(20),
        allowNull: false,
        defaultValue: "walk_in", // walk_in | public
      },
      // Last captured vitals (walk-in / triage)
      temperature_c: {
        type: DataTypes.DECIMAL(4, 1),
        allowNull: true,
      },
      weight_kg: {
        type: DataTypes.DECIMAL(6, 2),
        allowNull: true,
      },
    },
    {
      tableName: "patients",
      timestamps: true,
      indexes: [
        { unique: true, fields: ["user_id"] },
        { fields: ["hospital_id"] },
        { fields: ["full_name"] },
        { fields: ["email"] },
        { fields: ["phone"] },
        { fields: ["status"] },
        { fields: ["patient_source"] },
        { fields: ["temperature_c"] },
        { fields: ["weight_kg"] },
      ],
    }
  );

  return Patient;
};
