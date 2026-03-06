const { Hospital, User, Role } = require("../models");
const { getSubscriptionStatus, getNextSubscriptionEndsAt, DEFAULT_SUBSCRIPTION_DAYS } = require("../utils/subscriptionStatus");
const { auditLog } = require("../utils/auditLog");

const SUPER_ADMIN_ROLE_NAME = "Super Admin";

/**
 * Extend the subscription period for a hospital (e.g. after payment for 30 days).
 * Only Super Admin of that hospital can extend (or when you add provider auth, allow that too).
 * POST /api/subscription/extend
 * Body: { hospital_id?: string, days?: number } — default: current user's hospital, 30 days
 */
const extendSubscription = async (req, res) => {
  try {
    const userId = req.userId;
    if (!userId) return res.status(401).json({ success: false, message: "Authentication required" });

    const { hospital_id: bodyHospitalId, days: bodyDays } = req.body || {};
    const days = bodyDays != null && Number(bodyDays) > 0 ? Number(bodyDays) : DEFAULT_SUBSCRIPTION_DAYS;

    const user = await User.findByPk(userId, { include: [{ model: Role, as: "role", required: false }] });
    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    const hospitalId = bodyHospitalId || user.hospital_id;
    if (!hospitalId) {
      return res.status(400).json({ success: false, message: "hospital_id required (or user must belong to a hospital)" });
    }

    const hospital = await Hospital.findByPk(hospitalId);
    if (!hospital) return res.status(404).json({ success: false, message: "Hospital not found" });

    const isSuperAdminOfThisHospital =
      user.hospital_id === hospitalId && user.role && (user.role.name === SUPER_ADMIN_ROLE_NAME || user.role.name === "superadmin");
    if (!isSuperAdminOfThisHospital) {
      return res.status(403).json({
        success: false,
        message: "Only the Super Admin of this hospital can extend the subscription (or use provider admin).",
      });
    }

    const nextEndsAt = getNextSubscriptionEndsAt(hospital.subscription_ends_at, days);
    await hospital.update({ subscription_ends_at: nextEndsAt });

    await auditLog(
      { user: { id: userId } },
      { action: "EXTEND_SUBSCRIPTION", table_name: "Hospital", record_id: hospital.id, meta: { days, subscription_ends_at: nextEndsAt } }
    );

    const updated = await Hospital.findByPk(hospital.id);
    const subscriptionStatus = getSubscriptionStatus(updated);

    return res.status(200).json({
      success: true,
      message: `Subscription extended by ${days} days.`,
      data: {
        hospital: {
          id: updated.id,
          name: updated.name,
          subscription_ends_at: updated.subscription_ends_at,
          subscription_status: subscriptionStatus,
        },
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Error extending subscription",
      error: error.message,
    });
  }
};

/**
 * Get subscription status for the current user's hospital.
 * GET /api/subscription/status
 */
const getStatus = async (req, res) => {
  try {
    const userId = req.userId;
    if (!userId) return res.status(401).json({ success: false, message: "Authentication required" });

    const user = await User.findByPk(userId, { attributes: ["hospital_id"] });
    if (!user || !user.hospital_id) {
      return res.status(400).json({ success: false, message: "User is not linked to a hospital" });
    }

    const hospital = await Hospital.findByPk(user.hospital_id);
    if (!hospital) return res.status(404).json({ success: false, message: "Hospital not found" });

    const subscriptionStatus = getSubscriptionStatus(hospital);

    return res.status(200).json({
      success: true,
      data: {
        hospital_id: hospital.id,
        hospital_name: hospital.name,
        trial_ends_at: hospital.trial_ends_at,
        subscription_ends_at: hospital.subscription_ends_at,
        subscription_status: subscriptionStatus,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Error fetching subscription status",
      error: error.message,
    });
  }
};

module.exports = { extendSubscription, getStatus };
