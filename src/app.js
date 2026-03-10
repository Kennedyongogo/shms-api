const express = require("express");
const path = require("path");
const cors = require("cors");
const fs = require("fs");

const { initializeModels, setupAssociations } = require("./models");
const { errorHandler } = require("./middleware/errorHandler");
const { authenticateUser, requireRoles } = require("./middleware/auth");

// Hospital routes (38)
const authRoutes = require("./routes/authRoutes");
const patientAuthRoutes = require("./routes/patientAuthRoutes");
const userRoutes = require("./routes/userRoutes");
const roleRoutes = require("./routes/roleRoutes");

const hospitalRoutes = require("./routes/hospitalRoutes");
const departmentRoutes = require("./routes/departmentRoutes");
const wardRoutes = require("./routes/wardRoutes");
const bedRoutes = require("./routes/bedRoutes");

const staffRoutes = require("./routes/staffRoutes");
const scheduleRoutes = require("./routes/scheduleRoutes");

const patientRoutes = require("./routes/patientRoutes");
const medicalHistoryRoutes = require("./routes/medicalHistoryRoutes");
const allergyRoutes = require("./routes/allergyRoutes");

const appointmentRoutes = require("./routes/appointmentRoutes");
const consultationRoutes = require("./routes/consultationRoutes");
const vitalSignsRoutes = require("./routes/vitalSignsRoutes");

const labTestRoutes = require("./routes/labTestRoutes");
const labOrderRoutes = require("./routes/labOrderRoutes");
const labResultRoutes = require("./routes/labResultRoutes");

const medicationRoutes = require("./routes/medicationRoutes");
const prescriptionRoutes = require("./routes/prescriptionRoutes");
const dispenseRoutes = require("./routes/dispenseRoutes");

const inventoryRoutes = require("./routes/inventoryRoutes");
const inventoryTransactionRoutes = require("./routes/inventoryTransactionRoutes");
const supplierRoutes = require("./routes/supplierRoutes");
const purchaseOrderRoutes = require("./routes/purchaseOrderRoutes");

const billingRoutes = require("./routes/billingRoutes");
const paymentRoutes = require("./routes/paymentRoutes");
const mpesaRoutes = require("./routes/mpesaRoutes");
const mpesaSettingsRoutes = require("./routes/mpesaSettingsRoutes");
const insuranceRoutes = require("./routes/insuranceRoutes");

const admissionRoutes = require("./routes/admissionRoutes");
const nursingRoutes = require("./routes/nursingRoutes");
const dietTypeRoutes = require("./routes/dietTypeRoutes");
const patientDietOrderRoutes = require("./routes/patientDietOrderRoutes");
const mealPlanRoutes = require("./routes/mealPlanRoutes");
const mealDeliveryLogRoutes = require("./routes/mealDeliveryLogRoutes");
const mealRoundRoutes = require("./routes/mealRoundRoutes");
const medicalReportRoutes = require("./routes/medicalReportRoutes");

const serviceRoutes = require("./routes/serviceRoutes");

const newsRoutes = require("./routes/newsRoutes");
const eventRoutes = require("./routes/eventRoutes");
const eventRegistrationRoutes = require("./routes/eventRegistrationRoutes");
const liveDemoVideoRoutes = require("./routes/liveDemoVideoRoutes");
const testimonialRoutes = require("./routes/testimonialRoutes");
const newsletterRoutes = require("./routes/newsletterRoutes");
const carlvyneAccountRoutes = require("./routes/carlvyneAccountRoutes");
const carlvyneAuthRoutes = require("./routes/carlvyneAuthRoutes");

const notificationRoutes = require("./routes/notificationRoutes");
const reportRoutes = require("./routes/reportRoutes");
const auditRoutes = require("./routes/auditRoutes");
const statisticsRoutes = require("./routes/statisticsRoutes");
const settingsRoutes = require("./routes/settingsRoutes");
const subscriptionRoutes = require("./routes/subscriptionRoutes");

const app = express();

// Middleware
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));
app.use(cors());

// Static file serving
const uploadsRoot = path.join(__dirname, "..", "uploads");
app.use("/uploads", express.static(uploadsRoot));

// API routes
console.log("🔗 Registering API routes...");
app.use("/api/auth", authRoutes);
app.use("/api/subscription", subscriptionRoutes);
app.use("/api/patient-auth", patientAuthRoutes);
// Users/Roles: any authenticated user can view (GET); only Super Admin can modify (enforced inside route files)
app.use("/api/users", authenticateUser, userRoutes);
app.use("/api/roles", authenticateUser, roleRoutes);

