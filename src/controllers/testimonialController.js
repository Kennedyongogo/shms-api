const { Testimonial } = require("../models");
const { createCrudController, parsePagination } = require("../utils/crudControllerFactory");

const crud = createCrudController({
  Model: Testimonial,
  name: "Testimonial",
  searchableFields: ["quote", "author", "role"],
  scopeByHospital: false,
  defaultOrder: [["createdAt", "DESC"]],
});

/** Public: list approved testimonials only (no auth) */
const getApproved = async (req, res) => {
  try {
    const { page, limit, offset } = parsePagination(req.query);
    const { count, rows } = await Testimonial.findAndCountAll({
      where: { is_approved: true },
      limit,
      offset,
      order: [["createdAt", "DESC"]],
      attributes: ["id", "quote", "author", "role", "rating", "createdAt"],
    });
    return res.status(200).json({
      success: true,
      data: rows,
      pagination: { total: count, page, limit, totalPages: Math.ceil(count / limit) },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Error fetching testimonials",
      error: error.message,
    });
  }
};

/** Public: submit a review (no auth) */
const create = async (req, res) => {
  try {
    const { quote, author, role, rating } = req.body;
    if (!quote || typeof quote !== "string" || !quote.trim()) {
      return res.status(400).json({ success: false, message: "Quote is required" });
    }
    if (!author || typeof author !== "string" || !author.trim()) {
      return res.status(400).json({ success: false, message: "Author is required" });
    }
    const numRating = rating != null ? Number(rating) : 5;
    if (numRating < 1 || numRating > 5) {
      return res.status(400).json({ success: false, message: "Rating must be between 1 and 5" });
    }
    const created = await Testimonial.create({
      quote: quote.trim(),
      author: author.trim(),
      role: role != null ? String(role).trim() : null,
      rating: Math.round(numRating),
      is_approved: true,
    });
    return res.status(201).json({ success: true, data: created });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Error submitting testimonial",
      error: error.message,
    });
  }
};

module.exports = {
  getApproved,
  getAll: crud.getAll,
  getById: crud.getById,
  create,
  update: crud.update,
  remove: crud.remove,
};
