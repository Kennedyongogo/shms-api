const express = require("express");
const path = require("path");
const cors = require("cors");
const fs = require("fs");
const bcrypt = require("bcryptjs");
const nodemailer = require("nodemailer");

const { initializeModels, setupAssociations } = require("./models");
const { AdminUser } = require("./models");
const { errorHandler } = require("./middleware/errorHandler");
const { initializeChatbot } = require("./controllers/chatbotController");

// Import all routes
const adminUserRoutes = require("./routes/adminUserRoutes");
const documentRoutes = require("./routes/documentRoutes");
const auditTrailRoutes = require("./routes/auditTrailRoutes");
const analyticsRoutes = require("./routes/analyticsRoutes");
const chatbotRoutes = require("./routes/chatbotRoutes");
const reviewRoutes = require("./routes/reviewRoutes");
const blogRoutes = require("./routes/blogRoutes");
const memberRoutes = require("./routes/memberRoutes");
const interestGalleryRoutes = require("./routes/interestGalleryRoutes");
const uploadRoutes = require("./routes/uploadRoutes");
const formRoutes = require("./routes/formRoutes");
const formFieldRoutes = require("./routes/formFieldRoutes");
const serviceRoutes = require("./routes/serviceRoutes");
const projectRoutes = require("./routes/projectRoutes");
const faqRoutes = require("./routes/faqRoutes");
const contactRoutes = require("./routes/contactRoutes");
const quoteRoutes = require("./routes/quoteRoutes");
const consultationRoutes = require("./routes/consultationRoutes");
const newsletterRoutes = require("./routes/newsletterRoutes");
const marketplaceAuthRoutes = require("./routes/marketplaceAuthRoutes");
const marketplaceProfileRoutes = require("./routes/marketplaceProfileRoutes");
const marketplaceListingRoutes = require("./routes/marketplaceListingRoutes");
const trainingEventRoutes = require("./routes/trainingEventRoutes");
const grantRoutes = require("./routes/grantRoutes");
const partnerRoutes = require("./routes/partnerRoutes");
const trainingRegistrationRoutes = require("./routes/trainingRegistrationRoutes");
const grantApplicationRoutes = require("./routes/grantApplicationRoutes");
const mapRoutes = require("./routes/mapRoutes");

const app = express();

// Middleware
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));
app.use(cors());

// Static file serving
const profilesUploadPath = path.join(__dirname, "..", "uploads", "profiles");
const documentsUploadPath = path.join(__dirname, "..", "uploads", "documents");
const authorsUploadPath = path.join(__dirname, "..", "uploads", "authors");
const interestGalleryUploadPath = path.join(__dirname, "..", "uploads", "interest-gallery");
const miscUploadPath = path.join(__dirname, "..", "uploads", "misc");
const postsUploadPath = path.join(__dirname, "..", "uploads", "posts");
const servicesUploadPath = path.join(__dirname, "..", "uploads", "services");
const projectsUploadPath = path.join(__dirname, "..", "uploads", "projects");
const marketplaceProfilesUploadPath = path.join(__dirname, "..", "uploads", "marketplace-profiles");
const trainingEventsUploadPath = path.join(__dirname, "..", "uploads", "training-events");
const grantsUploadPath = path.join(__dirname, "..", "uploads", "grants");
const partnersUploadPath = path.join(__dirname, "..", "uploads", "partners");
const marketplaceListingsUploadPath = path.join(__dirname, "..", "uploads", "marketplace-listings");

console.log("📁 Upload Paths:");
console.log(
  "  - Profiles:",
  profilesUploadPath,
  "- Exists:",
  fs.existsSync(profilesUploadPath)
);
console.log(
  "  - Documents:",
  documentsUploadPath,
  "- Exists:",
  fs.existsSync(documentsUploadPath)
);
console.log(
  "  - Authors:",
  authorsUploadPath,
  "- Exists:",
  fs.existsSync(authorsUploadPath)
);
console.log(
  "  - Interest Gallery:",
  interestGalleryUploadPath,
  "- Exists:",
  fs.existsSync(interestGalleryUploadPath)
);
console.log(
  "  - Misc:",
  miscUploadPath,
  "- Exists:",
  fs.existsSync(miscUploadPath)
);
console.log(
  "  - Posts:",
  postsUploadPath,
  "- Exists:",
  fs.existsSync(postsUploadPath)
);
console.log(
  "  - Services:",
  servicesUploadPath,
  "- Exists:",
  fs.existsSync(servicesUploadPath)
);

