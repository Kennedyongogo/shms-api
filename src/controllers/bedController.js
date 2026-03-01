const { Op } = require("sequelize");
const { Bed, Ward, Department } = require("../models");
const { createCrudController, parsePagination } = require("../utils/crudControllerFactory");
const { getHospitalId } = require("../utils/hospitalScope");

const crud = createCrudController({
  Model: Bed,
  name: "Bed",
  searchableFields: ["bed_number", "status"],
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
        pagination: { total: 0, page: 1, limit: parseInt(req.query.limit, 10) || 10, totalPages: 0 },
      });
    }
    const wardIds = await Ward.findAll({
      where: { department_id: { [Op.in]: departmentIds } },
      attributes: ["id"],
      raw: true,
    }).then((rows) => rows.map((r) => r.id));
    if (wardIds.length === 0) {
      return res.status(200).json({
        success: true,
        data: [],
        pagination: { total: 0, page: 1, limit: parseInt(req.query.limit, 10) || 10, totalPages: 0 },
      });
    }
    const where = { ward_id: { [Op.in]: wardIds } };
    if (search) {
      where[Op.or] = [
        { bed_number: { [Op.iLike]: `%${search}%` } },
        { status: { [Op.iLike]: `%${search}%` } },
      ];
    }
    const { count, rows } = await Bed.findAndCountAll({
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
    return res.status(500).json({ success: false, message: "Error fetching beds", error: error.message });
  }
};

const getByIdScoped = async (req, res) => {
  try {
    const { id } = req.params;
    const record = await Bed.findByPk(id, {
      include: [{ model: Ward, as: "ward", include: [{ model: Department, as: "department", attributes: ["hospital_id"] }] }],
    });
    if (!record) return res.status(404).json({ success: false, message: "Bed not found" });
    const hid = getHospitalId(req);
    if (hid != null && record.ward?.department?.hospital_id !== hid)
      return res.status(404).json({ success: false, message: "Bed not found" });
    return res.status(200).json({ success: true, data: record });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Error fetching bed", error: error.message });
  }
};

const update = async (req, res) => {
  try {
    const { id } = req.params;
    const bed = await Bed.findByPk(id, { include: [{ model: Ward, as: "ward", include: [{ model: Department, as: "department", attributes: ["hospital_id"] }] }] });
    if (!bed) return res.status(404).json({ success: false, message: "Bed not found" });
    if (bed.ward?.department && bed.ward.department.hospital_id !== getHospitalId(req))
      return res.status(403).json({ success: false, message: "Access denied" });
    return crud.update(req, res);
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

const remove = async (req, res) => {
  try {
    const { id } = req.params;
    const bed = await Bed.findByPk(id, { include: [{ model: Ward, as: "ward", include: [{ model: Department, as: "department", attributes: ["hospital_id"] }] }] });
    if (!bed) return res.status(404).json({ success: false, message: "Bed not found" });
    if (bed.ward?.department && bed.ward.department.hospital_id !== getHospitalId(req))
      return res.status(403).json({ success: false, message: "Access denied" });
    return crud.remove(req, res);
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

const create = async (req, res) => {
  const hid = getHospitalId(req);
  if (hid != null && req.body?.ward_id) {
    const ward = await Ward.findByPk(req.body.ward_id, { include: [{ model: Department, as: "department", attributes: ["hospital_id"] }] });
    if (!ward?.department || ward.department.hospital_id !== hid)
      return res.status(403).json({ success: false, message: "Ward does not belong to your hospital." });
  }
  return crud.create(req, res);
};

const updateBedStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const bed = await Bed.findByPk(id, { include: [{ model: Ward, as: "ward", include: [{ model: Department, as: "department", attributes: ["hospital_id"] }] }] });
    if (!bed) return res.status(404).json({ success: false, message: "Bed not found" });
    const hid = getHospitalId(req);
    if (hid != null && bed.ward?.department?.hospital_id !== hid)
      return res.status(403).json({ success: false, message: "Access denied" });
    const updated = await bed.update({ status });
    return res.status(200).json({ success: true, data: updated });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Error updating bed status", error: error.message });
  }
};

module.exports = { ...crud, getAll, getById: getByIdScoped, update, remove, create, updateBedStatus };

