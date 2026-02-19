const { News, NewsImage } = require("../models");
const { createCrudController } = require("../utils/crudControllerFactory");
const { toRelativeUploadPath } = require("../middleware/upload");

const withFeaturedPath = (req) => {
  const body = { ...req.body };
  if (req.file?.path) body.featured_image_path = toRelativeUploadPath(req.file.path);
  return body;
};

const crud = createCrudController({
  Model: News,
  name: "News",
  searchableFields: ["title", "slug", "content", "category", "status"],
  buildCreateData: withFeaturedPath,
  buildUpdateData: withFeaturedPath,
});

const publish = async (req, res) => {
  try {
    const { id } = req.params;
    const news = await News.findByPk(id);
    if (!news) return res.status(404).json({ success: false, message: "News not found" });
    const updated = await news.update({ status: "published", published_at: new Date() });
    return res.status(200).json({ success: true, data: updated });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Error publishing news", error: error.message });
  }
};

const archive = async (req, res) => {
  try {
    const { id } = req.params;
    const news = await News.findByPk(id);
    if (!news) return res.status(404).json({ success: false, message: "News not found" });
    const updated = await news.update({ status: "archived" });
    return res.status(200).json({ success: true, data: updated });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Error archiving news", error: error.message });
  }
};

const addNewsImage = async (req, res) => {
  try {
    const { id } = req.params; // news id
    const news = await News.findByPk(id);
    if (!news) return res.status(404).json({ success: false, message: "News not found" });

    if (!req.file?.path) {
      return res.status(400).json({ success: false, message: "news_image file is required" });
    }

    const { caption, uploaded_by } = req.body;
    const img = await NewsImage.create({
      news_id: id,
      image_path: toRelativeUploadPath(req.file.path),
      caption: caption ?? null,
      uploaded_by: uploaded_by ?? null,
    });
    return res.status(201).json({ success: true, data: img });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Error adding news image", error: error.message });
  }
};

module.exports = { ...crud, publish, archive, addNewsImage };

