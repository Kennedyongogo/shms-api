const config = require("../config/config");
const { sequelize } = require("../config/database");
const {
  initializeRegistrationTransaction,
  verifyRegistrationTransaction,
} = require("../services/paystackService");
const { getPackageAmountKesSubunits, VALID_PACKAGES } = require("../constants/registrationPackages");
const {
  getNextSubscriptionEndsAtMinutes,
  getSubscriptionStatus,
  isHospitalSubscriptionActive,
} = require("../utils/subscriptionStatus");
const { Hospital, User, Role, RegistrationPackagePayment, RegistrationInvoice } = require("../models");

const SUPER_ADMIN_ROLE_NAME = "Super Admin";

/** e.g. http://localhost:3000/register → http://localhost:3000/ */
function subscriptionCallbackFromRegisterUrl(registerUrl) {
  try {
    const u = new URL(registerUrl);
    let p = u.pathname.replace(/\/?register\/?$/i, "") || "/";
    if (!p.endsWith("/")) p += "/";
    u.pathname = p;
    u.search = "";
    u.hash = "";
    return u.toString();
  } catch {
    return "http://localhost:3000/";
  }
}

/**
 * POST /api/auth/payment/initialize-registration
 * Body: { package: 'silver'|'gold', email: string, hospital_id?: uuid }
 * hospital_id — include when paying after trial (metadata for verify).
 */
const initializeRegistrationPayment = async (req, res) => {
  try {
    const pkg = String(req.body.package || "")
      .toLowerCase()
      .trim();
    const email = req.body.email;
    const hospitalId = req.body.hospital_id || req.body.hospitalId;

    if (!VALID_PACKAGES.includes(pkg)) {
      return res.status(400).json({ success: false, message: "package must be silver or gold" });
    }

    const registerCallbackUrl =
      (config.paystack && config.paystack.registerCallbackUrl) ||
      process.env.PAYSTACK_REGISTER_CALLBACK_URL ||
      "http://localhost:3000/register";

    const subscriptionCallbackUrl =
      (config.paystack && config.paystack.subscriptionCallbackUrl) ||
      process.env.PAYSTACK_SUBSCRIPTION_CALLBACK_URL ||
      subscriptionCallbackFromRegisterUrl(registerCallbackUrl);

    const callbackUrl = hospitalId ? subscriptionCallbackUrl : registerCallbackUrl;

    const { authorization_url, access_code, reference } = await initializeRegistrationTransaction({
      email,
      package: pkg,
      callbackUrl,
      hospitalId: hospitalId || undefined,
    });

    return res.status(200).json({
      success: true,
      data: {
        authorization_url,
        access_code,
        reference,
        package: pkg,
        amount_kes_subunits: getPackageAmountKesSubunits(pkg),
        currency: "KES",
      },
    });
  } catch (error) {
    const status = error.status || 500;
    return res.status(status).json({
      success: false,
      message: error.message || "Error initializing payment",
      ...(process.env.NODE_ENV === "development" && error.paystackResponse ? { details: error.paystackResponse } : {}),
    });
  }
};

/**
 * GET /api/auth/payment/verify-registration/:reference?email=&package=
 */
const verifyRegistrationPayment = async (req, res) => {
  try {
    const reference = req.params.reference;
    const pkg = String(req.query.package || "")
      .toLowerCase()
      .trim();
    const email = req.query.email;

    if (!VALID_PACKAGES.includes(pkg)) {
      return res.status(400).json({ success: false, message: "package must be silver or gold" });
    }
    if (!email) {
      return res.status(400).json({ success: false, message: "email query parameter is required" });
    }

    await verifyRegistrationTransaction(reference, pkg, email);

    return res.status(200).json({ success: true, message: "Payment verified" });
  } catch (error) {
    const status = error.status || 500;
    return res.status(status).json({
      success: false,
      message: error.message || "Error verifying payment",
    });
  }
};

/**
 * POST /api/auth/payment/complete-subscription
 * Body: { hospital_id, reference, package, email } — after Paystack for an existing org (e.g. trial ended).
 * Paystack initialize must have been called with the same hospital_id (metadata).
 */
