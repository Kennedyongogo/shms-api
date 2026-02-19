const { Op } = require("sequelize");
const { Department, Hospital } = require("../models");
const { createCrudController, parsePagination } = require("../utils/crudControllerFactory");

const crud = createCrudController({
  Model: Department,
  name: "Department",
  searchableFields: ["name", "description"],
  include: [{ model: Hospital, as: "hospital", attributes: ["id", "name"], required: false }],
});

// Add hospital_id filter support for listing
const getAll = async (req, res) => {
  try {
    const { page, limit, offset } = parsePagination(req.query);
    const { hospital_id, search } = req.query;
    const where = {};
    if (hospital_id) where.hospital_id = hospital_id;
    if (search) {
      where[Op.or] = [
        { name: { [Op.iLike]: `%${search}%` } },
        { description: { [Op.iLike]: `%${search}%` } },
      ];
    }

    // If no hospital_id, fall back to standard crud getAll (keeps search behavior)
    if (!hospital_id) return crud.getAll(req, res);

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

module.exports = { ...crud, getAll };

