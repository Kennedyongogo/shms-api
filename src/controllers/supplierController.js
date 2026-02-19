const { Supplier } = require("../models");
const { createCrudController } = require("../utils/crudControllerFactory");

module.exports = createCrudController({
  Model: Supplier,
  name: "Supplier",
  searchableFields: ["name", "email", "phone"],
});

