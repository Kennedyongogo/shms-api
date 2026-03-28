const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const path = require("path");
const { User, Role, Hospital, RoleMenuItem, RegistrationPackagePayment, RegistrationInvoice } = require("../models");
const config = require("../config/config");
const { getPackageAmountKesSubunits, PACKAGE_AMOUNT_KES_SUBUNITS } = require("../constants/registrationPackages");
const { verifyRegistrationTransaction } = require("../services/paystackService");
const { auditLog } = require("../utils/auditLog");
const { getMenuItemsForRole, filterMenuItemsByPackage } = require("../utils/menuItems");
const {
  isHospitalSubscriptionActive,
  getSubscriptionStatus,
  getStaffSubscriptionExpiredMessage,
  getTrialEndsAtMinutes,
  getNextSubscriptionEndsAtMinutes,
} = require("../utils/subscriptionStatus");
const { deleteFile, toRelativeUploadPath } = require("../middleware/upload");
const { ALL_MENU_KEYS } = require("../constants/menuKeys");

const normalizeKenyanPhone = (input) => {
  if (input == null) return null;
  const raw = String(input).trim();
  if (!raw) return null;
  let p = raw.replace(/[\s\-()]/g, "");
  if (p.startsWith("+254")) {
    // ok
  } else if (p.startsWith("254")) {
    p = `+${p}`;
  } else if (p.startsWith("0") && p.length === 10) {
    p = `+254${p.slice(1)}`;
  } else if (/^[71]\d{8}$/.test(p)) {
    p = `+254${p}`;
  } else {
    throw new Error('Phone must be a Kenya number starting with "+254"');
  }
  if (!/^\+254\d{9}$/.test(p)) throw new Error('Phone must be in format "+254XXXXXXXXX"');
  return p;
};

const sanitizeUser = (user) => {
  if (!user) return user;
  const json = user.toJSON ? user.toJSON() : user;
  // eslint-disable-next-line no-unused-vars
  const { password, ...rest } = json;
  return rest;
};

const getRoleIdByNameOrFail = async (name) => {
  const role = await Role.findOne({ where: { name } });
  if (!role) {
    const err = new Error(`Role "${name}" does not exist. Create it first.`);
    err.status = 400;
    throw err;
  }
  return role.id;
};

const getDefaultRoleId = async () => getRoleIdByNameOrFail("patient");
/** Role name for the user who creates the hospital on register; same role used for full CRUD. */
const SUPER_ADMIN_ROLE_NAME = "Super Admin";
const getSuperAdminRoleId = async () => {
  let role = await Role.findOne({ where: { name: SUPER_ADMIN_ROLE_NAME } });
  if (!role) {
    role = await Role.create({ name: SUPER_ADMIN_ROLE_NAME, hospital_id: null });
  }
  return role.id;
};

const VALID_PACKAGES = ["silver", "gold"];

function buildPaymentRequiredPayload(hospital) {
  const pkg = String(hospital.subscription_package || "silver").toLowerCase();
  return {
    hospital_id: hospital.id,
    subscription_package: hospital.subscription_package,
    amount_kes_subunits: getPackageAmountKesSubunits(pkg),
    package_amounts_kes_subunits: { ...PACKAGE_AMOUNT_KES_SUBUNITS },
    paystack_public_key: (config.paystack && config.paystack.publicKey) || process.env.PAYSTACK_PUBLIC_KEY || null,
  };
}

const MAX_ORG_JWT_SEC = 7 * 24 * 3600;

/** JWT expires at the earliest of trial end or subscription end (seconds), capped at 7d; legacy hospitals use 7d. */
function getOrgUserJwtExpiresIn(hospital) {
  if (!hospital) return "7d";
  const now = Date.now();
  if (hospital.trial_ends_at == null && hospital.subscription_ends_at == null) {
    return "7d";
  }
  const ends = [];
  if (hospital.trial_ends_at) {
    const t = new Date(hospital.trial_ends_at).getTime();
    if (t > now) ends.push(t);
  }
  if (hospital.subscription_ends_at) {
    const t = new Date(hospital.subscription_ends_at).getTime();
    if (t > now) ends.push(t);
  }
  // If expired, allow enough time for data export/purge without forcing re-login every couple minutes.
  if (ends.length === 0) return "24h";
  const sec = Math.floor((Math.min(...ends) - now) / 1000);
  return Math.min(Math.max(1, sec), MAX_ORG_JWT_SEC);
}

