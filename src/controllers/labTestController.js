const { LabTest } = require("../models");
const { createCrudController } = require("../utils/crudControllerFactory");

module.exports = createCrudController({
  Model: LabTest,
  name: "LabTest",
  searchableFields: ["test_name", "test_code"],
});