// Serve static files
app.use("/uploads/profiles", express.static(profilesUploadPath));
app.use("/uploads/documents", express.static(documentsUploadPath));
app.use("/uploads/authors", express.static(authorsUploadPath));
app.use("/uploads/interest-gallery", express.static(interestGalleryUploadPath));
app.use("/uploads/misc", express.static(miscUploadPath));
app.use("/uploads/posts", express.static(postsUploadPath));
app.use("/uploads/services", express.static(servicesUploadPath));
app.use("/uploads/projects", express.static(projectsUploadPath));
app.use("/uploads/marketplace-profiles", express.static(marketplaceProfilesUploadPath));
app.use("/uploads/training-events", express.static(trainingEventsUploadPath));
app.use("/uploads/grants", express.static(grantsUploadPath));
app.use("/uploads/partners", express.static(partnersUploadPath));
app.use("/uploads/marketplace-listings", express.static(marketplaceListingsUploadPath));

// API routes
console.log("🔗 Registering API routes...");

app.use("/api/reviews", reviewRoutes);
console.log("✅ /api/reviews route registered");

app.use("/api/blogs", blogRoutes);
console.log("✅ /api/blogs route registered");

app.use("/api/admin-users", adminUserRoutes);
console.log("✅ /api/admin-users route registered");

app.use("/api/documents", documentRoutes);
console.log("✅ /api/documents route registered");

app.use("/api/audit-trail", auditTrailRoutes);
console.log("✅ /api/audit-trail route registered");

app.use("/api/analytics", analyticsRoutes);
console.log("✅ /api/analytics route registered");

app.use("/api/chatbot", chatbotRoutes);
console.log("✅ /api/chatbot route registered");

app.use("/api/members", memberRoutes);
console.log("✅ /api/members route registered");

app.use("/api/interest-gallery", interestGalleryRoutes);
app.use("/api/uploads", uploadRoutes);
app.use("/api/forms", formRoutes);
app.use("/api/form-fields", formFieldRoutes);
app.use("/api/services", serviceRoutes);
console.log("✅ /api/services route registered");

app.use("/api/projects", projectRoutes);
console.log("✅ /api/projects route registered");

app.use("/api/faqs", faqRoutes);
console.log("✅ /api/faqs route registered");

app.use("/api/contact", contactRoutes);
console.log("✅ /api/contact route registered");

app.use("/api/quote", quoteRoutes);
console.log("✅ /api/quote route registered");

app.use("/api/consultation", consultationRoutes);
console.log("✅ /api/consultation route registered");

app.use("/api/newsletter", newsletterRoutes);
console.log("✅ /api/newsletter route registered");

app.use("/api/marketplace/auth", marketplaceAuthRoutes);
app.use("/api/marketplace", marketplaceProfileRoutes);
app.use("/api/marketplace", marketplaceListingRoutes);
console.log("✅ /api/marketplace (auth + profile + listings) routes registered");

app.use("/api/training-events", trainingEventRoutes);
console.log("✅ /api/training-events route registered");

app.use("/api/grants", grantRoutes);
console.log("✅ /api/grants route registered");

app.use("/api/partners", partnerRoutes);
console.log("✅ /api/partners route registered");

app.use("/api/training-registrations", trainingRegistrationRoutes);
console.log("✅ /api/training-registrations route registered");

app.use("/api/grant-applications", grantApplicationRoutes);
console.log("✅ /api/grant-applications route registered");

app.use("/api/map", mapRoutes);
console.log("✅ /api/map route registered");

