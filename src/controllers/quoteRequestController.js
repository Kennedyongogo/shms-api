const { QuoteRequest } = require("../models");
const { Op } = require("sequelize");
const {
  logCreate,
  logUpdate,
  logDelete,
  logStatusChange,
} = require("../utils/auditLogger");

// Create quote request (public)
const createQuoteRequest = async (req, res) => {
  try {
    const { projectType, location, scaleOfOperation, expectedOutcomes, service } = req.body;

    // Validate required fields
    if (!projectType || !location || !scaleOfOperation || !expectedOutcomes) {
      return res.status(400).json({
        success: false,
        message: "Please provide projectType, location, scaleOfOperation, and expectedOutcomes",
      });
    }

    const quoteRequest = await QuoteRequest.create({
      projectType,
      location,
      scaleOfOperation,
      expectedOutcomes,
      service: service || null,
      status: "new",
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.get("User-Agent") || null,
    });

    res.status(201).json({
      success: true,
      message: "Thank you for your interest. We'll prepare a detailed proposal and get back to you soon.",
      data: {
        id: quoteRequest.id,
      },
    });
  } catch (error) {
    console.error("Error creating quote request:", error);
    res.status(500).json({
      success: false,
      message: "Error submitting quote request",
      error: error.message,
    });
  }
};

// Get all quote requests (admin) with filters
const getAllQuoteRequests = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      search,
      status,
      projectType,
      sortBy = "createdAt",
      sortOrder = "DESC",
    } = req.query;

    const where = {};

    if (search) {
      where[Op.or] = [
        { location: { [Op.like]: `%${search}%` } },
        { expectedOutcomes: { [Op.like]: `%${search}%` } },
        { service: { [Op.like]: `%${search}%` } },
      ];
    }

    if (status) {
      where.status = status;
    }

    if (projectType) {
      where.projectType = projectType;
    }

    const offset = (parseInt(page) - 1) * parseInt(limit);

    const { count, rows } = await QuoteRequest.findAndCountAll({
      where,
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [[sortBy, sortOrder]],
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
    console.error("Error fetching quote requests:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching quote requests",
      error: error.message,
    });
  }
};

// Get quote request by ID (admin)
const getQuoteRequestById = async (req, res) => {
  try {
    const { id } = req.params;
    const quoteRequest = await QuoteRequest.findByPk(id);

    if (!quoteRequest) {
      return res.status(404).json({
        success: false,
        message: "Quote request not found",
      });
    }

    res.status(200).json({
      success: true,
      data: quoteRequest,
    });
  } catch (error) {
    console.error("Error fetching quote request:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching quote request",
      error: error.message,
    });
  }
};

// Update quote request (admin)
const updateQuoteRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const quoteRequest = await QuoteRequest.findByPk(id);

    if (!quoteRequest) {
      return res.status(404).json({
        success: false,
        message: "Quote request not found",
      });
    }

    const oldValues = quoteRequest.toJSON();

    // If status is being updated, set reviewedBy and reviewedAt
    if (updates.status && updates.status !== quoteRequest.status) {
      updates.reviewedBy = req.user?.id || null;
      updates.reviewedAt = new Date();
    }

    // Convert quoteAmount to decimal if provided
    if (updates.quoteAmount !== undefined) {
      updates.quoteAmount = updates.quoteAmount ? parseFloat(updates.quoteAmount) : null;
    }

    updates.updatedAt = new Date();

    await quoteRequest.update(updates);

    if (req.user) {
      await logUpdate(
        req.user.id,
        "quoteRequest",
        quoteRequest.id,
        oldValues,
        updates,
        req,
        `Updated quote request ${quoteRequest.id}`
      );

      if (updates.status && updates.status !== oldValues.status) {
        await logStatusChange(
          req.user.id,
          "quoteRequest",
          quoteRequest.id,
          oldValues.status,
          updates.status,
          req,
          `Changed quote request status from ${oldValues.status} to ${updates.status}`
        );
      }
    }

    await quoteRequest.reload();

    res.status(200).json({
      success: true,
      message: "Quote request updated successfully",
      data: quoteRequest,
    });
  } catch (error) {
    console.error("Error updating quote request:", error);
    res.status(500).json({
      success: false,
      message: "Error updating quote request",
      error: error.message,
    });
  }
};

// Update quote request status (admin)
const updateQuoteRequestStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status || !["new", "quoted", "in_progress", "completed", "archived"].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Please provide a valid status (new, quoted, in_progress, completed, archived)",
      });
    }

    const quoteRequest = await QuoteRequest.findByPk(id);

    if (!quoteRequest) {
      return res.status(404).json({
        success: false,
        message: "Quote request not found",
      });
    }

    const oldStatus = quoteRequest.status;
    quoteRequest.status = status;
    quoteRequest.reviewedBy = req.user?.id || null;
    quoteRequest.reviewedAt = new Date();
    await quoteRequest.save();

    if (req.user) {
      await logStatusChange(
        req.user.id,
        "quoteRequest",
        quoteRequest.id,
        oldStatus,
        status,
        req,
        `Changed quote request status from ${oldStatus} to ${status}`
      );
    }

    res.status(200).json({
      success: true,
      message: "Quote request status updated successfully",
      data: quoteRequest,
    });
  } catch (error) {
    console.error("Error updating quote request status:", error);
    res.status(500).json({
      success: false,
      message: "Error updating quote request status",
      error: error.message,
    });
  }
};

// Delete quote request (admin)
const deleteQuoteRequest = async (req, res) => {
  try {
    const { id } = req.params;

    const quoteRequest = await QuoteRequest.findByPk(id);

    if (!quoteRequest) {
      return res.status(404).json({
        success: false,
        message: "Quote request not found",
      });
    }

    const quoteRequestData = {
      projectType: quoteRequest.projectType,
      location: quoteRequest.location,
      status: quoteRequest.status,
    };

    await quoteRequest.destroy();

    if (req.user) {
      await logDelete(
        req.user.id,
        "quoteRequest",
        quoteRequest.id,
        quoteRequestData,
        req,
        `Deleted quote request ${quoteRequest.id}`
      );
    }

    res.status(200).json({
      success: true,
      message: "Quote request deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting quote request:", error);
    res.status(500).json({
      success: false,
      message: "Error deleting quote request",
      error: error.message,
    });
  }
};

module.exports = {
  createQuoteRequest,
  getAllQuoteRequests,
  getQuoteRequestById,
  updateQuoteRequest,
  updateQuoteRequestStatus,
  deleteQuoteRequest,
};
