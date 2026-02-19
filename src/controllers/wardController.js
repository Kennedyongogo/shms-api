const { Ward } = require("../models");
const { createCrudController } = require("../utils/crudControllerFactory");

module.exports = createCrudController({
  Model: Ward,
  name: "Ward",
  searchableFields: ["name", "type"],
});

