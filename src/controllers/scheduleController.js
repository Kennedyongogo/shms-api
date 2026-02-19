const { DoctorSchedule } = require("../models");
const { createCrudController } = require("../utils/crudControllerFactory");

module.exports = createCrudController({
  Model: DoctorSchedule,
  name: "DoctorSchedule",
  searchableFields: [],
});

