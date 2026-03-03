const { Op } = require("sequelize");
const { Service, Hospital, Department } = require("../models");
const { toRelativeUploadPath } = require("../middleware/upload");
const { createCrudController, parsePagination } = require("../utils/crudControllerFactory");
const { scopeByHospital, belongsToUserHospital, withHospitalId } = require("../utils/hospitalScope");

const withImagePath = (req) => {
  const body = { ...req.body };
  if (req.file?.path) body.image_path = toRelativeUploadPath(req.file.path);
  if (Object.prototype.hasOwnProperty.call(body, "price") && (body.price === "" || body.price == null)) body.price = null;
  if (Object.prototype.hasOwnProperty.call(body, "description") && (body.description === "" || body.description == null)) body.description = null;
  return body;
};

const include = [
  { model: Hospital, as: "hospital", attributes: ["id", "name"], required: false },
  { model: Department, as: "department", attributes: ["id", "name"], required: false },
];

const crud = createCrudController({
  Model: Service,
  name: "Service",
  searchableFields: ["name", "description", "status"],
  buildCreateData: withImagePath,
  buildUpdateData: withImagePath,
  include,
  scopeByHospital: true,
});

const getAll = async (req, res) => {
  try {
    const { page, limit, offset } = parsePagination(req.query);
    const { search, hospital_id, department_id, status } = req.query;

    const where = { ...scopeByHospital(req) };
    if (hospital_id) where.hospital_id = hospital_id;
    if (department_id) where.department_id = department_id;
    if (status) where.status = status;

    if (search) {
      where[Op.or] = [
        { name: { [Op.iLike]: `%${search}%` } },
        { description: { [Op.iLike]: `%${search}%` } },
        { status: { [Op.iLike]: `%${search}%` } },
      ];
    }

    const { count, rows } = await Service.findAndCountAll({
      where,
      limit,
      offset,
      include,
      order: [["createdAt", "DESC"]],
    });

    return res.status(200).json({
      success: true,
      data: rows,
      pagination: { total: count, page, limit, totalPages: Math.ceil(count / limit) },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Error fetching Services", error: error.message });
  }
};

const getByIdScoped = async (req, res) => {
  try {
    const { id } = req.params;
    const record = await Service.findByPk(id, { include });
    if (!record) return res.status(404).json({ success: false, message: "Service not found" });
    if (!belongsToUserHospital(record, req)) return res.status(404).json({ success: false, message: "Service not found" });
    return res.status(200).json({ success: true, data: record });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Error fetching Service", error: error.message });
  }
};

const update = async (req, res) => {
  try {
    const { id } = req.params;
    const record = await Service.findByPk(id);
    if (!record) return res.status(404).json({ success: false, message: "Service not found" });
    if (!belongsToUserHospital(record, req)) return res.status(403).json({ success: false, message: "Access denied" });
    return crud.update(req, res);
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

const remove = async (req, res) => {
  try {
    const { id } = req.params;
    const record = await Service.findByPk(id);
    if (!record) return res.status(404).json({ success: false, message: "Service not found" });
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

