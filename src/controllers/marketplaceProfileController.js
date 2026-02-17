const { MarketplaceUser, MarketplaceUserProfile, FeedFormulationRequest } = require("../models");
const { convertToRelativePath } = require("../utils/filePath");
const bcrypt = require("bcryptjs");

// Get current user + profile (protected)
const getMe = async (req, res) => {
  try {
    const user = await MarketplaceUser.findByPk(req.userId, {
      attributes: { exclude: ["password"] },
      include: [{ model: MarketplaceUserProfile, as: "profile", required: false }],
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const data = user.toJSON();
    data.profile = user.profile || null;

    res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    console.error("Marketplace getMe error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch profile",
      error: error.message,
    });
  }
};

// Complete profile (role + common + role-specific)
const completeProfile = async (req, res) => {
  try {
    const {
      role,
      fullName,
      email,
      phone,
      currentPassword,
      newPassword,
      country,
      region,
      district,
      latitude,
      longitude,
      preferredLanguage,
      profilePhotoUrl,
      primaryActivity,
      produces,
      scaleOfOperation,
      farmOrBusinessName,
      bio,
      availability,
      roleSpecificData,
    } = req.body;

    if (!role) {
      return res.status(400).json({
        success: false,
        message: "Role is required",
      });
    }

    const validRoles = ["farmer", "buyer", "input_supplier", "veterinarian", "consultant"];
    if (!validRoles.includes(role)) {
      return res.status(400).json({
        success: false,
        message: "Invalid role",
      });
    }

    if (!profilePhotoUrl || typeof profilePhotoUrl !== "string" || !profilePhotoUrl.trim()) {
      return res.status(400).json({
        success: false,
        message: "Profile picture is required for identity verification",
      });
    }

    const user = await MarketplaceUser.findByPk(req.userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    if (newPassword) {
      if (!currentPassword) {
        return res.status(400).json({
          success: false,
          message: "Current password is required to set a new password",
        });
      }
      const match = await bcrypt.compare(currentPassword, user.password);
      if (!match) {
        return res.status(400).json({
          success: false,
          message: "Current password is incorrect",
        });
      }
      if (newPassword.length < 6) {
        return res.status(400).json({
          success: false,
          message: "New password must be at least 6 characters",
        });
      }
      user.password = await bcrypt.hash(newPassword, 10);
    }

    if (email !== undefined && email !== null && String(email).trim() !== "") {
      const newEmail = String(email).trim().toLowerCase();
      if (newEmail !== user.email) {
        const existing = await MarketplaceUser.findOne({ where: { email: newEmail } });
        if (existing && existing.id !== user.id) {
          return res.status(400).json({
            success: false,
            message: "An account with this email already exists",
          });
        }
        user.email = newEmail;
      }
    }

    if (fullName !== undefined && fullName !== null && String(fullName).trim() !== "") {
      user.fullName = String(fullName).trim();
    }

    const now = new Date();

    const [profile] = await MarketplaceUserProfile.findOrCreate({
      where: { userId: user.id },
      defaults: { userId: user.id },
    });

    // Parse latitude and longitude if provided
    let latitudeValue = null;
    let longitudeValue = null;
    if (latitude !== undefined && latitude !== null && latitude !== "") {
      const lat = parseFloat(latitude);
      if (!isNaN(lat) && lat >= -90 && lat <= 90) {
        latitudeValue = lat;
      }
    }
    if (longitude !== undefined && longitude !== null && longitude !== "") {
      const lng = parseFloat(longitude);
      if (!isNaN(lng) && lng >= -180 && lng <= 180) {
        longitudeValue = lng;
      }
    }

    await profile.update({
      country: country?.trim() || null,
      region: region?.trim() || null,
      district: district?.trim() || null,
      latitude: latitudeValue,
      longitude: longitudeValue,
      preferredLanguage: preferredLanguage?.trim() || null,
      profilePhotoUrl: profilePhotoUrl?.trim() || null,
      primaryActivity: primaryActivity || null,
      produces: produces && Array.isArray(produces) ? produces : null,
      scaleOfOperation: scaleOfOperation || null,
      farmOrBusinessName: farmOrBusinessName?.trim() || null,
      bio: bio?.trim() || null,
      availability: role === "farmer" && availability ? availability : null,
      roleSpecificData: roleSpecificData && typeof roleSpecificData === "object" ? roleSpecificData : null,
    });

    // Normalize phone: trim and remove leading zero after country code (e.g. "+254 0798757460" -> "+254 798757460")
    const normalizedPhone =
      phone !== undefined && phone != null && String(phone).trim() !== ""
        ? (() => {
            const s = String(phone).trim();
            const spaceIdx = s.indexOf(" ");
            if (spaceIdx === -1) return s.replace(/^0+/, "") || s;
            const code = s.slice(0, spaceIdx);
            const rest = s.slice(spaceIdx + 1).replace(/^0+/, "");
            return rest ? `${code} ${rest}` : code;
          })()
        : null;

    const userUpdate = {
      role,
      profileCompleted: true,
      profileCompletedAt: now,
      status: "active",
      ...(phone !== undefined && { phone: normalizedPhone }),
      ...(fullName !== undefined && fullName !== null && String(fullName).trim() !== "" && { fullName: String(fullName).trim() }),
      ...(email !== undefined && email !== null && String(email).trim() !== "" && { email: String(email).trim().toLowerCase() }),
    };
    if (newPassword) userUpdate.password = user.password;
    await user.update(userUpdate);

    const updatedUser = await MarketplaceUser.findByPk(user.id, {
      attributes: { exclude: ["password"] },
      include: [{ model: MarketplaceUserProfile, as: "profile", required: false }],
    });

    res.status(200).json({
      success: true,
      message: "Profile completed successfully",
      data: updatedUser.toJSON(),
    });
  } catch (error) {
    console.error("Marketplace completeProfile error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to complete profile",
      error: error.message,
    });
  }
};

// Upload profile photo (returns URL path for use in completeProfile)
const uploadProfilePhoto = async (req, res) => {
  try {
    if (!req.file || !req.file.path) {
      return res.status(400).json({
        success: false,
        message: "No profile photo file uploaded",
      });
    }
    const relativePath = convertToRelativePath(req.file.path);
    const profilePhotoUrl = relativePath ? `/${relativePath}` : null;
    res.status(200).json({
      success: true,
      message: "Profile photo uploaded",
      profilePhotoUrl,
    });
  } catch (error) {
    console.error("Marketplace uploadProfilePhoto error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to upload profile photo",
      error: error.message,
    });
  }
};

