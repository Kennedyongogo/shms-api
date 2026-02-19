const { Medication } = require("../models");
const { createCrudController } = require("../utils/crudControllerFactory");

module.exports = createCrudController({
  Model: Medication,
  name: "Medication",
  searchableFields: ["name", "dosage_form", "manufacturer"],
});

