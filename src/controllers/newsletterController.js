const nodemailer = require("nodemailer");
const path = require("path");
const { NewsletterSubscriber, NewsletterCampaign } = require("../models");
const config = require("../config/config");

const normalizeEmail = (email) => (email && typeof email === "string" ? email.trim().toLowerCase() : "");

const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

/** Public: subscribe with email (no auth) */
const subscribe = async (req, res) => {
  try {
    const raw = req.body.email != null ? req.body.email : req.query.email;
    const email = normalizeEmail(raw);
    if (!email) {
      return res.status(400).json({ success: false, message: "Email is required" });
    }
    if (!isValidEmail(email)) {
      return res.status(400).json({ success: false, message: "Invalid email address" });
    }

    const [subscriber, created] = await NewsletterSubscriber.findOrCreate({
      where: { email },
      defaults: { status: "subscribed" },
    });

    if (!created && subscriber.status === "subscribed") {
      return res.status(200).json({
        success: true,
        message: "Already subscribed",
        data: { id: subscriber.id, email: subscriber.email },
      });
    }
    if (!created && subscriber.status === "unsubscribed") {
      await subscriber.update({ status: "subscribed" });
      return res.status(200).json({
        success: true,
        message: "Re-subscribed successfully",
        data: { id: subscriber.id, email: subscriber.email },
      });
    }

    return res.status(201).json({
      success: true,
      message: "Subscribed successfully",
      data: { id: subscriber.id, email: subscriber.email },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Error subscribing to newsletter",
      error: error.message,
    });
  }
};

/** Auth: list all subscribers (optional status filter) */
const listSubscribers = async (req, res) => {
  try {
    const { status, page = 1, limit = 100 } = req.query;
    const where = {};
    if (status === "subscribed" || status === "unsubscribed") where.status = status;

    const offset = (Math.max(1, parseInt(page, 10) || 1) - 1);
    const limitNum = Math.min(500, Math.max(1, parseInt(limit, 10) || 100));

    const { count, rows } = await NewsletterSubscriber.findAndCountAll({
      where,
      order: [["createdAt", "DESC"]],
      offset: offset * limitNum,
      limit: limitNum,
      attributes: ["id", "email", "status", "createdAt"],
    });

    return res.status(200).json({
      success: true,
      data: rows,
      pagination: {
        total: count,
        page: offset + 1,
        limit: limitNum,
        totalPages: Math.ceil(count / limitNum) || 1,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Error listing subscribers",
      error: error.message,
    });
  }
};

/** Admin auth: list only active subscribed users */
const listSubscribedUsers = async (req, res) => {
  try {
    const { page = 1, limit = 100 } = req.query;
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(500, Math.max(1, parseInt(limit, 10) || 100));
    const offset = (pageNum - 1) * limitNum;

    const { count, rows } = await NewsletterSubscriber.findAndCountAll({
      where: { status: "subscribed" },
      order: [["createdAt", "DESC"]],
      offset,
      limit: limitNum,
      attributes: ["id", "email", "status", "createdAt"],
    });

    return res.status(200).json({
      success: true,
      data: rows,
      pagination: {
        total: count,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(count / limitNum) || 1,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Error fetching subscribed users",
      error: error.message,
    });
  }
};

/** Auth: get emails only (for export / future send integration) */
const getSubscriberEmails = async (req, res) => {
  try {
    const subscribers = await NewsletterSubscriber.findAll({
      where: { status: "subscribed" },
      attributes: ["email"],
      order: [["email", "ASC"]],
    });
    const emails = subscribers.map((s) => s.email);
    return res.status(200).json({
      success: true,
      data: { emails, count: emails.length },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Error fetching subscriber emails",
      error: error.message,
    });
  }
};

function chunkArray(arr, chunkSize) {
  const out = [];
  for (let i = 0; i < arr.length; i += chunkSize) out.push(arr.slice(i, i + chunkSize));
  return out;
}

function createEmailTransporter() {
  const emailCfg = config?.emailService || {};
  const providerRaw = emailCfg.provider ? String(emailCfg.provider).trim() : "";
  const user = emailCfg.user ? String(emailCfg.user).trim() : "";
  const pass = emailCfg.pass ? String(emailCfg.pass) : "";

  if (!providerRaw || !user || !pass) {
    const msg = "Email service is not configured. Set EMAIL_SERVICE, EMAIL_USER, and EMAIL_PASS.";
    const err = new Error(msg);
    err.statusCode = 500;
    throw err;
  }

  const provider = providerRaw.toLowerCase();
  let host = null;
  let port = 587;
  let secure = false;

  // Friendly aliases for common providers
  if (provider === "gmail" || provider === "gmail.com") {
    host = "smtp.gmail.com";
    port = 465;
    secure = true;
  } else if (provider === "outlook" || provider === "office365" || provider === "office365.com") {
    host = "smtp.office365.com";
    port = 587;
    secure = false;
  } else if (provider.includes(":")) {
    // Allow formats like "smtp.yourhost.com:465"
    const [h, p] = provider.split(":");
    host = h;
    port = parseInt(p, 10);
    secure = port === 465;
  } else if (provider.startsWith("smtp.")) {
    host = provider;
    port = 587;
    secure = false;
  } else {
    // Fallback: if they passed something like "smtp.yourhost.com" without port.
    host = providerRaw;
    port = 587;
    secure = false;
  }

  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass },
  });
}