// Forgot password endpoint
app.post("/api/auth/forgot", async (req, res) => {
  try {
    const { Email } = req.body;

    if (!Email) {
      return res.status(400).json({
        success: false,
        error: "Email is required",
      });
    }

    // Find admin by email
    const admin = await AdminUser.findOne({ where: { email: Email } });
    if (!admin) {
      return res.status(404).json({
        success: false,
        error: "No account found with this email address",
      });
    }

    // Generate a new random password (8 characters)
    const newPassword = Math.random().toString(36).slice(-8);
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update admin password
    await admin.update({ password: hashedPassword });

    // Send email with new password
    try {
      // Create transporter (using Gmail SMTP)
      const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
          user: "ongogokennedy89@gmail.com", // Your Gmail
          pass: "mnfj zxio cgxw zefv", // Your Gmail App Password
        },
      });

      // Email content
      const mailOptions = {
        from: "ongogokennedy89@gmail.com", // Your Gmail
        to: Email,
        subject: "Password Reset - Mwalimu Hope Foundation Admin Portal",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #333;">Password Reset Request</h2>
            <p>Hello ${admin.full_name},</p>
            <p>Your password has been reset for the Mwalimu Hope Foundation Admin Portal.</p>
            <div style="background-color: #f5f5f5; padding: 20px; border-radius: 5px; margin: 20px 0;">
              <h3 style="color: #666; margin-top: 0;">Your New Login Credentials:</h3>
              <p><strong>Email:</strong> ${Email}</p>
              <p><strong>New Password:</strong> <code style="background-color: #e9e9e9; padding: 2px 6px; border-radius: 3px;">${newPassword}</code></p>
            </div>
            <p>Please login with these credentials and change your password immediately for security reasons.</p>
            <p>If you did not request this password reset, please contact the administrator immediately.</p>
            <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
            <p style="color: #666; font-size: 12px;">This is an automated message from Mwalimu Hope Foundation Admin Portal.</p>
          </div>
        `,
      };

      // Send email
      await transporter.sendMail(mailOptions);
    } catch (emailError) {
      // Don't fail the request if email fails, just log it silently
    }

    res.status(200).json({
      success: true,
      message: "Password reset email sent",
    });
  } catch (error) {
    console.error("Error in forgot password:", error);
    res.status(500).json({
      success: false,
      error: "Error processing password reset",
    });
  }
});
console.log("✅ /api/auth/forgot route registered");

console.log("✅ All API routes registered");

// Health check endpoint
app.get("/api/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "API is running",
    timestamp: new Date().toISOString(),
    version: "1.0.0",
  });
});

// 404 handler for API routes (must be after all other routes)
app.use((req, res, next) => {
  if (req.path.startsWith("/api/")) {
    return res.status(404).json({
      success: false,
      message: "API endpoint not found",
      path: req.originalUrl,
    });
  }
  next();
});

// Error handling middleware (must be last)
app.use(errorHandler);

// Create upload directories if they don't exist
const createUploadDirectories = () => {
  const uploadDirs = [
    path.join(__dirname, "..", "uploads"),
    path.join(__dirname, "..", "uploads", "profiles"),
    path.join(__dirname, "..", "uploads", "documents"),
    path.join(__dirname, "..", "uploads", "interest-gallery"),
    path.join(__dirname, "..", "uploads", "misc"),
    path.join(__dirname, "..", "uploads", "marketplace-profiles"),
    path.join(__dirname, "..", "uploads", "training-events"),
    path.join(__dirname, "..", "uploads", "grants"),
    path.join(__dirname, "..", "uploads", "partners"),
    path.join(__dirname, "..", "uploads", "marketplace-listings"),
  ];

  uploadDirs.forEach((dir) => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      console.log(`📁 Created upload directory: ${dir}`);
    }
  });
};

// Initialize models and associations
const initializeApp = async () => {
  try {
    console.log("🚀 Initializing application...");

    // Create upload directories
    createUploadDirectories();
    console.log("✅ Upload directories ready");

    // Initialize database models
    await initializeModels();
    console.log("✅ Database models initialized");

    // Setup model associations
    setupAssociations();
    console.log("✅ Model associations configured");

    // Initialize chatbot
    initializeChatbot();
    console.log("✅ Chatbot initialized");

    console.log("✅ Application initialized successfully");
    return true;
  } catch (error) {
    console.error("❌ Error initializing application:", error);
    console.error("❌ Full error details:", {
      name: error.name,
      message: error.message,
      stack: error.stack,
      parent: error.parent?.message,
      original: error.original?.message,
    });
    throw error;
  }
};

// Export the initialization promise
const appInitialized = initializeApp();

module.exports = { app, appInitialized };
