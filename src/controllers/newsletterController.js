const { NewsletterSubscriber, NewsletterCampaign } = require("../models");

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

/**
 * Auth: "Send" newsletter – creates a campaign and returns recipient list.
 * No email is sent until you plug in a provider (SendGrid, Nodemailer, etc.).
 * When you add email setup, use this payload to actually send and then set sent_at.
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
    const emails = subscribers.map((s) => s.email);
    const recipientCount = emails.length;

    const campaign = await NewsletterCampaign.create({
      subject: subject.trim(),
      body: body != null ? String(body).trim() : null,
      sent_at: null,
      recipient_count: recipientCount,
    });

    // When you add an email provider:
    // - Loop emails and send (or use BCC)
    // - Then: await campaign.update({ sent_at: new Date() });

    return res.status(201).json({
      success: true,
      message: "Newsletter campaign created. Recipients listed below. No emails sent until email provider is configured.",
      data: {
        campaignId: campaign.id,
        subject: campaign.subject,
        recipientCount,
        recipients: emails,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Error creating newsletter campaign",
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
  getSubscriberEmails,
  sendNewsletter,
  listCampaigns,
  unsubscribe,
};
