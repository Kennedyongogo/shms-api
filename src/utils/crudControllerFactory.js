const { Op } = require("sequelize");

const parsePagination = (query) => {
  const page = Math.max(parseInt(query.page ?? "1", 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(query.limit ?? "10", 10) || 10, 1), 100);
  const offset = (page - 1) * limit;
  return { page, limit, offset };
};

const buildSearchWhere = (search, searchableFields = []) => {
  if (!search || !searchableFields.length) return {};
  return {
    [Op.or]: searchableFields.map((field) => ({
      [field]: { [Op.iLike]: `%${search}%` },
    })),
  };
};

const createCrudController = ({
  Model,
  name,
  searchableFields = [],
  buildCreateData,
  buildUpdateData,
  include,
  defaultOrder = [["createdAt", "DESC"]],
}) => {
  const create = async (req, res) => {
    try {
      const payload = buildCreateData ? await buildCreateData(req) : req.body;
      const created = await Model.create(payload);
      return res.status(201).json({ success: true, data: created });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: `Error creating ${name}`,
        error: error.message,
      });
    }
  };

  const getAll = async (req, res) => {
    try {
      const { page, limit, offset } = parsePagination(req.query);
      const { search } = req.query;

      const where = buildSearchWhere(search, searchableFields);
      const { count, rows } = await Model.findAndCountAll({
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
        message: `Error fetching ${name}s`,
        error: error.message,
      });
    }
  };

  const getById = async (req, res) => {
    try {
      const { id } = req.params;
      const record = await Model.findByPk(id, { include });
      if (!record) return res.status(404).json({ success: false, message: `${name} not found` });
      return res.status(200).json({ success: true, data: record });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: `Error fetching ${name}`,
        error: error.message,
      });
    }
  };

  const update = async (req, res) => {
    try {
      const { id } = req.params;
      const record = await Model.findByPk(id);
      if (!record) return res.status(404).json({ success: false, message: `${name} not found` });

      const payload = buildUpdateData ? await buildUpdateData(req, record) : req.body;
      const updated = await record.update(payload);
      return res.status(200).json({ success: true, data: updated });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: `Error updating ${name}`,
        error: error.message,
      });
    }
  };

  const remove = async (req, res) => {
    try {
      const { id } = req.params;
      const record = await Model.findByPk(id);
      if (!record) return res.status(404).json({ success: false, message: `${name} not found` });
      await record.destroy();
      return res.status(200).json({ success: true, message: `${name} deleted` });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: `Error deleting ${name}`,
        error: error.message,
      });
    }
  };

  return { create, getAll, getById, update, remove };
};

module.exports = { createCrudController, parsePagination };