/**
 * Register a new organization (hospital/clinic) with first user as Super Admin.
 * Body (JSON): hospital: { name, address?, phone?, email? }, full_name, email, password, confirm_password, package: 'silver'|'gold'
 * Body (multipart): hospital_name, hospital_address?, hospital_phone?, hospital_email?, full_name, email, phone?, password, confirm_password, package; optional file: hospital_logo
 */
const registerOrganization = async (req, res) => {
  try {
    let hospitalPayload;
    let full_name;
    let email;
    let phone;
    let password;
    let confirm_password;
    let pkg;
    let paystack_reference;

    if (req.body.hospital && typeof req.body.hospital === "object") {
      hospitalPayload = req.body.hospital;
      full_name = req.body.full_name;
      email = req.body.email;
      phone = req.body.phone;
      password = req.body.password;
      confirm_password = req.body.confirm_password;
      pkg = req.body.package;
      paystack_reference = req.body.paystack_reference;
    } else {
      hospitalPayload = {
        name: req.body.hospital_name,
        address: req.body.hospital_address,
        phone: req.body.hospital_phone,
        email: req.body.hospital_email,
      };
      full_name = req.body.full_name;
      email = req.body.email;
      phone = req.body.phone;
      password = req.body.password;
      confirm_password = req.body.confirm_password;
      pkg = req.body.package;
      paystack_reference = req.body.paystack_reference;
    }

    if (!full_name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "full_name, email, password are required",
      });
    }
    if (!hospitalPayload || !String(hospitalPayload.name || "").trim()) {
      return res.status(400).json({
        success: false,
        message: "hospital name is required",
      });
    }
    const packageVal = (pkg || "silver").toLowerCase();
    if (!VALID_PACKAGES.includes(packageVal)) {
      return res.status(400).json({
        success: false,
        message: "package must be silver or gold",
      });
    }

    let paystackRefToStore = null;
    let paystackVerification = null;
    const ref = paystack_reference != null ? String(paystack_reference).trim() : "";
    if (ref) {
      const refInUse = await Hospital.findOne({ where: { registration_paystack_reference: ref } });
      if (refInUse) {
        return res.status(400).json({
          success: false,
          message: "This payment has already been used for a registration.",
        });
      }
      try {
        paystackVerification = await verifyRegistrationTransaction(ref, packageVal, email);
      } catch (e) {
        const status = e.status || 500;
        return res.status(status).json({ success: false, message: e.message });
      }
      paystackRefToStore = ref;
    }

    if (confirm_password != null && password !== confirm_password) {
      return res.status(400).json({ success: false, message: "Passwords do not match" });
    }

    const exists = await User.findOne({ where: { email: String(email).toLowerCase().trim() } });
    if (exists) return res.status(400).json({ success: false, message: "Email already in use" });

    const hashed = await bcrypt.hash(password, 10);
    let normalizedPhone = null;
    if (phone) {
      try {
        normalizedPhone = normalizeKenyanPhone(phone);
      } catch (e) {
        return res.status(400).json({ success: false, message: e.message });
      }
    }

    const logoPath = req.file ? toRelativeUploadPath(req.file.path) : null;
    const trialEndsAt = paystackRefToStore ? null : getTrialEndsAtMinutes(config.organizationTrialMinutes);
    const subscriptionEndsAt = paystackRefToStore
      ? getNextSubscriptionEndsAtMinutes(null, config.organizationSubscriptionMinutes)
      : null;
    const hospital = await Hospital.create({
      name: String(hospitalPayload.name).trim(),
      address: hospitalPayload.address ? String(hospitalPayload.address).trim() : null,
      phone: hospitalPayload.phone ? String(hospitalPayload.phone).trim() : null,
      email: hospitalPayload.email ? String(hospitalPayload.email).trim() : null,
      logo_path: logoPath,
      subscription_package: packageVal,
      trial_ends_at: trialEndsAt,
      subscription_ends_at: subscriptionEndsAt,
      registration_paystack_reference: paystackRefToStore,
    });

    const superAdminRole = await Role.create({
      name: SUPER_ADMIN_ROLE_NAME,
      hospital_id: hospital.id,
    });
    await RoleMenuItem.bulkCreate(
      ALL_MENU_KEYS.map((menu_key) => ({ role_id: superAdminRole.id, menu_key }))
    );

    const user = await User.create({
      full_name: String(full_name).trim(),
      email: email.toLowerCase().trim(),
      phone: normalizedPhone,
      password: hashed,
      role_id: superAdminRole.id,
      hospital_id: hospital.id,
      status: "active",
      last_login: null,
    });

    if (paystackVerification && paystackRefToStore) {
      const d = paystackVerification;
      const safePayload = {
        id: d.id,
        reference: d.reference,
        amount: d.amount,
        currency: d.currency,
        paid_at: d.paid_at,
        channel: d.channel,
        customer: d.customer ? { id: d.customer.id, email: d.customer.email } : null,
      };
      await RegistrationPackagePayment.create({
        hospital_id: hospital.id,
        paystack_reference: paystackRefToStore,
        paystack_transaction_id: d.id != null ? String(d.id) : null,
        payer_email: String(email).toLowerCase().trim(),
        subscription_package: packageVal,
        amount_kes_subunits: Number(d.amount),
        currency: d.currency || "KES",
        paid_at: d.paid_at ? new Date(d.paid_at) : new Date(),
        channel: d.channel || null,
        paystack_customer_code: d.customer?.customer_code != null ? String(d.customer.customer_code) : null,
        raw_paystack_data: JSON.stringify(safePayload),
      });
      await RegistrationInvoice.create({
        hospital_id: hospital.id,
        subscription_package: packageVal,
        amount_kes_subunits: Number(d.amount),
        currency: d.currency || "KES",
        status: "paid",
        paid_at: new Date(),
      });
    } else {
      await RegistrationInvoice.create({
        hospital_id: hospital.id,
        subscription_package: packageVal,
        amount_kes_subunits: getPackageAmountKesSubunits(packageVal),
        currency: "KES",
        status: "unpaid",
        paid_at: null,
      });
    }

    const jwtExpiresIn = getOrgUserJwtExpiresIn(hospital);
    const token = jwt.sign({ id: user.id, type: "user" }, config.jwtSecret, { expiresIn: jwtExpiresIn });
    const tokenExpiresIn =
      typeof jwtExpiresIn === "number" ? `${jwtExpiresIn}s` : String(jwtExpiresIn);
    const role = await Role.findByPk(superAdminRole.id);
    let menuItems = await getMenuItemsForRole(role.id, role.name);
    menuItems = filterMenuItemsByPackage(menuItems, hospital.subscription_package);

    await auditLog(
      { user: { id: user.id } },
      { action: "REGISTER_ORGANIZATION", table_name: "Hospital", record_id: hospital.id }
    );

    const subscriptionStatus = getSubscriptionStatus(hospital);
    return res.status(201).json({
      success: true,
      data: {
        user: sanitizeUser(user),
        role,
        hospital: {
          id: hospital.id,
          name: hospital.name,
          subscription_package: hospital.subscription_package,
          primary_color: hospital.primary_color,
          trial_ends_at: hospital.trial_ends_at,
          subscription_ends_at: hospital.subscription_ends_at,
          subscription_status: subscriptionStatus,
        },
        registration_invoice: {
          status: paystackRefToStore ? "paid" : "unpaid",
          amount_kes_subunits: getPackageAmountKesSubunits(packageVal),
        },
        token,
        token_expires_in: tokenExpiresIn,
        token_expires_in_seconds: typeof jwtExpiresIn === "number" ? jwtExpiresIn : null,
        menuItems,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Error registering organization",
      error: error.message,
    });
  }
};

