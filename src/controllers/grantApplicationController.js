const { GrantApplication, Grant, MarketplaceUser } = require("../models");
const { Op } = require("sequelize");

// Apply for grant (marketplace user)
const applyForGrant = async (req, res) => {
  try {
    const { grantId, applicationData } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    if (!grantId) {
      return res.status(400).json({
        success: false,
        message: "Grant ID is required",
      });
    }

    // Check if grant exists and is active
    const grant = await Grant.findOne({
      where: { id: grantId, isActive: true, isDeleted: false },
    });

    if (!grant) {
      return res.status(404).json({
        success: false,
        message: "Grant not found or not available",
      });
    }

    // Check if grant deadline has passed (if not rolling)
    if (!grant.isRolling && grant.deadline) {
      const deadlineDate = new Date(grant.deadline);
      if (deadlineDate < new Date()) {
        return res.status(400).json({
          success: false,
          message: "Grant application deadline has passed",
        });
      }
    }

    // Check if user already applied
    const existingApplication = await GrantApplication.findOne({
      where: {
        userId,
        grantId,
        status: { [Op.in]: ["draft", "submitted", "under_review"] },
      },
    });

    if (existingApplication) {
      return res.status(400).json({
        success: false,
        message: "You have already applied for this grant",
        data: existingApplication,
      });
    }

    const application = await GrantApplication.create({
      userId,
      grantId,
      status: "submitted",
      applicationData: applicationData || {},
      applicationDate: new Date(),
    });

    res.status(201).json({
      success: true,
      message: "Application submitted successfully",
      data: application,
    });
  } catch (error) {
    console.error("Error applying for grant:", error);
    res.status(500).json({
      success: false,
      message: "Error submitting application",
      error: error.message,
    });
  }
};

// Save draft application (marketplace user)
const saveDraftApplication = async (req, res) => {
  try {
    const { grantId, applicationData } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    if (!grantId) {
      return res.status(400).json({
        success: false,
        message: "Grant ID is required",
      });
    }

    // Check if grant exists and is active
    const grant = await Grant.findOne({
      where: { id: grantId, isActive: true, isDeleted: false },
    });

    if (!grant) {
      return res.status(404).json({
        success: false,
        message: "Grant not found or not available",
      });
    }

    // Check if draft already exists
    let application = await GrantApplication.findOne({
      where: {
        userId,
        grantId,
        status: "draft",
      },
    });

    if (application) {
      // Update existing draft
      await application.update({
        applicationData: applicationData || {},
      });
    } else {
      // Create new draft
      application = await GrantApplication.create({
        userId,
        grantId,
        status: "draft",
        applicationData: applicationData || {},
        applicationDate: new Date(),
      });
    }

    res.status(200).json({
      success: true,
      message: "Draft saved successfully",
      data: application,
    });
  } catch (error) {
    console.error("Error saving draft:", error);
    res.status(500).json({
      success: false,
      message: "Error saving draft",
      error: error.message,
    });
  }
};

// Get user's applications (marketplace user)
const getUserApplications = async (req, res) => {
  try {
    const userId = req.user?.id;
    const { status } = req.query;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const where = { userId };

    if (status) {
      where.status = status;
    }

    const applications = await GrantApplication.findAll({
      where,
      include: [
        {
          model: Grant,
          as: "grant",
          attributes: {
            exclude: ["isDeleted", "deletedAt", "updated_by", "created_by"],
          },
        },
      ],
      order: [["applicationDate", "DESC"]],
    });

    res.status(200).json({
      success: true,
      count: applications.length,
      data: applications,
    });
  } catch (error) {
    console.error("Error fetching user applications:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching applications",
      error: error.message,
    });
  }
};

// Withdraw application (marketplace user)
const withdrawApplication = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const application = await GrantApplication.findOne({
      where: { id, userId },
    });

    if (!application) {
      return res.status(404).json({
        success: false,
        message: "Application not found",
      });
    }

    if (application.status === "withdrawn") {
      return res.status(400).json({
        success: false,
        message: "Application is already withdrawn",
      });
    }

    if (application.status === "approved") {
      return res.status(400).json({
        success: false,
        message: "Cannot withdraw an approved application",
      });
    }

    await application.update({ status: "withdrawn" });

    res.status(200).json({
      success: true,
      message: "Application withdrawn successfully",
      data: application,
    });
  } catch (error) {
    console.error("Error withdrawing application:", error);
    res.status(500).json({
      success: false,
      message: "Error withdrawing application",
      error: error.message,
    });
  }
};

// Get all applications across all grants (admin)
const getAllGrantApplications = async (req, res) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;
    const where = {};

    if (status && status !== "all") {
      where.status = status;
    }

    const offset = (parseInt(page) - 1) * parseInt(limit);

    const { count, rows } = await GrantApplication.findAndCountAll({
      where,
      include: [
        {
          model: MarketplaceUser,
          as: "user",
          attributes: ["id", "fullName", "email", "phone"],
        },
        {
          model: Grant,
          as: "grant",
          attributes: ["id", "title", "deadline", "amount"],
        },
      ],
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [["applicationDate", "DESC"]],
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
    console.error("Error fetching all grant applications:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching applications",
      error: error.message,
    });
  }
};

// Get all applications for a grant (admin)
const getGrantApplications = async (req, res) => {
  try {
    const { grantId } = req.params;
    const { status, page = 1, limit = 10 } = req.query;

    const where = { grantId };

    if (status) {
      where.status = status;
    }

    const offset = (parseInt(page) - 1) * parseInt(limit);

    const { count, rows } = await GrantApplication.findAndCountAll({
      where,
      include: [
        {
          model: MarketplaceUser,
          as: "user",
          attributes: ["id", "fullName", "email", "phone"],
        },
        {
          model: Grant,
          as: "grant",
          attributes: ["id", "title", "deadline"],
        },
      ],
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [["applicationDate", "DESC"]],
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
    console.error("Error fetching grant applications:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching applications",
      error: error.message,
    });
  }
};

// Update application status (admin)
const updateApplicationStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, notes } = req.body;

    if (!status) {
      return res.status(400).json({
        success: false,
        message: "Status is required",
      });
    }

    const validStatuses = ["draft", "submitted", "under_review", "approved", "rejected", "withdrawn"];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Status must be one of: ${validStatuses.join(", ")}`,
      });
    }

    const application = await GrantApplication.findByPk(id, {
      include: [
        {
          model: Grant,
          as: "grant",
        },
      ],
    });

    if (!application) {
      return res.status(404).json({
        success: false,
        message: "Application not found",
      });
    }

    await application.update({ status, notes });

    res.status(200).json({
      success: true,
      message: "Application status updated successfully",
      data: application,
    });
  } catch (error) {
    console.error("Error updating application status:", error);
    res.status(500).json({
      success: false,
      message: "Error updating application status",
      error: error.message,
    });
  }
};

module.exports = {
  applyForGrant,
  saveDraftApplication,
  getUserApplications,
  withdrawApplication,
  getAllGrantApplications,
  getGrantApplications,
  updateApplicationStatus,
};
