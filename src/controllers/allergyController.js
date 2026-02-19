const { PatientAllergy } = require("../models");
const { createCrudController } = require("../utils/crudControllerFactory");

module.exports = createCrudController({
  Model: PatientAllergy,
  name: "PatientAllergy",
  searchableFields: ["allergy_name", "reaction"],
});

