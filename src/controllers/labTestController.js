const { LabTest } = require("../models");
const { createCrudController } = require("../utils/crudControllerFactory");

const buildCreateData = async (req) => {
  const body = { ...req.body };
  const hospitalId = req.user?.hospital_id ?? body.hospital_id ?? null;
  if (hospitalId != null) body.hospital_id = hospitalId;
  if (body.price != null) body.price = Number(body.price);
  return body;
};

module.exports = createCrudController({
  Model: LabTest,
  name: "LabTest",
  searchableFields: ["test_name", "test_code"],
  scopeByHospital: true,
  buildCreateData,
});