const register = async (req, res) => {
  try {
    const { full_name, email, phone, password, confirm_password, role_id } = req.body;
    if (!full_name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "full_name, email, password are required",
      });
    }
    if (confirm_password != null && password !== confirm_password) {
      return res.status(400).json({ success: false, message: "Passwords do not match" });
    }

    const exists = await User.findOne({ where: { email } });
    if (exists) return res.status(400).json({ success: false, message: "Email already in use" });

    const hashed = await bcrypt.hash(password, 10);
    let normalizedPhone = null;
    try {
      normalizedPhone = normalizeKenyanPhone(phone);
    } catch (e) {
      return res.status(400).json({ success: false, message: e.message });
    }
    const resolvedRoleId = role_id || (await getDefaultRoleId());
    const user = await User.create({
      full_name,
      email,
      phone: normalizedPhone,
      password: hashed,
      role_id: resolvedRoleId,
      status: "active",
      last_login: null,
    });

    const token = jwt.sign({ id: user.id, type: "user" }, config.jwtSecret, { expiresIn: "7d" });
    const role = await Role.findByPk(resolvedRoleId);
    await auditLog({ user: { id: user.id } }, { action: "REGISTER", table_name: "User", record_id: user.id });

    return res.status(201).json({
      success: true,
      data: { user: sanitizeUser(user), role, token },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Error registering user", error: error.message });
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, message: "email and password are required" });
    }

    const user = await User.findOne({
      where: { email: String(email).toLowerCase().trim() },
    });
    if (!user) return res.status(401).json({ success: false, message: "Invalid credentials" });

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) return res.status(401).json({ success: false, message: "Invalid credentials" });

    if (user.status !== "active") {
      return res.status(403).json({ success: false, message: "Account is not active" });
    }

    const role = await Role.findByPk(user.role_id);

    let hospital = null;
    if (user.hospital_id) {
      try {
        hospital = await Hospital.findByPk(user.hospital_id);
      } catch (err) {
        console.error("[login] Hospital fetch failed (e.g. missing column?):", err.message);
      }
    }

    let isExpiredSuperAdmin = false;
    if (
      hospital &&
      !config.disableSubscriptionEnforcement &&
      !isHospitalSubscriptionActive(hospital)
    ) {
      const subscriptionStatus = getSubscriptionStatus(hospital);
      if (role?.name === SUPER_ADMIN_ROLE_NAME) {
        // Expired-mode: let Super Admin login, but API will restrict them to export/delete only.
        isExpiredSuperAdmin = true;
      } else {
        return res.status(403).json({
          success: false,
          code: "SUBSCRIPTION_EXPIRED",
          message: getStaffSubscriptionExpiredMessage(hospital),
          subscription_status: subscriptionStatus,
        });
      }
    }

    await user.update({ last_login: new Date() });
    const loginJwtExpiresIn = getOrgUserJwtExpiresIn(hospital);
    const token = jwt.sign({ id: user.id, type: "user" }, config.jwtSecret, { expiresIn: loginJwtExpiresIn });
    let menuItems = await getMenuItemsForRole(role?.id, role?.name);

    if (isExpiredSuperAdmin) {
      // Sidebar should only show Settings (where export + purge live).
      menuItems = ["settings"];
    }

    if (hospital && hospital.subscription_package) {
      menuItems = filterMenuItemsByPackage(menuItems, hospital.subscription_package);
    }

    const subscriptionStatus = hospital ? getSubscriptionStatus(hospital) : null;
    const hospitalPayload = hospital
      ? {
          id: hospital.id,
          name: hospital.name,
          subscription_package: hospital.subscription_package || "silver",
          primary_color: hospital.primary_color ?? "#00897B",
          trial_ends_at: hospital.trial_ends_at,
          subscription_ends_at: hospital.subscription_ends_at,
          subscription_status: subscriptionStatus,
          paystack_public_key:
            (config.paystack && config.paystack.publicKey) || process.env.PAYSTACK_PUBLIC_KEY || null,
        }
      : null;

    await auditLog({ user: { id: user.id } }, { action: "LOGIN", table_name: "auth" });
    const loginTokenExpiresLabel =
      typeof loginJwtExpiresIn === "number" ? `${loginJwtExpiresIn}s` : String(loginJwtExpiresIn);
    return res.status(200).json({
      success: true,
      data: {
        user: sanitizeUser(user),
        role,
        token,
        token_expires_in: loginTokenExpiresLabel,
        token_expires_in_seconds: typeof loginJwtExpiresIn === "number" ? loginJwtExpiresIn : null,
        menuItems,
        hospital: hospitalPayload,
      },
    });
  } catch (error) {
    console.error("[login] 500:", error.message);
    return res.status(500).json({
      success: false,
      message: "Error logging in",
      error: error.message,
    });
  }
};

