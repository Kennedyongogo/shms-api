const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const path = require("path");
const { Op } = require("sequelize");
const config = require("../config/config");
const { Admin, Hospital, AuditLog } = require("../models");
const { deleteFile, toRelativeUploadPath } = require("../middleware/upload");

const sanitizeAdmin = (admin) => {
  if (!admin) return admin;
  const json = admin.toJSON ? admin.toJSON() : admin;
  const { password, ...rest } = json;
  return rest;
};

const register = async (req, res) => {
  try {
    const { full_name, email, password, confirm_password } = req.body;
    if (!full_name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "full_name, email and password are required",
      });
    }
    if (confirm_password != null && password !== confirm_password) {
      return res
        .status(400)
        .json({ success: false, message: "Passwords do not match" });
    }

    const normalizedEmail = String(email).toLowerCase().trim();
    const exists = await Admin.findOne({ where: { email: normalizedEmail } });
    if (exists) {
      return res
        .status(400)
        .json({ success: false, message: "Email already in use" });
    }

    const hashed = await bcrypt.hash(password, 10);
    const admin = await Admin.create({
      full_name: String(full_name).trim(),
      email: normalizedEmail,
      password: hashed,
      status: "active",
      last_login: null,
    });

    const token = jwt.sign({ id: admin.id, type: "admin" }, config.jwtSecret, {
      expiresIn: "7d",
    });

    return res.status(201).json({
      success: true,
      data: {
        admin: sanitizeAdmin(admin),
        token,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Error registering admin",
      error: error.message,
    });
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res
        .status(400)
        .json({ success: false, message: "email and password are required" });
    }

    const normalizedEmail = String(email).toLowerCase().trim();
    const admin = await Admin.findOne({ where: { email: normalizedEmail } });
    if (!admin) {
      return res
        .status(401)
        .json({ success: false, message: "Invalid credentials" });
    }

    const ok = await bcrypt.compare(password, admin.password);
    if (!ok) {
      return res
        .status(401)
        .json({ success: false, message: "Invalid credentials" });
    }
    if (admin.status !== "active") {
      return res
        .status(403)
        .json({ success: false, message: "Admin account is not active" });
    }

    await admin.update({ last_login: new Date() });
    const token = jwt.sign({ id: admin.id, type: "admin" }, config.jwtSecret, {
      expiresIn: "7d",
    });

    return res.status(200).json({
      success: true,
      data: {
        admin: sanitizeAdmin(admin),
        token,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Error logging in admin",
      error: error.message,
    });
  }
};

const create = async (req, res) => {
  try {
    const { full_name, email, password, confirm_password, status } = req.body;
    if (!full_name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "full_name, email and password are required",
      });
    }
    if (confirm_password != null && password !== confirm_password) {
      return res
        .status(400)
        .json({ success: false, message: "Passwords do not match" });
    }

    const normalizedEmail = String(email).toLowerCase().trim();
    const exists = await Admin.findOne({ where: { email: normalizedEmail } });
    if (exists) {
      return res
        .status(400)
        .json({ success: false, message: "Email already in use" });
    }

    const hashed = await bcrypt.hash(password, 10);
    const createData = {
      full_name: String(full_name).trim(),
      email: normalizedEmail,
      password: hashed,
      status: status || "active",
      last_login: null,
    };
    if (req.file?.path) {
      createData.profile_image_path = toRelativeUploadPath(req.file.path);
    }
    const admin = await Admin.create(createData);
    return res.status(201).json({ success: true, data: sanitizeAdmin(admin) });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Error creating admin",
      error: error.message,
    });
  }
};

const getAll = async (req, res) => {
  try {
    const admins = await Admin.findAll({
      order: [["createdAt", "DESC"]],
    });
    return res.status(200).json({
      success: true,
      data: admins.map(sanitizeAdmin),
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Error fetching admins",
      error: error.message,
    });
  }
};

const getById = async (req, res) => {
  try {
    const admin = await Admin.findByPk(req.params.id);
    if (!admin) {
      return res.status(404).json({ success: false, message: "Admin not found" });
    }
    return res.status(200).json({ success: true, data: sanitizeAdmin(admin) });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Error fetching admin",
      error: error.message,
    });
  }
};

