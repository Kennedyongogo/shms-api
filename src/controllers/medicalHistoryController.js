const { PatientMedicalHistory } = require("../models");
const { createCrudController } = require("../utils/crudControllerFactory");

module.exports = createCrudController({
  Model: PatientMedicalHistory,
  name: "PatientMedicalHistory",
  searchableFields: ["condition", "notes"],
});

