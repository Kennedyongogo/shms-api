const { PurchaseOrder } = require("../models");
const { createCrudController } = require("../utils/crudControllerFactory");

module.exports = createCrudController({
  Model: PurchaseOrder,
  name: "PurchaseOrder",
  searchableFields: ["status"],
});

