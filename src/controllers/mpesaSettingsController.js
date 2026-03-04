const { MpesaSetting } = require("../models");
const { getHospitalId } = require("../utils/hospitalScope");
const { getAccessToken } = require("../services/mpesaService");

function sanitize(setting) {
  if (!setting) return null;
  const plain = setting.get({ plain: true });
  delete plain.consumer_secret;
  delete plain.passkey;
  return {
    ...plain,
    has_credentials: Boolean(
      setting.consumer_key && setting.consumer_secret && setting.passkey && setting.shortcode
    ),
  };
}

const getCurrentSettings = async (req, res) => {
  try {
    const hospitalId = getHospitalId(req);
    if (!hospitalId) {
      return res.status(400).json({
        success: false,
        message: "You must belong to a hospital to view M-Pesa settings.",
      });
    }
    const setting = await MpesaSetting.findOne({ where: { hospital_id: hospitalId } });
    return res.status(200).json({
      success: true,
      data: sanitize(setting),
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Error fetching M-Pesa settings",
      error: error.message,
    });
  }
};

const upsertCurrentSettings = async (req, res) => {
  try {
    const hospitalId = getHospitalId(req);
    if (!hospitalId) {
      return res.status(400).json({
        success: false,
        message: "You must belong to a hospital to update M-Pesa settings.",
      });
    }

    const {
      shortcode,
      consumer_key,
      consumer_secret,
      passkey,
      environment = "sandbox",
      payment_type = "paybill",
      callback_url,
      is_active = true,
    } = req.body || {};

    if (!shortcode || !consumer_key || !consumer_secret || !passkey) {
      return res.status(400).json({
        success: false,
        message: "shortcode, consumer_key, consumer_secret, and passkey are required",
      });
    }

    const env = String(environment).toLowerCase();
    if (!["sandbox", "production"].includes(env)) {
      return res.status(400).json({
        success: false,
        message: "environment must be 'sandbox' or 'production'",
      });
    }

    const pType = String(payment_type).toLowerCase();
    if (!["paybill", "till"].includes(pType)) {
      return res.status(400).json({
        success: false,
        message: "payment_type must be 'paybill' or 'till'",
      });
    }

    let setting = await MpesaSetting.findOne({ where: { hospital_id: hospitalId } });
    if (!setting) {
      setting = await MpesaSetting.create({
        hospital_id: hospitalId,
        shortcode,
        consumer_key,
        consumer_secret,
        passkey,
        environment: env,
        payment_type: pType,
        callback_url: callback_url || null,
        is_active: Boolean(is_active),
      });
    } else {
      await setting.update({
        shortcode,
        consumer_key,
        consumer_secret,
        passkey,
        environment: env,
        payment_type: pType,
        callback_url: callback_url || null,
        is_active: Boolean(is_active),
      });
    }

    return res.status(200).json({
      success: true,
      message: "M-Pesa settings saved.",
      data: sanitize(setting),
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Error saving M-Pesa settings",
      error: error.message,
    });
  }
};

const testCurrentSettings = async (req, res) => {
  try {
    const hospitalId = getHospitalId(req);
    if (!hospitalId) {
      return res.status(400).json({
        success: false,
        message: "You must belong to a hospital to test M-Pesa settings.",
      });
    }

    const setting = await MpesaSetting.findOne({ where: { hospital_id: hospitalId, is_active: true } });
    if (!setting) {
      return res.status(400).json({
        success: false,
        message: "M-Pesa is not configured for this hospital.",
      });
    }

    const config = {
      consumerKey: setting.consumer_key,
      consumerSecret: setting.consumer_secret,
      environment: setting.environment || "sandbox",
    };

    await getAccessToken(config);

    return res.status(200).json({
      success: true,
      message: "M-Pesa credentials are valid (access token generated).",
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: "Failed to connect to M-Pesa with these credentials.",
      error: error.message,
    });
  }
};

module.exports = {
  getCurrentSettings,
  upsertCurrentSettings,
  testCurrentSettings,
};

