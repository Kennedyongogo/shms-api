const { DietType } = require("../models");
const { createCrudController } = require("../utils/crudControllerFactory");

const crud = createCrudController({
  Model: DietType,
  name: "DietType",
  searchableFields: ["name", "description"],
  defaultOrder: [["name", "ASC"]],
});

module.exports = { ...crud };