const update = async (req, res) => {
  try {
    const admin = await Admin.findByPk(req.params.id);
    if (!admin) {
      return res.status(404).json({ success: false, message: "Admin not found" });
    }

    const updates = { ...req.body };
    if (Object.prototype.hasOwnProperty.call(updates, "confirm_password")) {
      if (!updates.password) {
        return res.status(400).json({
          success: false,
          message: "password is required when confirm_password is provided",
        });
      }
      if (updates.password !== updates.confirm_password) {
        return res.status(400).json({ success: false, message: "Passwords do not match" });
      }
      delete updates.confirm_password;
    }
    if (updates.email) {
      updates.email = String(updates.email).toLowerCase().trim();
      const duplicate = await Admin.findOne({
        where: { email: updates.email },
      });
      if (duplicate && duplicate.id !== admin.id) {
        return res.status(400).json({ success: false, message: "Email already in use" });
      }
    }
    if (updates.password) {
      updates.password = await bcrypt.hash(updates.password, 10);
    }
    if (updates.full_name) {
      updates.full_name = String(updates.full_name).trim();
    }
    if (req.file?.path) {
      updates.profile_image_path = toRelativeUploadPath(req.file.path);
      if (admin.profile_image_path) {
        const absOld = path.join(__dirname, "..", "..", admin.profile_image_path);
        await deleteFile(absOld);
      }
    }

    const updated = await admin.update(updates);
    return res.status(200).json({ success: true, data: sanitizeAdmin(updated) });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Error updating admin",
      error: error.message,
    });
  }
};

const updateProfileImage = async (req, res) => {
  try {
    const admin = await Admin.findByPk(req.params.id);
    if (!admin) {
      return res.status(404).json({ success: false, message: "Admin not found" });
    }
    if (!req.file?.path) {
      return res.status(400).json({
        success: false,
        message: 'Missing file field "admin_profile_image"',
      });
    }

    if (admin.profile_image_path) {
      const absOld = path.join(__dirname, "..", "..", admin.profile_image_path);
      await deleteFile(absOld);
    }

    const relative = toRelativeUploadPath(req.file.path);
    const updated = await admin.update({ profile_image_path: relative });
    return res.status(200).json({ success: true, data: sanitizeAdmin(updated) });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Error updating admin profile image",
      error: error.message,
    });
  }
};

const remove = async (req, res) => {
  try {
    const admin = await Admin.findByPk(req.params.id);
    if (!admin) {
      return res.status(404).json({ success: false, message: "Admin not found" });
    }
    if (admin.profile_image_path) {
      const absOld = path.join(__dirname, "..", "..", admin.profile_image_path);
      await deleteFile(absOld);
    }
    await admin.destroy();
    return res.status(200).json({ success: true, message: "Admin deleted" });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Error deleting admin",
      error: error.message,
    });
  }
};

const me = async (req, res) => {
  try {
    const admin = await Admin.findByPk(req.adminId);
    if (!admin) {
      return res.status(404).json({ success: false, message: "Admin not found" });
    }
    return res.status(200).json({ success: true, data: { admin: sanitizeAdmin(admin) } });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Error fetching admin profile",
      error: error.message,
    });
  }
};

const updateMe = async (req, res) => {
  try {
    const admin = await Admin.findByPk(req.adminId);
    if (!admin) {
      return res.status(404).json({ success: false, message: "Admin not found" });
    }
    const updates = {};
    if (req.body?.full_name != null) {
      updates.full_name = String(req.body.full_name).trim();
    }
    const updated = await admin.update(updates);
    return res.status(200).json({
      success: true,
      message: "Profile updated successfully",
      data: { admin: sanitizeAdmin(updated) },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Error updating admin profile",
      error: error.message,
    });
  }
};

const updateMyProfileImage = async (req, res) => {
  try {
    const admin = await Admin.findByPk(req.adminId);
    if (!admin) {
      return res.status(404).json({ success: false, message: "Admin not found" });
    }
    if (!req.file?.path) {
      return res.status(400).json({
        success: false,
        message: 'Missing file field "admin_profile_image"',
      });
    }

    if (admin.profile_image_path) {
      const absOld = path.join(__dirname, "..", "..", admin.profile_image_path);
      await deleteFile(absOld);
    }

    const relative = toRelativeUploadPath(req.file.path);
    const updated = await admin.update({ profile_image_path: relative });
    return res.status(200).json({
      success: true,
      message: "Profile picture updated",
      data: { admin: sanitizeAdmin(updated) },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Error updating admin profile image",
      error: error.message,
    });
  }
};

const changePassword = async (req, res) => {
  try {
    const admin = await Admin.findByPk(req.adminId);
    if (!admin) {
      return res.status(404).json({ success: false, message: "Admin not found" });
    }
    const { currentPassword, newPassword } = req.body || {};
    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: "currentPassword and newPassword are required",
      });
    }

    const ok = await bcrypt.compare(currentPassword, admin.password);
    if (!ok) {
      return res.status(400).json({ success: false, message: "Current password is incorrect" });
    }

    const hashed = await bcrypt.hash(newPassword, 10);
    await admin.update({ password: hashed });
    return res.status(200).json({ success: true, message: "Password updated successfully" });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Error updating admin password",
      error: error.message,
    });
  }
};

