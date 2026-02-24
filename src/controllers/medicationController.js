const { Medication, InventoryItem } = require("../models");
const { createCrudController } = require("../utils/crudControllerFactory");

const medicationInclude = [
  {
    model: InventoryItem,
    as: "inventoryItem",
    attributes: ["id", "name", "quantity_available", "quantity_in_pharmacy", "unit"],
  },
];

module.exports = createCrudController({
  Model: Medication,
  name: "Medication",
  searchableFields: ["name", "dosage_form", "manufacturer"],
  include: medicationInclude,
});

