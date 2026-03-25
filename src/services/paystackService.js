/**
 * Paystack API (fetch only, no axios — same pattern as mpesaService.js).
 */

const config = require("../config/config");
const { getPackageAmountKesSubunits } = require("../constants/registrationPackages");

const PAYSTACK_BASE = "https://api.paystack.co";

function getSecretKey() {
  return (config.paystack && config.paystack.secretKey) || process.env.PAYSTACK_SECRET_KEY;
}

async function parseJsonBody(response) {
  const text = await response.text().catch(() => "");
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    return {};
  }
}

/**
 * Initialize a Paystack transaction for organization registration (KES).
 * @returns {Promise<{ authorization_url: string, access_code: string, reference: string }>}
 */
async function initializeRegistrationTransaction({ email, package: pkg, callbackUrl, hospitalId }) {
  const secret = getSecretKey();
  if (!secret) {
    const err = new Error("Paystack is not configured (missing PAYSTACK_SECRET_KEY)");
    err.status = 503;
    throw err;
  }

  const packageKey = String(pkg || "").toLowerCase();
  const amount = getPackageAmountKesSubunits(packageKey);
  if (amount == null) {
    const err = new Error("Invalid package");
    err.status = 400;
    throw err;
  }

  const normalizedEmail = String(email || "")
    .toLowerCase()
    .trim();
  if (!normalizedEmail) {
    const err = new Error("email is required");
    err.status = 400;
    throw err;
  }

  const payload = {
    email: normalizedEmail,
    amount,
    currency: "KES",
    callback_url: callbackUrl,
    metadata: {
      package: packageKey,
      purpose: "organization_registration",
      ...(hospitalId ? { hospital_id: String(hospitalId) } : {}),
    },
  };

  const response = await fetch(`${PAYSTACK_BASE}/transaction/initialize`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secret}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const body = await parseJsonBody(response);

  if (response.status !== 200 || !body.status) {
    const msg = body.message || "Paystack initialize failed";
    const err = new Error(msg);
    err.status = 502;
    err.paystackResponse = body;
    throw err;
  }

  const d = body.data;
  return {
    authorization_url: d.authorization_url,
    access_code: d.access_code,
    reference: d.reference,
  };
}

function parseMetadata(raw) {
  if (raw == null) return {};
  if (typeof raw === "object") return raw;
  if (typeof raw === "string") {
    try {
      return JSON.parse(raw);
    } catch {
      return {};
    }
  }
  return {};
}

/**
 * Verify transaction and ensure it matches registration payment for the given package and payer email.
 */
async function verifyRegistrationTransaction(reference, expectedPackage, expectedEmail, options = {}) {
  const secret = getSecretKey();
  if (!secret) {
    const err = new Error("Paystack is not configured (missing PAYSTACK_SECRET_KEY)");
    err.status = 503;
    throw err;
  }

  const ref = String(reference || "").trim();
  if (!ref) {
    const err = new Error("reference is required");
    err.status = 400;
    throw err;
  }

  const packageKey = String(expectedPackage || "").toLowerCase();
  const expectedAmount = getPackageAmountKesSubunits(packageKey);
  if (expectedAmount == null) {
    const err = new Error("Invalid package");
    err.status = 400;
    throw err;
  }

  const response = await fetch(`${PAYSTACK_BASE}/transaction/verify/${encodeURIComponent(ref)}`, {
    method: "GET",
    headers: { Authorization: `Bearer ${secret}` },
  });

  const body = await parseJsonBody(response);

  if (response.status !== 200 || !body.status) {
    const msg = body.message || "Paystack verify failed";
    const err = new Error(msg);
    err.status = 502;
    err.paystackResponse = body;
    throw err;
  }

  const d = body.data;
  if (d.status !== "success") {
    const err = new Error("Payment was not successful");
    err.status = 400;
    throw err;
  }
  if (d.currency !== "KES") {
    const err = new Error("Invalid payment currency");
    err.status = 400;
    throw err;
  }
  if (Number(d.amount) !== expectedAmount) {
    const err = new Error("Payment amount does not match selected package");
    err.status = 400;
    throw err;
  }

  const meta = parseMetadata(d.metadata);
  if (String(meta.package || "").toLowerCase() !== packageKey) {
    const err = new Error("Payment package does not match registration");
    err.status = 400;
    throw err;
  }
  if (String(meta.purpose || "") !== "organization_registration") {
    const err = new Error("Invalid payment purpose");
    err.status = 400;
    throw err;
  }
  if (options.expectedHospitalId) {
    const mid = meta.hospital_id != null ? String(meta.hospital_id) : "";
    if (!mid || mid !== String(options.expectedHospitalId)) {
      const err = new Error("Payment does not match this organization");
      err.status = 400;
      throw err;
    }
  }

  const payerEmail =
    (d.customer && d.customer.email) ||
    d.authorization?.customer?.email ||
    d.authorization?.customer_email ||
    "";
  const want = String(expectedEmail || "")
    .toLowerCase()
    .trim();
  if (want) {
    const payer = String(payerEmail).toLowerCase().trim();
    if (!payer || payer !== want) {
      const err = new Error("Payment email must match your registration email");
      err.status = 400;
      throw err;
    }
  }

  return d;
}

module.exports = {
  initializeRegistrationTransaction,
  verifyRegistrationTransaction,
};