/**
 * Auth: "Send" newsletter now (uploads optional Word/PDF attachment).
 * Immediately sends to all `newsletter_subscribers.status = subscribed`.
 */
const sendNewsletter = async (req, res) => {
  try {
    const { subject, body } = req.body;
    if (!subject || typeof subject !== "string" || !subject.trim()) {
      return res.status(400).json({ success: false, message: "Subject is required" });
    }

    const subscribers = await NewsletterSubscriber.findAll({
      where: { status: "subscribed" },
      attributes: ["id", "email"],
      order: [["email", "ASC"]],
    });

    const emails = subscribers.map((s) => s.email).filter(Boolean);
    const recipientCount = emails.length;

    if (!recipientCount) {
      return res.status(200).json({
        success: true,
        message: "No subscribed users found.",
        data: { recipientCount: 0 },
      });
    }

    const transporter = createEmailTransporter();
    const sender = String(config?.emailService?.user || "");

    const trimmedBody = body != null ? String(body).trim() : "";
    const mailBody = trimmedBody || "Hello,\n\nPlease find the attached newsletter.\n\nRegards";

    const attachment =
      req.file && req.file.path
        ? [
            {
              filename: req.file.originalname || path.basename(req.file.path),
              path: req.file.path,
            },
          ]
        : undefined;

    const toBccChunks = chunkArray(emails, 50);
    let sentChunks = 0;
    let failedChunks = 0;
    const errors = [];

    for (const chunk of toBccChunks) {
      try {
        const mailOptions = {
          from: sender,
          to: sender,
          bcc: chunk,
          subject: subject.trim(),
          text: mailBody,
          attachments: attachment,
        };

        await transporter.sendMail(mailOptions);
        sentChunks += 1;
      } catch (e) {
        failedChunks += 1;
        errors.push(e?.message || String(e));
      }
    }

    const campaign = await NewsletterCampaign.create({
      subject: subject.trim(),
      body: trimmedBody || null,
      sent_at: failedChunks === 0 ? new Date() : sentChunks > 0 ? new Date() : null,
      recipient_count: recipientCount,
    });

    return res.status(200).json({
      success: true,
      message: failedChunks === 0 ? "Newsletter sent successfully." : "Newsletter partially sent.",
      data: {
        campaignId: campaign.id,
        recipientCount,
        sentChunks,
        failedChunks,
        errors: errors.length ? errors.slice(0, 5) : undefined,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Error sending newsletter",
      error: error.message,
    });
  }
};

/** Auth: list past campaigns */
const listCampaigns = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const offset = (Math.max(1, parseInt(page, 10) || 1) - 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));

    const { count, rows } = await NewsletterCampaign.findAndCountAll({
      order: [["createdAt", "DESC"]],
      offset: offset * limitNum,
      limit: limitNum,
      attributes: ["id", "subject", "recipient_count", "sent_at", "createdAt"],
    });

    return res.status(200).json({
      success: true,
      data: rows,
      pagination: {
        total: count,
        page: offset + 1,
        limit: limitNum,
        totalPages: Math.ceil(count / limitNum) || 1,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Error listing campaigns",
      error: error.message,
    });
  }
};

/** Auth: unsubscribe by id (admin) or by email (could be public with token later) */
const unsubscribe = async (req, res) => {
  try {
    const { id } = req.params;
    const subscriber = await NewsletterSubscriber.findByPk(id);
    if (!subscriber) {
      return res.status(404).json({ success: false, message: "Subscriber not found" });
    }
    await subscriber.update({ status: "unsubscribed" });
    return res.status(200).json({
      success: true,
      message: "Unsubscribed",
      data: { id: subscriber.id, email: subscriber.email },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Error unsubscribing",
      error: error.message,
    });
  }
};

module.exports = {
  subscribe,
  listSubscribers,
  listSubscribedUsers,
  getSubscriberEmails,
  sendNewsletter,
  listCampaigns,
  unsubscribe,
};
