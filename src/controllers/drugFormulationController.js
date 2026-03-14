const { DrugFormulation, Drug } = require("../models");
const { createCrudController, parsePagination } = require("../utils/crudControllerFactory");

const formulationInclude = [{ model: Drug, as: "drug", attributes: ["id", "name"] }];

const baseCrud = createCrudController({
  Model: DrugFormulation,
  name: "DrugFormulation",
  searchableFields: ["dose_form", "strength_size"],
  include: formulationInclude,
  defaultOrder: [
    ["sort_order", "ASC"],
    ["dose_form", "ASC"],
    ["strength_size", "ASC"],
  ],
  scopeByHospital: false,
});

// getAll: add optional filter by drug_id
const getAll = async (req, res) => {
  try {
    const { page, limit, offset } = parsePagination(req.query);
    const { search, drug_id } = req.query;
    const { Op } = require("sequelize");

    const where = {};
    if (drug_id) where.drug_id = drug_id;
    if (search) {
      where[Op.or] = [
        { dose_form: { [Op.iLike]: `%${search}%` } },
        { strength_size: { [Op.iLike]: `%${search}%` } },
      ];
    }

    const { count, rows } = await DrugFormulation.findAndCountAll({
      where,
      limit,
      offset,
      include: formulationInclude,
      order: [
        ["sort_order", "ASC"],
        ["dose_form", "ASC"],
        ["strength_size", "ASC"],
      ],
    });

    return res.status(200).json({
      success: true,
      data: rows,
      pagination: { total: count, page: req.query.page || 1, limit, totalPages: Math.ceil(count / limit) },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Error fetching formulations",
      error: error.message,
    });
  }
};

module.exports = { ...baseCrud, getAll };
