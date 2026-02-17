const { FAQ } = require("../models");
const { Op } = require("sequelize");
const {
  logCreate,
  logUpdate,
  logDelete,
  logStatusChange,
} = require("../utils/auditLogger");

// Create FAQ
const createFAQ = async (req, res) => {
  try {
    const {
      question,
      answer,
      category,
      displayOrder,
      status,
    } = req.body;

    // Validate required fields
    if (!question || !answer) {
      return res.status(400).json({
        success: false,
        message: "Please provide question and answer",
      });
    }

    const faq = await FAQ.create({
      question,
      answer,
      category: category || null,
      displayOrder: displayOrder ? parseInt(displayOrder) : 0,
      status: status ?? "active",
      views: 0,
      created_by: req.user?.id || null,
      updated_by: req.user?.id || null,
    });

    if (req.user) {
      await logCreate(
        req.user.id,
        "faq",
        faq.id,
        { question: faq.question.substring(0, 50), status: faq.status },
        req
      );
    }

    res.status(201).json({
      success: true,
      message: "FAQ created successfully",
      data: faq,
    });
  } catch (error) {
    console.error("Error creating FAQ:", error);
    res.status(500).json({
      success: false,
      message: "Error creating FAQ",
      error: error.message,
    });
  }
};

// Get all FAQs (admin) with filters
const getAllFAQs = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      search,
      category,
      status,
      sortBy = "displayOrder",
      sortOrder = "ASC",
    } = req.query;

    const where = {};

    if (search) {
      where[Op.or] = [
        { question: { [Op.like]: `%${search}%` } },
        { answer: { [Op.like]: `%${search}%` } },
      ];
    }

    if (category) {
      where.category = category;
    }

    if (status) {
      where.status = status;
    }

    const offset = (parseInt(page) - 1) * parseInt(limit);

    const { count, rows } = await FAQ.findAndCountAll({
      where,
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [[sortBy, sortOrder], ["createdAt", "DESC"]],
    });

    res.status(200).json({
      success: true,
      data: rows,
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(count / parseInt(limit)),
      },
    });
  } catch (error) {
    console.error("Error fetching FAQs:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching FAQs",
      error: error.message,
    });
  }
};

// Get FAQ by ID (admin)
const getFAQById = async (req, res) => {
  try {
    const { id } = req.params;
    const faq = await FAQ.findByPk(id);

    if (!faq) {
      return res.status(404).json({
        success: false,
        message: "FAQ not found",
      });
    }

    res.status(200).json({
      success: true,
      data: faq,
    });
  } catch (error) {
    console.error("Error fetching FAQ:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching FAQ",
      error: error.message,
    });
  }
};

// Get public FAQs (active only)
const getPublicFAQs = async (req, res) => {
  try {
    const { category } = req.query;
    const where = { status: "active" };

    if (category) {
      where.category = category;
    }

    const faqs = await FAQ.findAll({
      where,
      order: [
        ["displayOrder", "ASC"],
        ["createdAt", "DESC"],
      ],
      attributes: {
        exclude: ["isDeleted", "deletedAt", "updated_by", "created_by", "views"],
      },
    });

    res.status(200).json({
      success: true,
      count: faqs.length,
      data: faqs,
    });
  } catch (error) {
    console.error("Error fetching public FAQs:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching FAQs",
      error: error.message,
    });
  }
};

// Increment FAQ view count (when expanded)
const incrementFAQView = async (req, res) => {
  try {
    const { id } = req.params;
    const faq = await FAQ.findOne({ where: { id, status: "active" } });
    
    if (!faq) {
      return res.status(404).json({
        success: false,
        message: "FAQ not found",
      });
    }
    
    await faq.increment("views");
    await faq.reload({ attributes: ["views"] });

    return res.status(200).json({
      success: true,
      message: "View count incremented",
      data: { views: faq.views },
    });
  } catch (error) {
    console.error("Error incrementing FAQ view:", error);
    res.status(500).json({
      success: false,
      message: "Error incrementing view count",
      error: error.message,
    });
  }
};

// Update FAQ
const updateFAQ = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const faq = await FAQ.findByPk(id);

    if (!faq) {
      return res.status(404).json({
        success: false,
        message: "FAQ not found",
      });
    }

    const oldValues = faq.toJSON();

    // Convert numeric strings to numbers
    if (updates.displayOrder !== undefined) {
      updates.displayOrder = parseInt(updates.displayOrder);
    }

    updates.updated_by = req.user?.id || null;

    await faq.update(updates);

    if (req.user) {
      await logUpdate(
        req.user.id,
        "faq",
        faq.id,
        oldValues,
        updates,
        req,
        `Updated FAQ ${faq.id}`
      );

      if (updates.status && updates.status !== oldValues.status) {
        await logStatusChange(
          req.user.id,
          "faq",
          faq.id,
          oldValues.status,
          updates.status,
          req,
          `Changed FAQ status from ${oldValues.status} to ${updates.status}`
        );
      }
    }

    // Reload to get updated data
    await faq.reload();

    res.status(200).json({
      success: true,
      message: "FAQ updated successfully",
      data: faq,
    });
  } catch (error) {
    console.error("Error updating FAQ:", error);
    res.status(500).json({
      success: false,
      message: "Error updating FAQ",
      error: error.message,
    });
  }
};

// Update FAQ status
const updateFAQStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status || !["active", "inactive"].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Please provide a valid status (active, inactive)",
      });
    }

    const faq = await FAQ.findByPk(id);

    if (!faq) {
      return res.status(404).json({
        success: false,
        message: "FAQ not found",
      });
    }

    const oldStatus = faq.status;
    faq.status = status;
    faq.updated_by = req.user?.id || null;
    await faq.save();

    if (req.user) {
      await logStatusChange(
        req.user.id,
        "faq",
        faq.id,
        oldStatus,
        status,
        req,
        `Changed FAQ status from ${oldStatus} to ${status}`
      );
    }

    res.status(200).json({
      success: true,
      message: "FAQ status updated successfully",
      data: faq,
    });
  } catch (error) {
    console.error("Error updating FAQ status:", error);
    res.status(500).json({
      success: false,
      message: "Error updating FAQ status",
      error: error.message,
    });
  }
};

// Delete FAQ
const deleteFAQ = async (req, res) => {
  try {
    const { id } = req.params;

    const faq = await FAQ.findByPk(id);

    if (!faq) {
      return res.status(404).json({
        success: false,
        message: "FAQ not found",
      });
    }

    const faqData = {
      question: faq.question.substring(0, 50),
      status: faq.status,
    };

    // Soft delete
    await faq.destroy();

    if (req.user) {
      await logDelete(
        req.user.id,
        "faq",
        faq.id,
        faqData,
        req,
        `Deleted FAQ ${faq.id}`
      );
    }

    res.status(200).json({
      success: true,
      message: "FAQ deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting FAQ:", error);
    res.status(500).json({
      success: false,
      message: "Error deleting FAQ",
      error: error.message,
    });
  }
};

module.exports = {
  createFAQ,
  getAllFAQs,
  getFAQById,
  getPublicFAQs,
  incrementFAQView,
  updateFAQ,
  updateFAQStatus,
  deleteFAQ,
};
