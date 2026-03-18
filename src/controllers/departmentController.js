const { Op } = require("sequelize");
const { Department, Hospital, Staff, Ward, Service, sequelize } = require("../models");
const { createCrudController, parsePagination } = require("../utils/crudControllerFactory");
const { scopeByHospital, belongsToUserHospital, withHospitalId } = require("../utils/hospitalScope");

const crud = createCrudController({
  Model: Department,
  name: "Department",
  searchableFields: ["name", "description"],
  include: [{ model: Hospital, as: "hospital", attributes: ["id", "name"], required: false }],
  scopeByHospital: true,
});

// List departments: always scoped to user's hospital when req.user.hospital_id is set
const getAll = async (req, res) => {
  try {
    const { page, limit, offset } = parsePagination(req.query);
    const { hospital_id, search } = req.query;
    const where = { ...scopeByHospital(req) };
    if (hospital_id && where.hospital_id == null) where.hospital_id = hospital_id;
    if (search) {
      where[Op.or] = [
        { name: { [Op.iLike]: `%${search}%` } },
        { description: { [Op.iLike]: `%${search}%` } },
      ];
    }

    const { count, rows } = await Department.findAndCountAll({
      where,
      include: [{ model: Hospital, as: "hospital", attributes: ["id", "name"], required: false }],
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
    return res.status(500).json({
      success: false,
      message: "Error fetching Departments",
      error: error.message,
    });
  }
};

const getByIdScoped = async (req, res) => {
  try {
    const { id } = req.params;
    const record = await Department.findByPk(id, {
      include: [{ model: Hospital, as: "hospital", attributes: ["id", "name"], required: false }],
    });
    if (!record) return res.status(404).json({ success: false, message: "Department not found" });
    if (!belongsToUserHospital(record, req)) return res.status(404).json({ success: false, message: "Department not found" });
    return res.status(200).json({ success: true, data: record });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Error fetching Department", error: error.message });
  }
};

const update = async (req, res) => {
  try {
    const { id } = req.params;
    const record = await Department.findByPk(id);
    if (!record) return res.status(404).json({ success: false, message: "Department not found" });
    if (!belongsToUserHospital(record, req)) return res.status(403).json({ success: false, message: "Access denied" });
    return crud.update(req, res);
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message });
  }
};

const remove = async (req, res) => {
  try {
    const { id } = req.params;
    const record = await Department.findByPk(id);
    if (!record) return res.status(404).json({ success: false, message: "Department not found" });
    if (!belongsToUserHospital(record, req)) return res.status(403).json({ success: false, message: "Access denied" });

    await sequelize.transaction(async (t) => {
      // Keep child records by moving them to another department in same hospital.
      // If none exists, create a fallback so delete can proceed.
      let fallback = await Department.findOne({
        where: {
          hospital_id: record.hospital_id,
          id: { [Op.ne]: id },
        },
        order: [["createdAt", "ASC"]],
        transaction: t,
      });

      if (!fallback) {
        fallback = await Department.create(
          {
            hospital_id: record.hospital_id,
            name: "General Department",
            description: "Auto-created fallback department",
          },
          { transaction: t },
        );
      }

      await Promise.all([
        Ward.update(
          { department_id: fallback.id },
          { where: { department_id: id }, transaction: t },
        ),
        Service.update(
          { department_id: fallback.id },
          { where: { department_id: id }, transaction: t },
        ),
        Staff.update(
          { department_id: fallback.id },
          { where: { department_id: id, hospital_id: record.hospital_id }, transaction: t },
        ),
      ]);

      await record.destroy({ transaction: t });
    });

    return res.status(200).json({ success: true, message: "Department deleted" });
  } catch (e) {
    if (e.name === "SequelizeForeignKeyConstraintError") {
      return res.status(409).json({
        success: false,
        message: "Cannot delete department because it is still referenced by other records",
        error: e.message,
      });
    }
    return res.status(500).json({ success: false, message: e.message });
  }
};

const create = async (req, res) => {
  req.body = withHospitalId(req.body || {}, req);
  return crud.create(req, res);
};

module.exports = { ...crud, getAll, getById: getByIdScoped, update, remove, create };

