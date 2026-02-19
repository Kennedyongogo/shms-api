const { InventoryItem } = require("../models");
const { createCrudController } = require("../utils/crudControllerFactory");

module.exports = createCrudController({
  Model: InventoryItem,
  name: "InventoryItem",
  searchableFields: ["name", "category"],
});

