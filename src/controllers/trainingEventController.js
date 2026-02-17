const { TrainingEvent, sequelize } = require("../models");
const { convertToRelativePath } = require("../utils/filePath");
const { Op } = require("sequelize");
const path = require("path");
const { deleteFile } = require("../middleware/upload");
const {
  logCreate,
  logUpdate,
  logDelete,
} = require("../utils/auditLogger");

// Create training event
const createTrainingEvent = async (req, res) => {
  try {
    const {
      title,
      description,
      date,
      startTime,
      endTime,
      endDate,
      location,
      latitude,
      longitude,
      type,
      image,
      imageAltText,
      registrationUrl,
      capacity,
      price,
      currency,
      organizer,
      contactEmail,
      contactPhone,
      tags,
      featured,
    } = req.body;

    // Validate required fields
    if (!title || !description || !location || !type) {
      return res.status(400).json({
        success: false,
        message: "Please provide title, description, location, and type",
      });
    }

    // Handle image upload
    let imagePath = null;
    if (req.file && req.file.path) {
      imagePath = convertToRelativePath(req.file.path);
    } else if (image) {
      imagePath = image;
    }

    // Parse JSON arrays
    const parseJsonArray = (value) => {
      if (!value) return [];
      if (Array.isArray(value)) return value;
      if (typeof value === "string") {
        try {
          return JSON.parse(value);
        } catch (e) {
          return value.split(",").map((item) => item.trim()).filter(Boolean);
        }
      }
      return [];
    };

    const tagsArray = parseJsonArray(tags);

    // Validate and parse coordinates
    let parsedLatitude = null;
    let parsedLongitude = null;
    if (latitude !== undefined && latitude !== null && latitude !== "") {
      parsedLatitude = parseFloat(latitude);
      if (isNaN(parsedLatitude) || parsedLatitude < -90 || parsedLatitude > 90) {
        return res.status(400).json({
          success: false,
          message: "Latitude must be a valid number between -90 and 90",
        });
      }
    }
    if (longitude !== undefined && longitude !== null && longitude !== "") {
      parsedLongitude = parseFloat(longitude);
      if (isNaN(parsedLongitude) || parsedLongitude < -180 || parsedLongitude > 180) {
        return res.status(400).json({
          success: false,
          message: "Longitude must be a valid number between -180 and 180",
        });
      }
    }

    const trainingEvent = await TrainingEvent.create({
      title,
      description,
      date,
      startTime,
      endTime,
      endDate,
      location,
      latitude: parsedLatitude,
      longitude: parsedLongitude,
      type,
      image: imagePath,
      imageAltText,
      registrationUrl,
      capacity: capacity ? parseInt(capacity) : null,
      price: price ? parseFloat(price) : null,
      currency: currency || "USD",
      organizer,
      contactEmail,
      contactPhone,
      tags: tagsArray,
      featured: featured !== undefined ? (featured === true || featured === "true") : false,
      isActive: true,
      created_by: req.user?.id || null,
      updated_by: req.user?.id || null,
    });

    if (req.user) {
      await logCreate(
        req.user.id,
        "training_event",
        trainingEvent.id,
        { title, type, location },
        req
      );
    }

    res.status(201).json({
      success: true,
      message: "Training event created successfully",
      data: trainingEvent,
    });
  } catch (error) {
    console.error("Error creating training event:", error);
    res.status(500).json({
      success: false,
      message: "Error creating training event",
      error: error.message,
    });
  }
};

// Get all training events (admin) with filters
const getAllTrainingEvents = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      search,
      type,
      location,
      featured,
      isActive,
      sortBy = "date",
      sortOrder = "DESC",
    } = req.query;

    const where = {};

    if (search) {
      where[Op.or] = [
        { title: { [Op.like]: `%${search}%` } },
        { description: { [Op.like]: `%${search}%` } },
        { location: { [Op.like]: `%${search}%` } },
      ];
    }

    if (type) {
      where.type = type;
    }

    if (location) {
      where.location = { [Op.like]: `%${location}%` };
    }

    if (featured !== undefined) {
      where.featured = featured === "true";
    }

    if (isActive !== undefined) {
      where.isActive = isActive === "true";
    }

    const offset = (parseInt(page) - 1) * parseInt(limit);

    const { count, rows } = await TrainingEvent.findAndCountAll({
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
    console.error("Error fetching training events:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching training events",
      error: error.message,
    });
  }
};

// Get training event by ID (admin)
const getTrainingEventById = async (req, res) => {
  try {
    const { id } = req.params;
    const trainingEvent = await TrainingEvent.findByPk(id);

    if (!trainingEvent) {
      return res.status(404).json({
        success: false,
        message: "Training event not found",
      });
    }

    res.status(200).json({
      success: true,
      data: trainingEvent,
    });
  } catch (error) {
    console.error("Error fetching training event:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching training event",
      error: error.message,
    });
  }
};

