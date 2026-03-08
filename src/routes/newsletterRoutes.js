const express = require("express");
const newsletterController = require("../controllers/newsletterController");
const { authenticateUser } = require("../middleware/auth");

const router = express.Router();

// Public
router.post("/subscribe", newsletterController.subscribe);

// Auth: subscribers
router.get("/subscribers", authenticateUser, newsletterController.listSubscribers);
router.get("/subscribers/emails", authenticateUser, newsletterController.getSubscriberEmails);
router.patch("/subscribers/:id/unsubscribe", authenticateUser, newsletterController.unsubscribe);

// Auth: send newsletter (creates campaign, returns recipients; no email sent until provider is added)
router.post("/send", authenticateUser, newsletterController.sendNewsletter);
router.get("/campaigns", authenticateUser, newsletterController.listCampaigns);

module.exports = router;
