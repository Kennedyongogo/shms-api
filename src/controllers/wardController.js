const { Op } = require("sequelize");
const { Ward, Department } = require("../models");
const { createCrudController, parsePagination } = require("../utils/crudControllerFactory");
const { getHospitalId, belongsToUserHospital } = require("../utils/hospitalScope");

const crud = createCrudController({
  Model: Ward,
  name: "Ward",
  searchableFields: ["name", "type"],
});

const getAll = async (req, res) => {
  const hid = getHospitalId(req);
  if (hid == null) return crud.getAll(req, res);
  try {
    const { page, limit, offset } = parsePagination(req.query);
    const { search } = req.query;
    const departmentIds = await Department.findAll({
      where: { hospital_id: hid },
      attributes: ["id"],
      raw: true,
    }).then((rows) => rows.map((r) => r.id));
    if (departmentIds.length === 0) {
      return res.status(200).json({
        success: true,
        data: [],
        pagination: { total: 0, page: 1, limit: limit || 10, totalPages: 0 },
      });
    }
    const where = { department_id: { [Op.in]: departmentIds } };
    if (search) {
      where[Op.or] = [
        { name: { [Op.iLike]: `%${search}%` } },
        { type: { [Op.iLike]: `%${search}%` } },
      ];
    }
    const { count, rows } = await Ward.findAndCountAll({
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
    return res.status(500).json({ success: false, message: "Error fetching wards", error: error.message });
  }
};

const getByIdScoped = async (req, res) => {
  try {
    const { id } = req.params;
    const record = await Ward.findByPk(id, { include: [{ model: Department, as: "department", attributes: ["id", "hospital_id"] }] });
    if (!record) return res.status(404).json({ success: false, message: "Ward not found" });
    if (record.department && !belongsToUserHospital(record.department, req))
      return res.status(404).json({ success: false, message: "Ward not found" });
    return res.status(200).json({ success: true, data: record });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Error fetching ward", error: error.message });
  }
};

const update = async (req, res) => {
  try {
    const { id } = req.params;
    const record = await Ward.findByPk(id, { include: [{ model: Department, as: "department", attributes: ["hospital_id"] }] });
    if (!record) return res.status(404).json({ success: false, message: "Ward not found" });
    if (record.department && !belongsToUserHospital(record.department, req))
      return res.status(403).json({ success: false, message: "Access denied" });
    return crud.update(req, res);
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

const remove = async (req, res) => {
  try {
    const { id } = req.params;
    const record = await Ward.findByPk(id, { include: [{ model: Department, as: "department", attributes: ["hospital_id"] }] });
    if (!record) return res.status(404).json({ success: false, message: "Ward not found" });
    if (record.department && !belongsToUserHospital(record.department, req))
      return res.status(403).json({ success: false, message: "Access denied" });
    return crud.remove(req, res);
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

const create = async (req, res) => {
  const hid = getHospitalId(req);
  if (hid != null && req.body?.department_id) {
    const dept = await Department.findByPk(req.body.department_id, { attributes: ["hospital_id"] });
    if (!dept || dept.hospital_id !== hid)
      return res.status(403).json({ success: false, message: "Department does not belong to your hospital." });
  }
  return crud.create(req, res);
};

module.exports = { ...crud, getAll, getById: getByIdScoped, update, remove, create };