// Get public training events (active only)
const getPublicTrainingEvents = async (req, res) => {
  try {
    const { type, location, featured, limit } = req.query;
    const where = { isActive: true };

    if (type) {
      where.type = type;
    }

    if (location) {
      where.location = { [Op.like]: `%${location}%` };
    }

    if (featured !== undefined) {
      where.featured = featured === "true";
    }

    const trainingEvents = await TrainingEvent.findAll({
      where,
      limit: limit ? parseInt(limit) : undefined,
      order: [
        ["featured", "DESC"],
        ["date", "ASC"],
        ["createdAt", "DESC"],
      ],
      attributes: {
        exclude: ["isDeleted", "deletedAt", "updated_by", "created_by"],
      },
    });

    res.status(200).json({
      success: true,
      count: trainingEvents.length,
      data: trainingEvents,
    });
  } catch (error) {
    console.error("Error fetching public training events:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching training events",
      error: error.message,
    });
  }
};

// Update training event
const updateTrainingEvent = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const trainingEvent = await TrainingEvent.findByPk(id);

    if (!trainingEvent) {
      return res.status(404).json({
        success: false,
        message: "Training event not found",
      });
    }

    const oldValues = trainingEvent.toJSON();
    const oldImage = trainingEvent.image;

    // Handle image upload
    if (req.file && req.file.path) {
      updates.image = convertToRelativePath(req.file.path);
      // Delete old image if it exists
      if (oldImage) {
        const oldImagePath = path.join(__dirname, "..", "..", oldImage);
        await deleteFile(oldImagePath);
      }
    } else if (updates.delete_image === "true" || updates.delete_image === true) {
      if (oldImage) {
        const oldImagePath = path.join(__dirname, "..", "..", oldImage);
        await deleteFile(oldImagePath);
        updates.image = null;
      }
    }

    // Parse JSON arrays
    const parseJsonArray = (value) => {
      if (value === undefined) return undefined;
      if (!value) return [];
      if (Array.isArray(value)) return value;
      if (typeof value === "string") {
        try {
          return JSON.parse(value);
        } catch (e) {
          return value.split(",").map((item) => item.trim()).filter(Boolean);
        }
      }
      return [];
    };

    if (updates.tags !== undefined) {
      updates.tags = parseJsonArray(updates.tags);
    }

    // Convert boolean strings to booleans
    if (updates.featured !== undefined) {
      updates.featured = updates.featured === true || updates.featured === "true";
    }

    if (updates.isActive !== undefined) {
      updates.isActive = updates.isActive === true || updates.isActive === "true";
    }

    // Convert numeric strings to numbers
    if (updates.capacity !== undefined) {
      updates.capacity = updates.capacity === null || updates.capacity === "" ? null : parseInt(updates.capacity);
    }

    if (updates.price !== undefined) {
      updates.price = updates.price === null || updates.price === "" ? null : parseFloat(updates.price);
    }

    // Validate and parse coordinates
    if (updates.latitude !== undefined) {
      if (updates.latitude === null || updates.latitude === "") {
        updates.latitude = null;
      } else {
        const parsedLat = parseFloat(updates.latitude);
        if (isNaN(parsedLat) || parsedLat < -90 || parsedLat > 90) {
          return res.status(400).json({
            success: false,
            message: "Latitude must be a valid number between -90 and 90",
          });
        }
        updates.latitude = parsedLat;
      }
    }

    if (updates.longitude !== undefined) {
      if (updates.longitude === null || updates.longitude === "") {
        updates.longitude = null;
      } else {
        const parsedLng = parseFloat(updates.longitude);
        if (isNaN(parsedLng) || parsedLng < -180 || parsedLng > 180) {
          return res.status(400).json({
            success: false,
            message: "Longitude must be a valid number between -180 and 180",
          });
        }
        updates.longitude = parsedLng;
      }
    }

    updates.updated_by = req.user?.id || null;

    await trainingEvent.update(updates);

    if (req.user) {
      await logUpdate(
        req.user.id,
        "training_event",
        trainingEvent.id,
        oldValues,
        updates,
        req,
        `Updated training event ${trainingEvent.title}`
      );
    }

    // Reload to get updated data
    await trainingEvent.reload();

    res.status(200).json({
      success: true,
      message: "Training event updated successfully",
      data: trainingEvent,
    });
  } catch (error) {
    console.error("Error updating training event:", error);
    res.status(500).json({
      success: false,
      message: "Error updating training event",
      error: error.message,
    });
  }
};

// Delete training event (hard delete – row removed from database)
const deleteTrainingEvent = async (req, res) => {
  try {
    const { id } = req.params;
    const trainingEvent = await TrainingEvent.findByPk(id);

    if (!trainingEvent) {
      return res.status(404).json({
        success: false,
        message: "Training event not found",
      });
    }

    const oldValues = trainingEvent.toJSON();

    await trainingEvent.destroy();

    if (req.user) {
      await logDelete(
        req.user.id,
        "training_event",
        trainingEvent.id,
        oldValues,
        req,
        `Deleted training event ${trainingEvent.title}`
      );
    }

    res.status(200).json({
      success: true,
      message: "Training event deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting training event:", error);
    res.status(500).json({
      success: false,
      message: "Error deleting training event",
      error: error.message,
    });
  }
};

module.exports = {
  createTrainingEvent,
  getAllTrainingEvents,
  getTrainingEventById,
  getPublicTrainingEvents,
  updateTrainingEvent,
  deleteTrainingEvent,
};
