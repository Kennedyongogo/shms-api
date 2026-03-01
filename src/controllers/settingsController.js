const { SystemSetting } = require("../models");
const { createCrudController, parsePagination } = require("../utils/crudControllerFactory");
const { scopeByHospital, belongsToUserHospital, withHospitalId } = require("../utils/hospitalScope");

const crud = createCrudController({
  Model: SystemSetting,
  name: "SystemSetting",
  searchableFields: ["setting_key", "setting_value"],
});

const getAll = async (req, res) => {
  const hid = req.user?.hospital_id;
  if (hid == null) return crud.getAll(req, res);
  try {
    const { page, limit, offset } = parsePagination(req.query);
    const where = { ...scopeByHospital(req) };
    const { count, rows } = await SystemSetting.findAndCountAll({
      where,
      limit,
      offset,
      order: [["createdAt", "DESC"]],
    });
    return res.status(200).json({
      success: true,
      data: rows,
      pagination: { total: count, page, limit, totalPages: Math.ceil(count / limit) },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Error fetching settings", error: error.message });
  }
};

const getByIdScoped = async (req, res) => {
  try {
    const { id } = req.params;
    const record = await SystemSetting.findByPk(id);
    if (!record) return res.status(404).json({ success: false, message: "SystemSetting not found" });
    if (!belongsToUserHospital(record, req)) return res.status(404).json({ success: false, message: "SystemSetting not found" });
    return res.status(200).json({ success: true, data: record });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Error fetching setting", error: error.message });
  }
};

const update = async (req, res) => {
  try {
    const { id } = req.params;
    const record = await SystemSetting.findByPk(id);
    if (!record) return res.status(404).json({ success: false, message: "SystemSetting not found" });
    if (!belongsToUserHospital(record, req)) return res.status(403).json({ success: false, message: "Access denied" });
    return crud.update(req, res);
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

const remove = async (req, res) => {
  try {
    const { id } = req.params;
    const record = await SystemSetting.findByPk(id);
    if (!record) return res.status(404).json({ success: false, message: "SystemSetting not found" });
    if (!belongsToUserHospital(record, req)) return res.status(403).json({ success: false, message: "Access denied" });
    return crud.remove(req, res);
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

const create = async (req, res) => {
  req.body = withHospitalId(req.body || {}, req);
  return crud.create(req, res);
};

module.exports = { ...crud, getAll, getById: getByIdScoped, update, remove, create };