// Get public list of farmers for Farmers Hub (no auth)
const getPublicFarmers = async (req, res) => {
  try {
    const users = await MarketplaceUser.findAll({
      where: {
        role: "farmer",
        status: "active",
        profileCompleted: true,
      },
      attributes: ["id", "fullName", "email", "phone", "isVerified", "createdAt"],
      include: [{ model: MarketplaceUserProfile, as: "profile", required: false }],
      order: [["createdAt", "DESC"]],
    });

    const data = users.map((u) => {
      const json = u.toJSON();
      json.profile = u.profile || null;
      return json;
    });

    res.status(200).json({
      success: true,
      data,
      total: data.length,
    });
  } catch (error) {
    console.error("Marketplace getPublicFarmers error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch farmers",
      error: error.message,
    });
  }
};

// Get public list of veterinarians for Veterinary Services (no auth)
// Shows all users with role veterinarian (profile complete or not, so admin-created vets appear)
const getPublicVeterinarians = async (req, res) => {
  try {
    const users = await MarketplaceUser.findAll({
      where: {
        role: "veterinarian",
      },
      attributes: ["id", "fullName", "email", "phone", "isVerified", "createdAt"],
      include: [{ model: MarketplaceUserProfile, as: "profile", required: false }],
      order: [["createdAt", "DESC"]],
    });

    const data = users.map((u) => {
      const json = u.toJSON();
      json.profile = u.profile || null;
      return json;
    });

    res.status(200).json({
      success: true,
      data,
      total: data.length,
    });
  } catch (error) {
    console.error("Marketplace getPublicVeterinarians error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch veterinarians",
      error: error.message,
    });
  }
};

// Get public list of input suppliers for Inputs & Feeds (no auth)
const getPublicInputSuppliers = async (req, res) => {
  try {
    const users = await MarketplaceUser.findAll({
      where: {
        role: "input_supplier",
      },
      attributes: ["id", "fullName", "email", "phone", "isVerified", "createdAt"],
      include: [{ model: MarketplaceUserProfile, as: "profile", required: false }],
      order: [["createdAt", "DESC"]],
    });

    const data = users.map((u) => {
      const json = u.toJSON();
      json.profile = u.profile || null;
      return json;
    });

    res.status(200).json({
      success: true,
      data,
      total: data.length,
    });
  } catch (error) {
    console.error("Marketplace getPublicInputSuppliers error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch input suppliers",
      error: error.message,
    });
  }
};

// Submit custom feed formulation request (public; optional marketplace user if authenticated)
const submitFeedFormulationRequest = async (req, res) => {
  try {
    const { animalType, productionStage, budget, preferredIngredients } = req.body;
    const marketplaceUserId = req.userId || null; // set if authenticated

    if (!animalType || typeof animalType !== "string" || !animalType.trim()) {
      return res.status(400).json({
        success: false,
        message: "Animal type is required",
      });
    }
    if (!productionStage || typeof productionStage !== "string" || !productionStage.trim()) {
      return res.status(400).json({
        success: false,
        message: "Production stage is required",
      });
    }

    const record = await FeedFormulationRequest.create({
      marketplaceUserId: marketplaceUserId || null,
      animalType: String(animalType).trim().slice(0, 64),
      productionStage: String(productionStage).trim().slice(0, 64),
      budget: budget != null && String(budget).trim() !== "" ? String(budget).trim().slice(0, 32) : null,
      preferredIngredients: preferredIngredients != null && String(preferredIngredients).trim() !== "" ? String(preferredIngredients).trim() : null,
      status: "new",
    });

    res.status(201).json({
      success: true,
      message: "Feed formulation request submitted successfully",
      data: record.toJSON(),
    });
  } catch (error) {
    console.error("Marketplace submitFeedFormulationRequest error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to submit feed formulation request",
      error: error.message,
    });
  }
};

