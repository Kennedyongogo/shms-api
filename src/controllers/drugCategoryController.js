const { DrugCategory, Drug } = require("../models");
const { createCrudController, parsePagination } = require("../utils/crudControllerFactory");
const { Op } = require("sequelize");

const defaultOrder = [
  ["sort_order", "ASC"],
  ["code", "ASC"],
  ["name", "ASC"],
];

const includeWithDrugs = [
  { model: DrugCategory, as: "subcategories", required: false },
  { model: Drug, as: "drugs", required: false },
];

const baseCrud = createCrudController({
  Model: DrugCategory,
  name: "DrugCategory",
  searchableFields: ["name", "code"],
  include: includeWithDrugs,
  defaultOrder,
  scopeByHospital: false,
});

/** Fast get-all: when minimal=1 skip subcategories and drugs (single table query). */
const getAll = async (req, res) => {
  try {
    // Allow higher limit for catalogue (e.g. 500) so frontend can get all categories/roots in one call
    const page = Math.max(parseInt(req.query.page ?? "1", 10) || 1, 1);
    const rawLimit = parseInt(req.query.limit ?? "10", 10) || 10;
    const limit = Math.min(Math.max(rawLimit, 1), 500);
    const offset = (page - 1) * limit;
    const { search, minimal } = req.query;
    const buildSearchWhere = (s, fields) => {
      if (!s || !fields.length) return {};
      return { [Op.or]: fields.map((f) => ({ [f]: { [Op.iLike]: `%${s}%` } })) };
    };
    const where = buildSearchWhere(search, ["name", "code"]);
    const include = minimal === "1" || minimal === "true" ? [] : includeWithDrugs;
    const { count, rows } = await DrugCategory.findAndCountAll({
      where,
      limit,
      offset,
      include,
      order: defaultOrder,
    });
    return res.status(200).json({
      success: true,
      data: rows,
      pagination: { total: count, page, limit, totalPages: Math.ceil(count / limit) },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Error fetching DrugCategories",
      error: error.message,
    });
  }
};

/** Fast get-one: when minimal=1 skip subcategories and drugs. */
const getById = async (req, res) => {
  try {
    const { id } = req.params;
    const { minimal } = req.query;
    const include = minimal === "1" || minimal === "true" ? [] : includeWithDrugs;
    const record = await DrugCategory.findByPk(id, { include });
    if (!record) return res.status(404).json({ success: false, message: "DrugCategory not found" });
    return res.status(200).json({ success: true, data: record });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Error fetching DrugCategory",
      error: error.message,
    });
  }
};

module.exports = { ...baseCrud, getAll, getById };
