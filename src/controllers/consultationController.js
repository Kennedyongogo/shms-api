const { Consultation } = require("../models");
const { Op } = require("sequelize");
const {
  logCreate,
  logUpdate,
  logDelete,
  logStatusChange,
} = require("../utils/auditLogger");

// Create consultation (public)
const createConsultation = async (req, res) => {
  try {
    const {
      fullName,
      email,
      phone,
      consultationType,
      preferredDate,
      preferredTime,
      message,
    } = req.body;

    // Validate required fields
    if (!fullName || !email || !phone || !consultationType) {
      return res.status(400).json({
        success: false,
        message: "Please provide fullName, email, phone, and consultationType",
      });
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: "Please provide a valid email address",
      });
    }

    const consultation = await Consultation.create({
      fullName,
      email,
      phone,
      consultationType,
      preferredDate: preferredDate || null,
      preferredTime: preferredTime || null,
      message: message || null,
      status: "pending",
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.get("User-Agent") || null,
    });

    res.status(201).json({
      success: true,
      message: "Thank you for booking a consultation. We'll contact you soon to confirm your appointment.",
      data: {
        id: consultation.id,
      },
    });
  } catch (error) {
    console.error("Error creating consultation:", error);
    res.status(500).json({
      success: false,
      message: "Error booking consultation",
      error: error.message,
    });
  }
};

// Get all consultations (admin) with filters
const getAllConsultations = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      search,
      status,
      consultationType,
      sortBy = "createdAt",
      sortOrder = "DESC",
    } = req.query;

    const where = {};

    if (search) {
      where[Op.or] = [
        { fullName: { [Op.like]: `%${search}%` } },
        { email: { [Op.like]: `%${search}%` } },
        { phone: { [Op.like]: `%${search}%` } },
        { message: { [Op.like]: `%${search}%` } },
      ];
    }

    if (status) {
      where.status = status;
    }

    if (consultationType) {
      where.consultationType = consultationType;
    }

    const offset = (parseInt(page) - 1) * parseInt(limit);

    const { count, rows } = await Consultation.findAndCountAll({
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
    console.error("Error fetching consultations:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching consultations",
      error: error.message,
    });
  }
};

// Get consultation by ID (admin)
const getConsultationById = async (req, res) => {
  try {
    const { id } = req.params;
    const consultation = await Consultation.findByPk(id);

    if (!consultation) {
      return res.status(404).json({
        success: false,
        message: "Consultation not found",
      });
    }

    res.status(200).json({
      success: true,
      data: consultation,
    });
  } catch (error) {
    console.error("Error fetching consultation:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching consultation",
      error: error.message,
    });
  }
};

// Update consultation (admin)
const updateConsultation = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const consultation = await Consultation.findByPk(id);

    if (!consultation) {
      return res.status(404).json({
        success: false,
        message: "Consultation not found",
      });
    }

    const oldValues = consultation.toJSON();

    // If status is being updated, set reviewedBy and reviewedAt
    if (updates.status && updates.status !== consultation.status) {
      updates.reviewedBy = req.user?.id || null;
      updates.reviewedAt = new Date();
    }

    // If scheduling, update scheduledDate
    if (updates.status === "scheduled" && updates.scheduledDate) {
      updates.scheduledDate = new Date(updates.scheduledDate);
    }

    updates.updatedAt = new Date();

    await consultation.update(updates);

    if (req.user) {
      await logUpdate(
        req.user.id,
        "consultation",
        consultation.id,
        oldValues,
        updates,
        req,
        `Updated consultation ${consultation.id}`
      );

      if (updates.status && updates.status !== oldValues.status) {
        await logStatusChange(
          req.user.id,
          "consultation",
          consultation.id,
          oldValues.status,
          updates.status,
          req,
          `Changed consultation status from ${oldValues.status} to ${updates.status}`
        );
      }
    }

    await consultation.reload();

    res.status(200).json({
      success: true,
      message: "Consultation updated successfully",
      data: consultation,
    });
  } catch (error) {
    console.error("Error updating consultation:", error);
    res.status(500).json({
      success: false,
      message: "Error updating consultation",
      error: error.message,
    });
  }
};

// Update consultation status (admin)
const updateConsultationStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status || !["pending", "scheduled", "completed", "cancelled", "archived"].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Please provide a valid status (pending, scheduled, completed, cancelled, archived)",
      });
    }

    const consultation = await Consultation.findByPk(id);

    if (!consultation) {
      return res.status(404).json({
        success: false,
        message: "Consultation not found",
      });
    }

    const oldStatus = consultation.status;
    consultation.status = status;
    consultation.reviewedBy = req.user?.id || null;
    consultation.reviewedAt = new Date();
    await consultation.save();

    if (req.user) {
      await logStatusChange(
        req.user.id,
        "consultation",
        consultation.id,
        oldStatus,
        status,
        req,
        `Changed consultation status from ${oldStatus} to ${status}`
      );
    }

    res.status(200).json({
      success: true,
      message: "Consultation status updated successfully",
      data: consultation,
    });
  } catch (error) {
    console.error("Error updating consultation status:", error);
    res.status(500).json({
      success: false,
      message: "Error updating consultation status",
      error: error.message,
    });
  }
};

// Delete consultation (admin)
const deleteConsultation = async (req, res) => {
  try {
    const { id } = req.params;

    const consultation = await Consultation.findByPk(id);

    if (!consultation) {
      return res.status(404).json({
        success: false,
        message: "Consultation not found",
      });
    }

    const consultationData = {
      fullName: consultation.fullName,
      email: consultation.email,
      consultationType: consultation.consultationType,
      status: consultation.status,
    };

    await consultation.destroy();

    if (req.user) {
      await logDelete(
        req.user.id,
        "consultation",
        consultation.id,
        consultationData,
        req,
        `Deleted consultation ${consultation.id}`
      );
    }

    res.status(200).json({
      success: true,
      message: "Consultation deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting consultation:", error);
    res.status(500).json({
      success: false,
      message: "Error deleting consultation",
      error: error.message,
    });
  }
};

module.exports = {
  createConsultation,
  getAllConsultations,
  getConsultationById,
  updateConsultation,
  updateConsultationStatus,
  deleteConsultation,
};
