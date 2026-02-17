const { TrainingRegistration, TrainingEvent, MarketplaceUser } = require("../models");
const { Op } = require("sequelize");

// Register for training event (marketplace user)
const registerForTraining = async (req, res) => {
  try {
    const { trainingEventId } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    if (!trainingEventId) {
      return res.status(400).json({
        success: false,
        message: "Training event ID is required",
      });
    }

    // Check if training event exists and is active
    const trainingEvent = await TrainingEvent.findOne({
      where: { id: trainingEventId, isActive: true, isDeleted: false },
    });

    if (!trainingEvent) {
      return res.status(404).json({
        success: false,
        message: "Training event not found or not available",
      });
    }

    // Check if user already registered
    const existingRegistration = await TrainingRegistration.findOne({
      where: {
        userId,
        trainingEventId,
      },
    });

    if (existingRegistration) {
      return res.status(400).json({
        success: false,
        message: "You are already registered for this training event",
      });
    }

    // Check capacity if set
    if (trainingEvent.capacity) {
      const registrationCount = await TrainingRegistration.count({
        where: {
          trainingEventId,
          status: { [Op.in]: ["pending", "confirmed"] },
        },
      });

      if (registrationCount >= trainingEvent.capacity) {
        return res.status(400).json({
          success: false,
          message: "Training event is full",
        });
      }
    }

    const registration = await TrainingRegistration.create({
      userId,
      trainingEventId,
      status: "pending",
      registrationDate: new Date(),
    });

    res.status(201).json({
      success: true,
      message: "Registration successful",
      data: registration,
    });
  } catch (error) {
    console.error("Error registering for training:", error);
    res.status(500).json({
      success: false,
      message: "Error registering for training",
      error: error.message,
    });
  }
};

// Get user's registrations (marketplace user)
const getUserRegistrations = async (req, res) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const registrations = await TrainingRegistration.findAll({
      where: { userId },
      include: [
        {
          model: TrainingEvent,
          as: "trainingEvent",
          attributes: {
            exclude: ["isDeleted", "deletedAt", "updated_by", "created_by"],
          },
        },
      ],
      order: [["registrationDate", "DESC"]],
    });

    res.status(200).json({
      success: true,
      count: registrations.length,
      data: registrations,
    });
  } catch (error) {
    console.error("Error fetching user registrations:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching registrations",
      error: error.message,
    });
  }
};

// Cancel registration (marketplace user)
const cancelRegistration = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const registration = await TrainingRegistration.findOne({
      where: { id, userId },
    });

    if (!registration) {
      return res.status(404).json({
        success: false,
        message: "Registration not found",
      });
    }

    if (registration.status === "cancelled") {
      return res.status(400).json({
        success: false,
        message: "Registration is already cancelled",
      });
    }

    await registration.update({ status: "cancelled" });

    res.status(200).json({
      success: true,
      message: "Registration cancelled successfully",
      data: registration,
    });
  } catch (error) {
    console.error("Error cancelling registration:", error);
    res.status(500).json({
      success: false,
      message: "Error cancelling registration",
      error: error.message,
    });
  }
};

// Get all registrations across all events (admin)
const getAllRegistrations = async (req, res) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;
    const where = {};

    if (status && status !== "all") {
      where.status = status;
    }

    const offset = (parseInt(page) - 1) * parseInt(limit);

    const { count, rows } = await TrainingRegistration.findAndCountAll({
      where,
      include: [
        {
          model: MarketplaceUser,
          as: "user",
          attributes: ["id", "fullName", "email", "phone"],
        },
        {
          model: TrainingEvent,
          as: "trainingEvent",
          attributes: ["id", "title", "date", "location"],
        },
      ],
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [["registrationDate", "DESC"]],
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
    console.error("Error fetching all registrations:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching registrations",
      error: error.message,
    });
  }
};

// Get all registrations for a training event (admin)
const getTrainingEventRegistrations = async (req, res) => {
  try {
    const { trainingEventId } = req.params;
    const { status, page = 1, limit = 10 } = req.query;

    const where = { trainingEventId };

    if (status) {
      where.status = status;
    }

    const offset = (parseInt(page) - 1) * parseInt(limit);

    const { count, rows } = await TrainingRegistration.findAndCountAll({
      where,
      include: [
        {
          model: MarketplaceUser,
          as: "user",
          attributes: ["id", "fullName", "email", "phone"],
        },
        {
          model: TrainingEvent,
          as: "trainingEvent",
          attributes: ["id", "title", "date", "location"],
        },
      ],
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [["registrationDate", "DESC"]],
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
    console.error("Error fetching training event registrations:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching registrations",
      error: error.message,
    });
  }
};

// Update registration status (admin)
const updateRegistrationStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, notes } = req.body;

    if (!status) {
      return res.status(400).json({
        success: false,
        message: "Status is required",
      });
    }

    const validStatuses = ["pending", "confirmed", "cancelled", "attended"];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Status must be one of: ${validStatuses.join(", ")}`,
      });
    }

    const registration = await TrainingRegistration.findByPk(id, {
      include: [
        {
          model: TrainingEvent,
          as: "trainingEvent",
        },
      ],
    });

    if (!registration) {
      return res.status(404).json({
        success: false,
        message: "Registration not found",
      });
    }

    await registration.update({ status, notes });

    res.status(200).json({
      success: true,
      message: "Registration status updated successfully",
      data: registration,
    });
  } catch (error) {
    console.error("Error updating registration status:", error);
    res.status(500).json({
      success: false,
      message: "Error updating registration status",
      error: error.message,
    });
  }
};

module.exports = {
  registerForTraining,
  getUserRegistrations,
  cancelRegistration,
  getAllRegistrations,
  getTrainingEventRegistrations,
  updateRegistrationStatus,
};
