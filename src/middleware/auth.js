const jwt = require("jsonwebtoken");
const { User, Role, Permission, Patient, CarlvyneAccount, Admin, Hospital } = require("../models");
const config = require("../config/config");
const { isHospitalSubscriptionActive, getSubscriptionStatus } = require("../utils/subscriptionStatus");
const { getPackageAmountKesSubunits, PACKAGE_AMOUNT_KES_SUBUNITS } = require("../constants/registrationPackages");

const extractBearerToken = (req) => {
  const authHeader = req.header("Authorization");
  return authHeader && authHeader.startsWith("Bearer ")
    ? authHeader.split(" ")[1]
    : null;
};

// Authenticate system users (User model)
exports.authenticateUser = async (req, res, next) => {
  const authHeader = req.header("Authorization");
  const token = extractBearerToken(req);

  if (!token) {
    return res.status(401).json({
      success: false,
      message: "Access denied, no token provided",
    });
  }

  try {
    const decoded = jwt.verify(token, config.jwtSecret);

    if (decoded.type !== "user") {
      return res.status(403).json({
        success: false,
        message: "Access denied, invalid token type",
      });
    }

    const user = await User.findByPk(decoded.id, {
      attributes: { exclude: ["password"] },
    });

    if (!user || user.status !== "active") {
      return res.status(403).json({
        success: false,
        message: "Access denied, invalid or inactive user",
      });
    }

    req.userId = user.id;
    req.user = user;
    req.userType = "user";

    // Attach role name and permissions (lazy-ish; used by guards below)
    const role = await Role.findByPk(user.role_id, {
      include: [
        {
          model: Permission,
          as: "permissions",
          through: { attributes: [] },
          required: false,
        },
      ],
    });
    req.role = role ? { id: role.id, name: role.name } : null;
    req.permissions = role?.permissions?.map((p) => p.name) ?? [];

    if (!config.disableSubscriptionEnforcement && user.hospital_id) {
      const hospital = await Hospital.findByPk(user.hospital_id);
      if (hospital && !isHospitalSubscriptionActive(hospital)) {
        const subscriptionStatus = getSubscriptionStatus(hospital);
        const isSuperAdmin = role?.name === "Super Admin";
        if (isSuperAdmin) {
          const pkg = String(hospital.subscription_package || "silver").toLowerCase();
          return res.status(403).json({
            success: false,
            code: "PAYMENT_REQUIRED",
            message:
              subscriptionStatus.message ||
              "Subscription inactive. Complete payment or wait for your organization subscription to be renewed.",
            data: {
              hospital_id: hospital.id,
              subscription_package: hospital.subscription_package,
              amount_kes_subunits: getPackageAmountKesSubunits(pkg),
              package_amounts_kes_subunits: { ...PACKAGE_AMOUNT_KES_SUBUNITS },
              paystack_public_key: (config.paystack && config.paystack.publicKey) || process.env.PAYSTACK_PUBLIC_KEY || null,
            },
            subscription_status: subscriptionStatus,
          });
        }
        return res.status(403).json({
          success: false,
          code: "SUBSCRIPTION_EXPIRED",
          message:
            "Your organization's subscription has expired or is inactive. Please contact your Super Admin to renew the subscription.",
          subscription_status: subscriptionStatus,
        });
      }
    }

    next();
  } catch (error) {
    console.error("User auth error:", error);
    res.status(400).json({
      success: false,
      message: "Invalid token",
    });
  }
};

exports.authenticateToken = exports.authenticateUser;

// Authenticate admins (Admin model) for public admin portal
exports.authenticateAdmin = async (req, res, next) => {
  const token = extractBearerToken(req);
  if (!token) {
    return res.status(401).json({ success: false, message: "Access denied, no token provided" });
  }

  try {
    const decoded = jwt.verify(token, config.jwtSecret);
    if (decoded.type !== "admin") {
      return res.status(403).json({ success: false, message: "Access denied, invalid token type" });
    }

    const admin = await Admin.findByPk(decoded.id, {
      attributes: { exclude: ["password"] },
    });

    if (!admin || admin.status !== "active") {
      return res.status(403).json({ success: false, message: "Access denied, invalid or inactive admin" });
    }

    req.adminId = admin.id;
    req.admin = admin;
    req.userType = "admin";
    next();
  } catch (error) {
    return res.status(400).json({ success: false, message: "Invalid token" });
  }
};