// Hospitals/Staff: allow authenticated users to view (GET); Super Admin-only modifications enforced in route files
app.use("/api/hospitals", authenticateUser, hospitalRoutes);
// Departments: allow authenticated users to view (GET); Super Admin-only modifications enforced in route files
app.use("/api/departments", authenticateUser, departmentRoutes);
app.use("/api/wards", authenticateUser, wardRoutes);
app.use("/api/beds", authenticateUser, bedRoutes);

app.use("/api/staff", authenticateUser, staffRoutes);
app.use("/api/schedules", authenticateUser, scheduleRoutes);

app.use("/api/patients", authenticateUser, patientRoutes);
app.use("/api/patient-medical-history", authenticateUser, medicalHistoryRoutes);
app.use("/api/patient-allergies", authenticateUser, allergyRoutes);

app.use("/api/appointments", authenticateUser, appointmentRoutes);
app.use("/api/consultations", authenticateUser, consultationRoutes);
app.use("/api/vital-signs", authenticateUser, vitalSignsRoutes);

app.use("/api/lab-tests", authenticateUser, labTestRoutes);
app.use("/api/lab-orders", authenticateUser, labOrderRoutes);
app.use("/api/lab-results", authenticateUser, labResultRoutes);

app.use("/api/medications", authenticateUser, medicationRoutes);
app.use("/api/prescriptions", authenticateUser, prescriptionRoutes);
app.use("/api/dispense", authenticateUser, dispenseRoutes);

app.use("/api/inventory", authenticateUser, inventoryRoutes);
app.use("/api/inventory-transactions", authenticateUser, inventoryTransactionRoutes);
app.use("/api/suppliers", authenticateUser, supplierRoutes);
app.use("/api/purchase-orders", authenticateUser, purchaseOrderRoutes);

app.use("/api/billing", authenticateUser, billingRoutes);
app.use("/api/payments", authenticateUser, paymentRoutes);
app.use("/api/mpesa", mpesaRoutes);
app.use("/api/mpesa-settings", authenticateUser, mpesaSettingsRoutes);
app.use("/api/insurance-claims", authenticateUser, insuranceRoutes);

app.use("/api/admissions", authenticateUser, admissionRoutes);
app.use("/api/nursing-notes", authenticateUser, nursingRoutes);
app.use("/api/diet-types", authenticateUser, dietTypeRoutes);
app.use("/api/patient-diet-orders", authenticateUser, patientDietOrderRoutes);
app.use("/api/meal-plans", authenticateUser, mealPlanRoutes);
app.use("/api/meal-delivery-logs", authenticateUser, mealDeliveryLogRoutes);
app.use("/api/meal-rounds", authenticateUser, mealRoundRoutes);
app.use("/api/medical-reports", authenticateUser, medicalReportRoutes);

app.use("/api/services", serviceRoutes);

app.use("/api/news", newsRoutes);
app.use("/api/events", eventRoutes);
app.use("/api/event-registrations", eventRegistrationRoutes);
app.use("/api/live-demo-videos", liveDemoVideoRoutes);
app.use("/api/testimonials", testimonialRoutes);
app.use("/api/newsletter", newsletterRoutes);
app.use("/api/carlvyne-accounts", carlvyneAccountRoutes);
app.use("/api/carlvyne-auth", carlvyneAuthRoutes);

app.use("/api/notifications", authenticateUser, notificationRoutes);
app.use("/api/reports", authenticateUser, reportRoutes);
app.use("/api/audit-logs", authenticateUser, auditRoutes);
app.use("/api/statistics", authenticateUser, statisticsRoutes);
app.use("/api/settings", authenticateUser, requireRoles(["Super Admin"]), settingsRoutes);

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

