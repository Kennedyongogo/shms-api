/**
 * M-Pesa Daraja API service (fetch only, no axios).
 * Sandbox: https://sandbox.safaricom.co.ke
 */

const moment = require("moment");
require("dotenv").config();

const MPESA_BASE = process.env.MPESA_BASE_URL || "https://sandbox.safaricom.co.ke";

/** In-memory map: CheckoutRequestID -> bill_id (callback does not return AccountReference). Use Redis in production. */
const checkoutToBillId = new Map();

function resolveBaseUrl(config) {
  if (config?.baseUrl) return config.baseUrl;
  if (config?.environment === "production") return "https://api.safaricom.co.ke";
  return MPESA_BASE;
}

function resolveConsumerKey(config) {
  return config?.consumerKey || process.env.MPESA_CONSUMER_KEY || process.env.CONSUMER_KEY;
}

function resolveConsumerSecret(config) {
  return config?.consumerSecret || process.env.MPESA_CONSUMER_SECRET || process.env.CONSUMER_SECRET;
}

/**
 * Get OAuth access token for Daraja API.
 * @param {object} config - M-Pesa configuration (per hospital).
 * @returns {Promise<string>} access_token
 */
async function getAccessToken(config = null) {
  const consumerKey = resolveConsumerKey(config);
  const consumerSecret = resolveConsumerSecret(config);

  if (!consumerKey || !consumerSecret) {
    throw new Error("MPESA_CONSUMER_KEY and MPESA_CONSUMER_SECRET (or CONSUMER_KEY/CONSUMER_SECRET) are required");
  }

  const auth = Buffer.from(`${consumerKey}:${consumerSecret}`).toString("base64");
  const baseUrl = resolveBaseUrl(config);
  const url = `${baseUrl}/oauth/v1/generate?grant_type=client_credentials`;

  const response = await fetch(url, {
    method: "GET",
    headers: {
      Authorization: `Basic ${auth}`,
    },
  });

  if (!response.ok) {
    const text = await response.text();
    let errBody;
    try {
      errBody = JSON.parse(text);
    } catch {
      errBody = { error: text };
    }
    console.error("❌ M-Pesa token error:", errBody);
    throw new Error(errBody.errorMessage || errBody.error || response.statusText || "Failed to get access token");
  }

  const data = await response.json();
  if (!data.access_token) {
    throw new Error("No access_token in M-Pesa response");
  }

  console.log("✅ M-Pesa access token generated");
  return data.access_token;
}

/**
 * Send STK Push to customer phone.
 * @param {object} config - M-Pesa configuration (per hospital, optional; falls back to env when null)
 * @param {string} phone - e.g. 254708374149
 * @param {number} amount - amount in KES
 * @param {string} billId - bill id (UUID or reference) for AccountReference
 * @returns {Promise<object>} Daraja STK push response
 */
async function stkPush(config, phone, amount, billId) {
  const token = await getAccessToken(config);

  const shortcode = config?.shortcode || process.env.MPESA_BUSINESS_SHORTCODE || process.env.BUSINESS_SHORTCODE;
  const passkey = config?.passkey || process.env.MPESA_PASSKEY || process.env.PASSKEY;
  const callbackUrl = config?.callbackUrl || process.env.MPESA_CALLBACK_URL || process.env.CALLBACK_URL;

  if (!shortcode || !passkey || !callbackUrl) {
    throw new Error("MPESA_BUSINESS_SHORTCODE, MPESA_PASSKEY, and MPESA_CALLBACK_URL (or BUSINESS_SHORTCODE, PASSKEY, CALLBACK_URL) are required");
  }

  const timestamp = moment().format("YYYYMMDDHHmmss");
  const password = Buffer.from(`${shortcode}${passkey}${timestamp}`).toString("base64");

  const payload = {
    BusinessShortCode: String(shortcode),
    Password: password,
    Timestamp: timestamp,
    TransactionType: "CustomerPayBillOnline",
    Amount: Math.round(Number(amount)),
    PartyA: String(phone),
    PartyB: String(shortcode),
    PhoneNumber: String(phone),
    CallBackURL: callbackUrl,
    AccountReference: `BILL-${billId}`,
    TransactionDesc: "Hospital Bill Payment",
  };

  const baseUrl = resolveBaseUrl(config);
  const url = `${baseUrl}/mpesa/stkpush/v1/processrequest`;

  console.log("📤 Sending M-Pesa STK Push...");

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const text = await response.text().catch(() => "");
  let data;
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = {};
  }

  if (!response.ok) {
    console.error("❌ M-Pesa STK error:", {
      status: response.status,
      text,
      data,
    });
    const err = new Error(
      data.errorMessage || data.ResultDesc || response.statusText || "STK Push failed"
    );
    err.response = { status: response.status, data, text };
    throw err;
  }

  if (data.ResponseCode !== undefined && data.ResponseCode !== "0") {
    console.error("❌ M-Pesa STK response error:", {
      status: response.status,
      text,
      data,
    });
    const err = new Error(
      data.ResponseDescription || data.CustomerMessage || "STK Push rejected"
    );
    err.response = { status: response.status, data, text };
    throw err;
  }

  console.log("✅ M-Pesa STK Push sent:", data);

  if (data.CheckoutRequestID && billId) {
    checkoutToBillId.set(data.CheckoutRequestID, billId);
  }

  return data;
}

/**
 * Resolve bill_id from Daraja callback's CheckoutRequestID.
 * @param {string} checkoutRequestId
 * @returns {string|null} bill_id or null
 */
function getBillIdByCheckoutRequestId(checkoutRequestId) {
  const id = checkoutToBillId.get(checkoutRequestId);
  if (id) checkoutToBillId.delete(checkoutRequestId);
  return id || null;
}

module.exports = { getAccessToken, stkPush, getBillIdByCheckoutRequestId };