// Authenticate Carlvyne owners (CarlvyneAccount model) for M&E portal
exports.authenticateCarlvyneOwner = async (req, res, next) => {
  const token = extractBearerToken(req);
  if (!token) {
    return res.status(401).json({ success: false, message: "Access denied, no token provided" });
  }

  try {
    const decoded = jwt.verify(token, config.jwtSecret);
    if (decoded.type !== "carlvyne_owner") {
      return res.status(403).json({ success: false, message: "Access denied, invalid token type" });
    }

    const owner = await CarlvyneAccount.findByPk(decoded.id);
    if (!owner || !owner.is_active) {
      return res.status(403).json({ success: false, message: "Access denied, invalid or inactive account" });
    }

    req.carlvyneOwnerId = owner.id;
    req.carlvyneOwner = owner;
    req.userType = "carlvyne_owner";
    next();
  } catch (error) {
    res.status(400).json({ success: false, message: "Invalid token" });
  }
};

// Authenticate patients (Patient model) for the public portal
exports.authenticatePatient = async (req, res, next) => {
  const token = extractBearerToken(req);
  if (!token) {
    return res.status(401).json({ success: false, message: "Access denied, no token provided" });
  }

  try {
    const decoded = jwt.verify(token, config.jwtSecret);
    if (decoded.type !== "patient") {
      return res.status(403).json({ success: false, message: "Access denied, invalid token type" });
    }

    const patient = await Patient.findByPk(decoded.id);
    if (!patient || patient.status !== "active") {
      return res.status(403).json({ success: false, message: "Access denied, invalid or inactive patient" });
    }

    req.patientId = patient.id;
    req.patient = patient;
    req.userType = "patient";
    next();
  } catch (error) {
    res.status(400).json({ success: false, message: "Invalid token" });
  }
};

// Optional authentication (for public endpoints that might need user info)
exports.optionalAuth = async (req, res, next) => {
  const token = extractBearerToken(req);

  if (!token) {
    return next(); // Continue without authentication
  }

  try {
    const decoded = jwt.verify(token, config.jwtSecret);

    if (decoded.type === "user") {
      const user = await User.findByPk(decoded.id, {
        attributes: { exclude: ["password"] },
      });

      if (user && user.status === "active") {
        req.userId = user.id;
        req.user = user;
        req.userType = "user";
      }
    }
    if (decoded.type === "patient") {
      const patient = await Patient.findByPk(decoded.id);
      if (patient && patient.status === "active") {
        req.patientId = patient.id;
        req.patient = patient;
        req.userType = "patient";
      }
    }

    next();
  } catch (error) {
    // If token is invalid, continue without authentication
    next();
  }
};

// Require one of the specified role names (e.g. ["Super Admin"])
exports.requireRoles = (roleNames = []) => {
  const allowed = new Set(roleNames);
  return (req, res, next) => {
    if (!req.user || req.userType !== "user") {
      return res.status(401).json({ success: false, message: "Authentication required" });
    }
    const roleName = req.role?.name;
    if (!roleName || !allowed.has(roleName)) {
      return res.status(403).json({ success: false, message: "Access denied, insufficient role" });
    }
    next();
  };
};

// Require ALL specified permission names
exports.requirePermissions = (permissionNames = []) => {
  const needed = new Set(permissionNames);
  return (req, res, next) => {
    if (!req.user || req.userType !== "user") {
      return res.status(401).json({ success: false, message: "Authentication required" });
    }
    const have = new Set(req.permissions ?? []);
    for (const p of needed) {
      if (!have.has(p)) {
        return res.status(403).json({ success: false, message: "Access denied, missing permission" });
      }
    }
    next();
  };
};

// Rate limiting helper (can be enhanced with redis)
const requestCounts = new Map();

exports.rateLimit = (maxRequests = 100, windowMs = 60000) => {
  return (req, res, next) => {
    const key = req.userId || req.ip;
    const now = Date.now();
    
    if (!requestCounts.has(key)) {
      requestCounts.set(key, { count: 1, resetTime: now + windowMs });
      return next();
    }

    const userData = requestCounts.get(key);
    
    if (now > userData.resetTime) {
      userData.count = 1;
      userData.resetTime = now + windowMs;
      return next();
    }

    if (userData.count >= maxRequests) {
      return res.status(429).json({
        success: false,
        message: "Too many requests, please try again later",
      });
    }

    userData.count++;
    next();
  };
};

module.exports = exports;