const completeOrganizationSubscription = async (req, res) => {
  try {
    const hospital_id = req.body.hospital_id || req.body.hospitalId;
    const reference = req.body.reference || req.body.paystack_reference;
    const pkg = String(req.body.package || "")
      .toLowerCase()
      .trim();
    const email = req.body.email;

    if (!hospital_id || !reference || !VALID_PACKAGES.includes(pkg) || !email) {
      return res.status(400).json({
        success: false,
        message: "hospital_id, reference, package (silver|gold), and email are required",
      });
    }

    const refTrim = String(reference).trim();

    const hospital = await Hospital.findByPk(hospital_id);
    if (!hospital) {
      return res.status(404).json({ success: false, message: "Hospital not found" });
    }

    const existingPayment = await RegistrationPackagePayment.findOne({
      where: { paystack_reference: refTrim },
    });
    if (existingPayment && existingPayment.hospital_id === hospital.id) {
      const fresh = await Hospital.findByPk(hospital.id);
      return res.status(200).json({
        success: true,
        message: "Payment already recorded",
        data: {
          hospital: {
            id: fresh.id,
            subscription_package: fresh.subscription_package,
            trial_ends_at: fresh.trial_ends_at,
            subscription_ends_at: fresh.subscription_ends_at,
            subscription_status: getSubscriptionStatus(fresh),
          },
        },
      });
    }

    const subscriptionActive = isHospitalSubscriptionActive(hospital);
    const hasPaystackRefOnFile = Boolean(hospital.registration_paystack_reference);
    if (subscriptionActive && hasPaystackRefOnFile) {
      return res.status(400).json({
        success: false,
        message: "Subscription is already active. Renew or change package only after the current period has expired.",
      });
    }

    const superRole = await Role.findOne({
      where: { hospital_id: hospital.id, name: SUPER_ADMIN_ROLE_NAME },
    });
    if (!superRole) {
      return res.status(400).json({ success: false, message: "Organization role setup is invalid" });
    }
    const adminUser = await User.findOne({
      where: {
        hospital_id: hospital.id,
        email: String(email).toLowerCase().trim(),
        role_id: superRole.id,
      },
    });
    if (!adminUser) {
      return res.status(403).json({
        success: false,
        message: "Email must be the Super Admin for this organization",
      });
    }

    const refOwner = await Hospital.findOne({
      where: { registration_paystack_reference: refTrim },
    });
    if (refOwner && refOwner.id !== hospital.id) {
      return res.status(400).json({ success: false, message: "This payment reference is already in use" });
    }

    let paystackVerification;
    try {
      paystackVerification = await verifyRegistrationTransaction(refTrim, pkg, email, {
        expectedHospitalId: hospital_id,
      });
    } catch (e) {
      const status = e.status || 500;
      return res.status(status).json({ success: false, message: e.message });
    }

    const d = paystackVerification;
    const subEnds = getNextSubscriptionEndsAtMinutes(null, config.organizationSubscriptionMinutes);

    const safePayload = {
      id: d.id,
      reference: d.reference,
      amount: d.amount,
      currency: d.currency,
      paid_at: d.paid_at,
      channel: d.channel,
      customer: d.customer ? { id: d.customer.id, email: d.customer.email } : null,
    };

    const t = await sequelize.transaction();
    try {
      await hospital.update(
        {
          registration_paystack_reference: refTrim,
          subscription_ends_at: subEnds,
          trial_ends_at: null,
          subscription_package: pkg,
        },
        { transaction: t }
      );

      await RegistrationPackagePayment.create(
        {
          hospital_id: hospital.id,
          paystack_reference: refTrim,
          paystack_transaction_id: d.id != null ? String(d.id) : null,
          payer_email: String(email).toLowerCase().trim(),
          subscription_package: pkg,
          amount_kes_subunits: Number(d.amount),
          currency: d.currency || "KES",
          paid_at: d.paid_at ? new Date(d.paid_at) : new Date(),
          channel: d.channel || null,
          paystack_customer_code: d.customer?.customer_code != null ? String(d.customer.customer_code) : null,
          raw_paystack_data: JSON.stringify(safePayload),
        },
        { transaction: t }
      );

      const invoice = await RegistrationInvoice.findOne({
        where: { hospital_id: hospital.id, status: "unpaid" },
        order: [["createdAt", "DESC"]],
        transaction: t,
      });
      if (invoice) {
        await invoice.update(
          {
            status: "paid",
            paid_at: new Date(),
            amount_kes_subunits: Number(d.amount),
            subscription_package: pkg,
          },
          { transaction: t }
        );
      }

      await t.commit();
    } catch (err) {
      await t.rollback();
      throw err;
    }

    const fresh = await Hospital.findByPk(hospital.id);
    return res.status(200).json({
      success: true,
      message: "Subscription payment recorded",
      data: {
        hospital: {
          id: fresh.id,
          subscription_package: fresh.subscription_package,
          trial_ends_at: fresh.trial_ends_at,
          subscription_ends_at: fresh.subscription_ends_at,
          subscription_status: getSubscriptionStatus(fresh),
        },
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Error completing subscription payment",
      error: error.message,
    });
  }
};

module.exports = {
  initializeRegistrationPayment,
  verifyRegistrationPayment,
  completeOrganizationSubscription,
};
