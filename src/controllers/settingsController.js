const { SystemSetting } = require("../models");
const { createCrudController } = require("../utils/crudControllerFactory");

module.exports = createCrudController({
  Model: SystemSetting,
  name: "SystemSetting",
  searchableFields: ["setting_key", "setting_value"],
});

