const { DoctorSchedule } = require("../models");
const { createCrudController, parsePagination } = require("../utils/crudControllerFactory");

const base = createCrudController({
  Model: DoctorSchedule,
  name: "DoctorSchedule",
  searchableFields: [],
});

const getAll = async (req, res) => {
  try {
    const { page, limit, offset } = parsePagination(req.query);
    const where = {};
    if (req.query.doctor_id) where.doctor_id = req.query.doctor_id;
    const { count, rows } = await DoctorSchedule.findAndCountAll({
      where,
      limit,
      offset,
      order: [["day_of_week", "ASC"], ["start_time", "ASC"]],
    });
    return res.status(200).json({
      success: true,
      data: rows,
      pagination: { total: count, page, limit, totalPages: Math.ceil(count / limit) },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Error fetching schedules",
      error: error.message,
    });
  }
};

module.exports = {
  ...base,
  getAll,
};