// Public AI assistant for pre-login and logged-in users (no authentication required)
// Rich system context so the model gives accurate answers about this SHMS.
const AI_SYSTEM_CONTEXT = `
You are the AI assistant for Carlvyne Smart Health Management System (Carlvyne SHMS). Answer only from the facts below.

=== EXACT MODULES AND NAVIGATION (use these names and paths) ===
- Dashboard: /dashboard — overview and quick stats.
- Hospital: /hospitals — manage hospital(s) and organization (Super Admin).
- Appointments: /appointments — list and manage appointments. To record a consultation: go to Appointments then "Record consultation" or /appointments/record-consultation. View a consultation: /appointments/consultation/:id.
- Patients: /patients — patient list and records. Patient reports: /patients/:patientId/reports.
- Laboratory: /laboratory — lab tests, orders, and results.
- Pharmacy: /pharmacy — medications, prescriptions, dispensing.
- Ward & Admissions: /ward — wards, beds, admissions.
- Diet & Meals: /diet — diet types, patient diet orders, meal plans, meal delivery.
- Inventory: /inventory — inventory items, transactions, suppliers, purchase orders.
- Billing & Payments: /billing — bills, payments, insurance claims (M-Pesa supported).
- Users & Roles: /users — staff users, roles, and which navbar menu items each role can see.
- Audit log: /audit-logs — system audit trail.
- Settings: /settings — system settings (Super Admin).
- Account: /account — own profile (after login).

=== HOW USERS ACCESS THE SYSTEM ===
- Before login: public site has Sign in, Register, Forgot password. Register creates an organization (hospital) and a Super Admin user for that organization.
- After login: sidebar shows only the menu items allowed for the user's role (e.g. Silver package: dashboard, hospitals, patients, appointments, laboratory, pharmacy, billing, users, settings; Gold adds ward, diet, inventory, audit-logs).
- Do NOT invent menu names or URLs; use only the ones listed above.

=== RULES ===
- You do NOT see or access any real patient data, appointments, or records; say they must log in to see their own data.
- For medical emergencies, tell the user to seek immediate medical care or call emergency services.
- If asked about something not in this system (e.g. another product), say you only know about Carlvyne SHMS.
- Be concise and friendly. Answer in 2–4 short sentences when possible.
`;

async function getAiContextFromDb() {
  try {
    const { Department } = require("./models");
    const rows = await Department.findAll({
      attributes: ["name"],
      limit: 25,
      order: [["name", "ASC"]],
    });
    if (rows && rows.length > 0) {
      const names = [...new Set(rows.map((r) => r.name).filter(Boolean))];
      if (names.length > 0) {
        return `\n=== SAMPLE DEPARTMENTS IN THIS SYSTEM (from database) ===\n${names.join(", ")}\n`;
      }
    }
  } catch (err) {
    // ignore
  }
  return "";
}

app.post("/api/ai/guest-chat", async (req, res) => {
  try {
    const { message } = req.body || {};

    if (!message || typeof message !== "string" || !message.trim()) {
      return res.status(400).json({
        success: false,
        message: "Message is required",
      });
    }

    const dbContext = await getAiContextFromDb();
    const systemPrompt = `${AI_SYSTEM_CONTEXT}${dbContext}

User question: ${message}

Answer based only on the system information above.`;

    const ollamaResponse = await fetch("http://localhost:11434/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "llama3.2:3b",
        prompt: systemPrompt,
        stream: false,
        options: {
          temperature: 0.3,
          num_predict: 400,
        },
      }),
    });

    if (!ollamaResponse.ok) {
      throw new Error(`Ollama HTTP ${ollamaResponse.status}`);
    }

    const ollamaData = await ollamaResponse.json();
    const aiText = ollamaData?.response || "";

    if (!aiText) {
      return res.status(502).json({
        success: false,
        message: "AI service returned an empty response",
      });
    }

    return res.status(200).json({
      success: true,
      message: aiText,
    });
  } catch (error) {
    console.error("❌ Guest AI chat error:", error);

    return res.status(500).json({
      success: false,
      message: "AI service unavailable. Please try again later.",
    });
  }
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
    path.join(__dirname, "..", "uploads", "misc"),
    path.join(__dirname, "..", "uploads", "services"),
    path.join(__dirname, "..", "uploads", "hospitals"),
    path.join(__dirname, "..", "uploads", "medical-attachments"),
    path.join(__dirname, "..", "uploads", "users", "profile-images"),
    path.join(__dirname, "..", "uploads", "events", "banners"),
    path.join(__dirname, "..", "uploads", "events", "images"),
    path.join(__dirname, "..", "uploads", "news", "featured"),
    path.join(__dirname, "..", "uploads", "news", "images"),
    path.join(__dirname, "..", "uploads", "demo-videos"),
    path.join(__dirname, "..", "uploads", "carlvyne", "profile-images"),
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
