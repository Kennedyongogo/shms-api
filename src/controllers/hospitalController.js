const { Hospital } = require("../models");
const { toRelativeUploadPath } = require("../middleware/upload");
const { createCrudController } = require("../utils/crudControllerFactory");

const withLogoPath = (req) => {
  const body = { ...req.body };
  if (req.file?.path) body.logo_path = toRelativeUploadPath(req.file.path);
  return body;
};

const crud = createCrudController({
  Model: Hospital,
  name: "Hospital",
  searchableFields: ["name", "email", "phone"],
  buildCreateData: withLogoPath,
  buildUpdateData: withLogoPath,
});

// When user belongs to a hospital, they only see and manage that hospital
const getAll = async (req, res) => {
  const hid = req.user?.hospital_id;
  if (hid == null) return crud.getAll(req, res);
  try {
    const hospital = await Hospital.findByPk(hid);
    if (!hospital) return res.status(200).json({ success: true, data: [], pagination: { total: 0, page: 1, limit: 10, totalPages: 0 } });
    return res.status(200).json({
      success: true,
      data: [hospital],
      pagination: { total: 1, page: 1, limit: 10, totalPages: 1 },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Error fetching hospital", error: error.message });
  }
};

const getById = async (req, res) => {
  const hid = req.user?.hospital_id;
  if (hid != null && req.params.id !== hid) {
    return res.status(404).json({ success: false, message: "Hospital not found" });
  }
  return crud.getById(req, res);
};

const update = async (req, res) => {
  const hid = req.user?.hospital_id;
  if (hid != null && req.params.id !== hid) {
    return res.status(403).json({ success: false, message: "You can only update your own hospital." });
  }
  return crud.update(req, res);
};

const remove = async (req, res) => {
  const hid = req.user?.hospital_id;
  if (hid != null && req.params.id !== hid) {
    return res.status(403).json({ success: false, message: "You can only delete your own hospital." });
  }
  return crud.remove(req, res);
};

module.exports = { ...crud, getAll, getById, update, remove };