const getOverview = async (req, res) => {
  try {
    const now = new Date();
    const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekStart = new Date(now);
    const day = weekStart.getDay();
    weekStart.setDate(now.getDate() - (day === 0 ? 6 : day - 1));
    weekStart.setHours(0, 0, 0, 0);
    const prevWeekStart = new Date(weekStart);
    prevWeekStart.setDate(weekStart.getDate() - 7);
    const monthStart = new Date(now);
    monthStart.setDate(now.getDate() - 30);
    monthStart.setHours(0, 0, 0, 0);

    const hospitals = await Hospital.findAll({
      attributes: [
        "id",
        "name",
        "phone",
        "logo_path",
        "subscription_package",
        "subscription_ends_at",
        "createdAt",
      ],
      order: [["createdAt", "DESC"]],
      limit: 50,
    });

    const rows = await Promise.all(
      hospitals.map(async (hospital) => {
        const hospitalId = hospital.id;
        const [
          actionsToday,
          actionsWeek,
          actionsPrevWeek,
          actionsMonth,
          activeStaffMonth,
          modulesTouchedMonth,
        ] = await Promise.all([
          AuditLog.count({
            where: {
              hospital_id: hospitalId,
              timestamp: { [Op.gte]: dayStart },
            },
          }),
          AuditLog.count({
            where: {
              hospital_id: hospitalId,
              timestamp: { [Op.gte]: weekStart },
            },
          }),
          AuditLog.count({
            where: {
              hospital_id: hospitalId,
              timestamp: {
                [Op.gte]: prevWeekStart,
                [Op.lt]: weekStart,
              },
            },
          }),
          AuditLog.count({
            where: {
              hospital_id: hospitalId,
              timestamp: { [Op.gte]: monthStart },
            },
          }),
          AuditLog.count({
            distinct: true,
            col: "user_id",
            where: {
              hospital_id: hospitalId,
              timestamp: { [Op.gte]: monthStart },
            },
          }),
          AuditLog.count({
            distinct: true,
            col: "table_name",
            where: {
              hospital_id: hospitalId,
              timestamp: { [Op.gte]: monthStart },
            },
          }),
        ]);

        const weekTrendPct =
          actionsPrevWeek > 0
            ? Math.round(((actionsWeek - actionsPrevWeek) / actionsPrevWeek) * 100)
            : actionsWeek > 0
            ? 100
            : 0;

        const trendDirection =
          actionsWeek > actionsPrevWeek
            ? "up"
            : actionsWeek < actionsPrevWeek
            ? "down"
            : "flat";

        // Audit-trail based engagement score (0-100)
        const activityScore = Math.min(50, actionsMonth * 0.7);
        const staffSpreadScore = Math.min(30, activeStaffMonth * 3);
        const breadthScore = Math.min(20, modulesTouchedMonth * 2);
        const engagement = Math.max(0, Math.min(100, Math.round(activityScore + staffSpreadScore + breadthScore)));

        let status = "Dormant";
        if (engagement >= 80) status = "Highly Engaged";
        else if (engagement >= 60) status = "Engaged";
        else if (engagement >= 35) status = "Monitoring";
        else if (engagement > 0) status = "Low Activity";

        return {
          id: hospitalId,
          name: hospital.name || "Unnamed Hospital",
          phone: hospital.phone || "No phone",
          logo_path: hospital.logo_path || null,
          subscription_package: hospital.subscription_package,
          subscription_ends_at: hospital.subscription_ends_at,
          engagement,
          status,
          trend_direction: trendDirection,
          trend_pct_week: weekTrendPct,
          metrics: {
            actions_today: actionsToday,
            actions_this_week: actionsWeek,
            actions_prev_week: actionsPrevWeek,
            actions_last_30_days: actionsMonth,
            active_staff_last_30_days: activeStaffMonth,
            modules_touched_last_30_days: modulesTouchedMonth,
          },
        };
      })
    );

    return res.status(200).json({
      success: true,
      data: rows,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Error fetching admin overview",
      error: error.message,
    });
  }
};

module.exports = {
  register,
  login,
  me,
  updateMe,
  changePassword,
  updateMyProfileImage,
  getOverview,
  create,
  getAll,
  getById,
  update,
  updateProfileImage,
  remove,
};

