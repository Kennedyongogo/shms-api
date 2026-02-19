const { Hospital } = require("../models");
const { toRelativeUploadPath } = require("../middleware/upload");
const { createCrudController } = require("../utils/crudControllerFactory");

const withLogoPath = (req) => {
  const body = { ...req.body };
  if (req.file?.path) body.logo_path = toRelativeUploadPath(req.file.path);
  return body;
};

module.exports = createCrudController({
  Model: Hospital,
  name: "Hospital",
  searchableFields: ["name", "email", "phone"],
  buildCreateData: withLogoPath,
  buildUpdateData: withLogoPath,
});