const logout = async (req, res) => {
  await auditLog(req, { action: "LOGOUT", table_name: "auth" });
  return res.status(200).json({ success: true, message: "Logged out" });
};

const bootstrapPromoteMe = async (req, res) => {
  try {
    const userId = req.userId;
    if (!userId) return res.status(401).json({ success: false, message: "Authentication required" });

    // Only allow if there is currently NO Super Admin user (bootstrap safety)
    const superAdminRoleId = await getSuperAdminRoleId();
    const countSuperAdmins = await User.count({ where: { role_id: superAdminRoleId } });
    if (countSuperAdmins > 0) {
      return res.status(403).json({ success: false, message: "Bootstrap is disabled because a Super Admin already exists" });
    }
    const user = await User.findByPk(userId);
    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    await user.update({ role_id: superAdminRoleId });
    const role = await Role.findByPk(superAdminRoleId);
    await auditLog({ user: { id: userId } }, { action: "BOOTSTRAP_PROMOTE_SUPER_ADMIN", table_name: "User", record_id: userId });

    return res.status(200).json({
      success: true,
      message: "User promoted to Super Admin (bootstrap)",
      data: { user: sanitizeUser(user), role },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Error promoting user", error: error.message });
  }
};

const resetPassword = async (req, res) => {
  try {
    const { email, new_password } = req.body;
    if (!email || !new_password) {
      return res.status(400).json({ success: false, message: "email and new_password are required" });
    }
    const normalizedEmail = String(email).toLowerCase().trim();
    const user = await User.findOne({ where: { email: normalizedEmail } });
    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    const hashed = await bcrypt.hash(new_password, 10);
    await user.update({ password: hashed });
    await auditLog({ user: { id: user.id } }, { action: "RESET_PASSWORD", table_name: "User", record_id: user.id });
    return res.status(200).json({ success: true, message: "Password reset successful" });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Error resetting password", error: error.message });
  }
};

const me = async (req, res) => {
  try {
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({ success: false, message: "Authentication required" });
    }
    const user = await User.findByPk(userId, {
      attributes: { exclude: ["password"] },
      include: [{ association: "hospital", required: false }],
    });
    if (!user) return res.status(404).json({ success: false, message: "User not found" });
    const role = await Role.findByPk(user.role_id);
    let menuItems = await getMenuItemsForRole(role?.id, role?.name);
    const hospital = user.hospital || (user.hospital_id ? await Hospital.findByPk(user.hospital_id) : null);

    let isExpiredSuperAdmin = false;
    if (
      hospital &&
      !config.disableSubscriptionEnforcement &&
      !isHospitalSubscriptionActive(hospital)
    ) {
      const subscriptionStatus = getSubscriptionStatus(hospital);
      if (role?.name === SUPER_ADMIN_ROLE_NAME) {
        // Expired-mode: allow me() so the Settings page can load export/purge actions.
        isExpiredSuperAdmin = true;
      } else {
        return res.status(403).json({
          success: false,
          code: "SUBSCRIPTION_EXPIRED",
          message: getStaffSubscriptionExpiredMessage(hospital),
          subscription_status: subscriptionStatus,
        });
      }
    }

    if (isExpiredSuperAdmin) {
      menuItems = ["settings"];
    }

    if (hospital && hospital.subscription_package) {
      menuItems = filterMenuItemsByPackage(menuItems, hospital.subscription_package);
    }
    const subscriptionStatus = hospital ? getSubscriptionStatus(hospital) : null;
    return res.status(200).json({
      success: true,
      data: {
        user: sanitizeUser(user),
        role: role || null,
        menuItems,
        hospital: hospital
          ? {
              id: hospital.id,
              name: hospital.name,
              subscription_package: hospital.subscription_package,
              primary_color: hospital.primary_color,
              trial_ends_at: hospital.trial_ends_at,
              subscription_ends_at: hospital.subscription_ends_at,
              subscription_status: subscriptionStatus,
              paystack_public_key:
                (config.paystack && config.paystack.publicKey) || process.env.PAYSTACK_PUBLIC_KEY || null,
            }
          : null,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Error fetching current user",
      error: error.message,
    });
  }
};

/** Validate new password: length >= 8, uppercase, lowercase, digit, special. */
function validateNewPassword(password) {
  if (!password || typeof password !== "string") return { valid: false, message: "Password is required" };
  const p = password;
  if (p.length < 8) return { valid: false, message: "Password must be at least 8 characters long" };
  if (!/[A-Z]/.test(p)) return { valid: false, message: "Password must contain at least one uppercase letter" };
  if (!/[a-z]/.test(p)) return { valid: false, message: "Password must contain at least one lowercase letter" };
  if (!/\d/.test(p)) return { valid: false, message: "Password must contain at least one digit" };
  if (!/[!@#$%^&*(),.?":{}|<>_\-+=[\]\\;/'`~]/.test(p)) {
    return { valid: false, message: "Password must contain at least one special character" };
  }
  return { valid: true };
}

/** POST /api/auth/change-password — logged-in user changes own password (currentPassword + newPassword). */
const changePassword = async (req, res) => {
  try {
    const userId = req.userId;
    if (!userId) return res.status(401).json({ success: false, message: "Authentication required" });

    const { currentPassword, newPassword } = req.body;
    if (!currentPassword) {
      return res.status(400).json({ success: false, message: "currentPassword is required" });
    }
    if (!newPassword) {
      return res.status(400).json({ success: false, message: "newPassword is required" });
    }

    const validation = validateNewPassword(newPassword);
    if (!validation.valid) {
      return res.status(400).json({ success: false, message: validation.message });
    }

    const user = await User.findByPk(userId);
    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    const match = await bcrypt.compare(currentPassword, user.password);
    if (!match) {
      return res.status(400).json({ success: false, message: "Current password is incorrect" });
    }

    const hashed = await bcrypt.hash(newPassword, 10);
    await user.update({ password: hashed });
    await auditLog(req, { action: "CHANGE_PASSWORD", table_name: "User", record_id: userId });
    return res.status(200).json({ success: true, message: "Password updated successfully" });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Error changing password",
      error: error.message,
    });
  }
};

/** PATCH /api/auth/me — logged-in user updates own profile (full_name, phone only). */
const updateMe = async (req, res) => {
  try {
    const userId = req.userId;
    if (!userId) return res.status(401).json({ success: false, message: "Authentication required" });

    const user = await User.findByPk(userId);
    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    const updates = {};
    if (req.body.full_name != null) {
      const name = String(req.body.full_name).trim();
      updates.full_name = name || user.full_name;
    }
    if (req.body.phone != null) {
      const raw = String(req.body.phone).trim();
      if (raw === "") {
        updates.phone = null;
      } else {
        try {
          updates.phone = normalizeKenyanPhone(req.body.phone);
        } catch (e) {
          return res.status(400).json({ success: false, message: e.message });
        }
      }
    }

    if (Object.keys(updates).length === 0) {
      const role = await Role.findByPk(user.role_id);
      const menuItems = await getMenuItemsForRole(role?.id, role?.name);
      return res.status(200).json({
        success: true,
        data: { user: sanitizeUser(user), role: role || null, menuItems },
      });
    }

    await user.update(updates);
    await user.reload();
    await auditLog(req, { action: "UPDATE_ME", table_name: "User", record_id: userId });
    const role = await Role.findByPk(user.role_id);
    const menuItems = await getMenuItemsForRole(role?.id, role?.name);
    return res.status(200).json({
      success: true,
      data: { user: sanitizeUser(user), role: role || null, menuItems },
      message: "Profile updated successfully",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Error updating profile",
      error: error.message,
    });
  }
};

/** PUT /api/auth/me/profile-image — logged-in user uploads own profile image. */
const updateMyProfileImage = async (req, res) => {
  try {
    const userId = req.userId;
    if (!userId) return res.status(401).json({ success: false, message: "Authentication required" });

    const user = await User.findByPk(userId);
    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    const filePath = req.file?.path || (req.file?.destination && req.file?.filename ? path.join(req.file.destination, req.file.filename) : null);
    if (!filePath) {
      return res.status(400).json({
        success: false,
        message: 'Missing file field "profile_image"',
      });
    }

    if (user.profile_image_path) {
      const absOld = path.join(__dirname, "..", "..", user.profile_image_path);
      await deleteFile(absOld);
    }

    const relative = toRelativeUploadPath(filePath);
    const updated = await user.update({ profile_image_path: relative });
    await auditLog(req, { action: "UPDATE_MY_PROFILE_IMAGE", table_name: "User", record_id: userId });
    const role = await Role.findByPk(updated.role_id);
    const menuItems = await getMenuItemsForRole(role?.id, role?.name);
    return res.status(200).json({
      success: true,
      data: { user: sanitizeUser(updated), role: role || null, menuItems },
      message: "Profile picture updated",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Error updating profile image",
      error: error.message,
    });
  }
};

module.exports = {
  login,
  logout,
  register,
  registerOrganization,
  resetPassword,
  bootstrapPromoteMe,
  me,
  changePassword,
  updateMe,
  updateMyProfileImage,
};

