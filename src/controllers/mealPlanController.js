const { MealPlan, DietType } = require("../models");
const { createCrudController, parsePagination } = require("../utils/crudControllerFactory");

const include = [{ model: DietType, as: "dietType", attributes: ["id", "name", "description"] }];

const crud = createCrudController({
  Model: MealPlan,
  name: "MealPlan",
  searchableFields: ["breakfast", "lunch", "dinner", "snack"],
  include,
  defaultOrder: [["createdAt", "DESC"]],
});

const getAll = async (req, res) => {
  try {
    const { page, limit, offset } = parsePagination(req.query);
    const { search, diet_type_id } = req.query;
    const where = {};
    if (diet_type_id && String(diet_type_id).trim()) {
      where.diet_type_id = String(diet_type_id).trim();
    }
    const { count, rows } = await MealPlan.findAndCountAll({
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
    return res.status(500).json({
      success: false,
      message: "Error fetching meal plans",
      error: error.message,
    });
  }
};

module.exports = { ...crud, getAll };
