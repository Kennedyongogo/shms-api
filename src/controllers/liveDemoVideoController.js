const { Op } = require("sequelize");
const { LiveDemoVideo } = require("../models");
const { createCrudController, parsePagination } = require("../utils/crudControllerFactory");
const { toRelativeUploadPath } = require("../middleware/upload");

const buildCreateData = (req) => {
  const body = { ...req.body };
  if (req.file?.path) body.video_path = toRelativeUploadPath(req.file.path);
  if (!body.video_path && !body.video_url) {
    throw new Error("Either video_path (upload) or video_url must be provided");
  }
  return body;
};

const buildUpdateData = (req) => {
  const body = { ...req.body };
  if (req.file?.path) body.video_path = toRelativeUploadPath(req.file.path);
  return body;
};

const crud = createCrudController({
  Model: LiveDemoVideo,
  name: "LiveDemoVideo",
  searchableFields: ["title", "description", "subscription_package"],
  buildCreateData,
  buildUpdateData,
  scopeByHospital: false,
  defaultOrder: [
    ["subscription_package", "ASC"],
    ["sort_order", "ASC"],
    ["createdAt", "DESC"],
  ],
});

const getAll = async (req, res) => {
  try {
    const { page, limit, offset } = parsePagination(req.query);
    const { search, subscription_package, is_active } = req.query;
    const where = {};
    if (subscription_package) where.subscription_package = subscription_package;
    if (is_active !== undefined) where.is_active = is_active === "true" || is_active === true;
    if (search) {
      where[Op.or] = [
        { title: { [Op.iLike]: `%${search}%` } },
        { description: { [Op.iLike]: `%${search}%` } },
        { subscription_package: { [Op.iLike]: `%${search}%` } },
      ];
    }
    const { count, rows } = await LiveDemoVideo.findAndCountAll({
      where,
      limit,
      offset,
      order: [
        ["subscription_package", "ASC"],
        ["sort_order", "ASC"],
        ["createdAt", "DESC"],
      ],
    });
    return res.status(200).json({
      success: true,
      data: rows,
      pagination: { total: count, page, limit, totalPages: Math.ceil(count / limit) },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Error fetching live demo videos", error: error.message });
  }
};

const getByPackage = async (req, res) => {
  try {
    const { package: pkg } = req.params;
    if (!["silver", "gold"].includes(pkg)) {
      return res.status(400).json({ success: false, message: "Invalid package. Use silver or gold" });
    }
    const videos = await LiveDemoVideo.findAll({
      where: { subscription_package: pkg, is_active: true },
      order: [
        ["sort_order", "ASC"],
        ["createdAt", "DESC"],
      ],
    });
    return res.status(200).json({ success: true, data: videos });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Error fetching demo videos by package", error: error.message });
  }
};

const create = async (req, res) => {
  try {
    req.body = buildCreateData(req);
  } catch (err) {
    return res.status(400).json({ success: false, message: err.message || "Either upload a video (demo_video) or provide video_url" });
  }
  return crud.create(req, res);
};

const update = async (req, res) => {
  req.body = buildUpdateData(req);
  return crud.update(req, res);
};

module.exports = {
  getAll,
  getById: crud.getById,
  getByPackage,
  create,
  update,
  remove: crud.remove,
};
