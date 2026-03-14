const { Drug, DrugCategory, DrugFormulation } = require("../models");
const { createCrudController, parsePagination } = require("../utils/crudControllerFactory");
const { Op } = require("sequelize");

const drugInclude = [
  {
    model: DrugCategory,
    as: "drugCategory",
    attributes: ["id", "name", "code", "parent_id"],
    required: false,
  },
  {
    model: DrugFormulation,
    as: "drugFormulations",
    attributes: ["id", "dose_form", "strength_size", "lou", "sort_order"],
    required: false,
    separate: true,
    order: [["sort_order", "ASC"], ["dose_form", "ASC"]],
  },
];

/** Build plain object without touching circular refs (Drug -> formulations -> drug). */
function toSafePlain(drug) {
  const d = drug.dataValues || drug;
  const plain = {
    id: d.id,
    drug_category_id: d.drug_category_id,
    name: d.name,
    sort_order: d.sort_order,
    createdAt: d.createdAt,
    updatedAt: d.updatedAt,
  };
  const cat = drug.drugCategory;
  if (cat && cat.dataValues) {
    plain.drugCategory = {
      id: cat.dataValues.id,
      name: cat.dataValues.name,
      code: cat.dataValues.code,
      parent_id: cat.dataValues.parent_id,
    };
  }
  const forms = drug.drugFormulations;
  if (forms && Array.isArray(forms)) {
    plain.formulations = forms.map((f) => ({
      id: f.dataValues?.id ?? f.id,
      dose_form: f.dataValues?.dose_form ?? f.dose_form,
      strength_size: f.dataValues?.strength_size ?? f.strength_size,
      lou: f.dataValues?.lou ?? f.lou,
      sort_order: f.dataValues?.sort_order ?? f.sort_order,
    }));
  } else if (d.formulations != null) {
    plain.formulations = d.formulations;
  }
  return plain;
}

const baseCrud = createCrudController({
  Model: Drug,
  name: "Drug",
  searchableFields: ["name", "formulations"],
  include: drugInclude,
  defaultOrder: [
    ["sort_order", "ASC"],
    ["name", "ASC"],
  ],
  scopeByHospital: false,
});

const getAll = async (req, res) => {
  try {
    const { page, limit, offset } = parsePagination(req.query);
    const { search, drug_category_id } = req.query;
    const buildSearchWhere = (s, fields) => {
      if (!s || !fields.length) return {};
      return { [Op.or]: fields.map((field) => ({ [field]: { [Op.iLike]: `%${s}%` } })) };
    };
    const where = { ...buildSearchWhere(search, ["name", "formulations"]) };
    if (drug_category_id) {
      const ids = String(drug_category_id).split(",").map((id) => id.trim()).filter(Boolean);
      if (ids.length) where.drug_category_id = ids.length === 1 ? ids[0] : { [Op.in]: ids };
    }
    // When filtering by category, skip drugCategory include (faster, client already has category)
    const include =
      drug_category_id && where.drug_category_id
        ? drugInclude.filter((inc) => inc.as !== "drugCategory")
        : drugInclude;
    const { count, rows } = await Drug.findAndCountAll({
      where,
      limit,
      offset,
      include,
      order: [
        ["sort_order", "ASC"],
        ["name", "ASC"],
      ],
    });
    const data = rows.map((row) => toSafePlain(row));
    return res.status(200).json({
      success: true,
      data,
      pagination: { total: count, page, limit, totalPages: Math.ceil(count / limit) },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Error fetching Drugs",
      error: error.message,
    });
  }
};

const getById = async (req, res) => {
  try {
    const record = await Drug.findByPk(req.params.id, { include: drugInclude });
    if (!record) return res.status(404).json({ success: false, message: "Drug not found" });
    return res.status(200).json({ success: true, data: toSafePlain(record) });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Error fetching Drug",
      error: error.message,
    });
  }
};

module.exports = { ...baseCrud, getAll, getById };