// Get all feed formulation requests (admin only)
const getFeedFormulationRequests = async (req, res) => {
  try {
    const requests = await FeedFormulationRequest.findAll({
      include: [{ model: MarketplaceUser, as: "user", required: false, attributes: ["id", "fullName", "email"] }],
      order: [["createdAt", "DESC"]],
    });
    const data = requests.map((r) => {
      const json = r.toJSON();
      json.user = r.user || null;
      return json;
    });
    res.status(200).json({
      success: true,
      data,
      total: data.length,
    });
  } catch (error) {
    console.error("Marketplace getFeedFormulationRequests error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch feed formulation requests",
      error: error.message,
    });
  }
};

// Update feed formulation request (admin only): status, adminNotes
const updateFeedFormulationRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, adminNotes } = req.body;
    const request = await FeedFormulationRequest.findByPk(id);
    if (!request) {
      return res.status(404).json({
        success: false,
        message: "Feed formulation request not found",
      });
    }
    const updates = {};
    const validStatuses = ["new", "in_review", "responded", "closed"];
    if (status !== undefined && validStatuses.includes(String(status))) updates.status = status;
    if (adminNotes !== undefined) updates.adminNotes = adminNotes == null ? null : String(adminNotes).trim();
    if (Object.keys(updates).length > 0) await request.update(updates);
    const updated = await FeedFormulationRequest.findByPk(id, {
      include: [{ model: MarketplaceUser, as: "user", required: false, attributes: ["id", "fullName", "email"] }],
    });
    const data = updated.toJSON();
    data.user = updated.user || null;
    res.status(200).json({
      success: true,
      message: "Feed formulation request updated",
      data,
    });
  } catch (error) {
    console.error("Marketplace updateFeedFormulationRequest error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update feed formulation request",
      error: error.message,
    });
  }
};

// Get all marketplace users (admin only)
const getAllMarketplaceUsers = async (req, res) => {
  try {
    const users = await MarketplaceUser.findAll({
      attributes: { exclude: ["password"] },
      include: [{ model: MarketplaceUserProfile, as: "profile", required: false }],
      order: [["createdAt", "DESC"]],
    });

    const data = users.map((u) => {
      const json = u.toJSON();
      json.profile = u.profile || null;
      return json;
    });

    res.status(200).json({
      success: true,
      data,
      total: data.length,
    });
  } catch (error) {
    console.error("Marketplace getAllMarketplaceUsers error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch marketplace users",
      error: error.message,
    });
  }
};

// Update marketplace user (admin only). Used for verification status etc.
const updateMarketplaceUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { isVerified } = req.body;
    const user = await MarketplaceUser.findByPk(id, {
      include: [{ model: MarketplaceUserProfile, as: "profile", required: false }],
    });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Marketplace user not found",
      });
    }
    const updates = {};
    if (typeof isVerified === "boolean") updates.isVerified = isVerified;
    if (Object.keys(updates).length === 0) {
      return res.status(400).json({
        success: false,
        message: "No valid fields to update (e.g. isVerified)",
      });
    }
    await user.update(updates);
    const updated = await MarketplaceUser.findByPk(user.id, {
      attributes: { exclude: ["password"] },
      include: [{ model: MarketplaceUserProfile, as: "profile", required: false }],
    });
    const data = updated.toJSON();
    data.profile = updated.profile || null;
    res.status(200).json({
      success: true,
      message: "Marketplace user updated",
      data,
    });
  } catch (error) {
    console.error("Marketplace updateMarketplaceUser error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update marketplace user",
      error: error.message,
    });
  }
};

// Delete marketplace user (admin only). Profile is deleted via CASCADE.
const deleteMarketplaceUser = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await MarketplaceUser.findByPk(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Marketplace user not found",
      });
    }
    await user.destroy();
    res.status(200).json({
      success: true,
      message: "Marketplace user deleted",
    });
  } catch (error) {
    console.error("Marketplace deleteMarketplaceUser error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete marketplace user",
      error: error.message,
    });
  }
};

module.exports = {
  getMe,
  completeProfile,
  uploadProfilePhoto,
  getPublicFarmers,
  getPublicVeterinarians,
  getPublicInputSuppliers,
  submitFeedFormulationRequest,
  getFeedFormulationRequests,
  updateFeedFormulationRequest,
  getAllMarketplaceUsers,
  updateMarketplaceUser,
  deleteMarketplaceUser,
};
