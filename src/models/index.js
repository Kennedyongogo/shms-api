const { sequelize } = require("../config/database");

// Import all models
const AdminUser = require("./adminUser")(sequelize);
const Document = require("./document")(sequelize);
const AuditTrail = require("./auditTrail")(sequelize);
const Review = require("./review")(sequelize);
const Blog = require("./blog")(sequelize);
const Member = require("./member")(sequelize);
const Service = require("./service")(sequelize);
const Project = require("./project")(sequelize);
const FAQ = require("./faq")(sequelize);
const Contact = require("./contact")(sequelize);
const QuoteRequest = require("./quoteRequest")(sequelize);
const Consultation = require("./consultation")(sequelize);
const NewsletterSubscriber = require("./newsletterSubscriber")(sequelize);
const InterestGallery = require("./interestGallery")(sequelize);
const MarketplaceUser = require("./marketplaceUser")(sequelize);
const MarketplaceUserProfile = require("./marketplaceUserProfile")(sequelize);

// Dynamic Form Models
const Form = require("./form")(sequelize);
const FormField = require("./formField")(sequelize);
const FieldOption = require("./fieldOption")(sequelize);
const FormSubmission = require("./formSubmission")(sequelize);

// Training Opportunities Models
const TrainingEvent = require("./trainingEvent")(sequelize);
const Grant = require("./grant")(sequelize);
const Partner = require("./partner")(sequelize);
const TrainingRegistration = require("./trainingRegistration")(sequelize);
const GrantApplication = require("./grantApplication")(sequelize);
const FeedFormulationRequest = require("./feedFormulationRequest")(sequelize);
const MarketplaceListing = require("./marketplaceListing")(sequelize);

const models = {
  AdminUser,
  Document,
  AuditTrail,
  Review,
  Blog,
  Member,
  Service,
  Project,
  FAQ,
  Contact,
  QuoteRequest,
  Consultation,
  NewsletterSubscriber,
  InterestGallery,
  MarketplaceUser,
  MarketplaceUserProfile,
  // Dynamic Form Models
  Form,
  FormField,
  FieldOption,
  FormSubmission,
  // Training Opportunities Models
  TrainingEvent,
  Grant,
  Partner,
  TrainingRegistration,
  GrantApplication,
  FeedFormulationRequest,
  MarketplaceListing,
};

// Initialize models in correct order (parent tables first)
const initializeModels = async () => {
  try {
    console.log("🔄 Creating/updating tables...");

    // Use alter: false to prevent schema conflicts in production
    console.log("📋 Syncing tables...");
    await AdminUser.sync({ force: false, alter: false });
    await Document.sync({ force: false, alter: false });
    await AuditTrail.sync({ force: false, alter: false }); // Allow schema changes for enum updates
    await Review.sync({ force: false, alter: false });
    await Blog.sync({ force: false, alter: false });
    await Member.sync({ force: false, alter: false });
    await Service.sync({ force: false, alter: false });
    await Project.sync({ force: false, alter: false });
    await FAQ.sync({ force: false, alter: false });
    await Contact.sync({ force: false, alter: false });
    await QuoteRequest.sync({ force: false, alter: false });
    await Consultation.sync({ force: false, alter: false });
    await NewsletterSubscriber.sync({ force: false, alter: false });
    await InterestGallery.sync({ force: false, alter: false });
    await MarketplaceUser.sync({ force: false, alter: false });
    await MarketplaceUserProfile.sync({ force: false, alter: false });

    // Dynamic Form Models
    await Form.sync({ force: false, alter: false });
    await FormField.sync({ force: false, alter: false }); // Allow schema changes for conditional logic
    await FieldOption.sync({ force: false, alter: false });
    await FormSubmission.sync({ force: false, alter: false });

    // Training Opportunities Models (parent tables first)
    await TrainingEvent.sync({ force: false, alter: false });
    await Grant.sync({ force: false, alter: false });
    await Partner.sync({ force: false, alter: false });
    await TrainingRegistration.sync({ force: false, alter: false });
    await GrantApplication.sync({ force: false, alter: false });
    await FeedFormulationRequest.sync({ force: false, alter: false });
    await MarketplaceListing.sync({ force: false, alter: false });

    console.log("✅ All models synced successfully");
  } catch (error) {
    console.error("❌ Error syncing models:", error);
    console.error("❌ Error details:", {
      name: error.name,
      message: error.message,
      parent: error.parent?.message,
      original: error.original?.message,
      sql: error.sql,
    });
    throw error;
  }
};

const setupAssociations = () => {
  try {
    // AdminUser → Document (1:Many for uploaded_by)
    models.AdminUser.hasMany(models.Document, {
      foreignKey: "uploaded_by",
      as: "uploadedDocuments",
    });
    models.Document.belongsTo(models.AdminUser, {
      foreignKey: "uploaded_by",
      as: "uploader",
    });

    // AdminUser → AuditTrail (1:Many)
    models.AdminUser.hasMany(models.AuditTrail, {
      foreignKey: "user_id",
      as: "auditLogs",
    });
    models.AuditTrail.belongsTo(models.AdminUser, {
      foreignKey: "user_id",
      as: "user",
    });

    // AdminUser → Blog (1:Many)
    models.AdminUser.hasMany(models.Blog, {
      foreignKey: "created_by",
      as: "createdBlogs",
    });
    models.Blog.belongsTo(models.AdminUser, {
      foreignKey: "created_by",
      as: "creator",
    });

    // AdminUser → Service (1:Many)
    models.AdminUser.hasMany(models.Service, {
      foreignKey: "created_by",
      as: "createdServices",
    });
    models.Service.belongsTo(models.AdminUser, {
      foreignKey: "created_by",
      as: "creator",
    });

    models.AdminUser.hasMany(models.Service, {
      foreignKey: "updated_by",
      as: "updatedServices",
    });
    models.Service.belongsTo(models.AdminUser, {
      foreignKey: "updated_by",
      as: "updater",
    });

    // AdminUser → Project (1:Many)
    models.AdminUser.hasMany(models.Project, {
      foreignKey: "created_by",
      as: "createdProjects",
    });
    models.Project.belongsTo(models.AdminUser, {
      foreignKey: "created_by",
      as: "creator",
    });

    models.AdminUser.hasMany(models.Project, {
      foreignKey: "updated_by",
      as: "updatedProjects",
    });
    models.Project.belongsTo(models.AdminUser, {
      foreignKey: "updated_by",
      as: "updater",
    });

    // AdminUser → FAQ (1:Many)
    models.AdminUser.hasMany(models.FAQ, {
      foreignKey: "created_by",
      as: "createdFAQs",
    });
    models.FAQ.belongsTo(models.AdminUser, {
      foreignKey: "created_by",
      as: "creator",
    });

    models.AdminUser.hasMany(models.FAQ, {
      foreignKey: "updated_by",
      as: "updatedFAQs",
    });
    models.FAQ.belongsTo(models.AdminUser, {
      foreignKey: "updated_by",
      as: "updater",
    });

    // AdminUser → Contact (1:Many)
    models.AdminUser.hasMany(models.Contact, {
      foreignKey: "reviewedBy",
      as: "reviewedContacts",
    });
    models.Contact.belongsTo(models.AdminUser, {
      foreignKey: "reviewedBy",
      as: "reviewer",
    });

    // AdminUser → QuoteRequest (1:Many)
    models.AdminUser.hasMany(models.QuoteRequest, {
      foreignKey: "reviewedBy",
      as: "reviewedQuoteRequests",
    });
    models.QuoteRequest.belongsTo(models.AdminUser, {
      foreignKey: "reviewedBy",
      as: "reviewer",
    });

    // AdminUser → Consultation (1:Many)
    models.AdminUser.hasMany(models.Consultation, {
      foreignKey: "reviewedBy",
      as: "reviewedConsultations",
    });
    models.Consultation.belongsTo(models.AdminUser, {
      foreignKey: "reviewedBy",
      as: "reviewer",
    });

    // InterestGallery Associations
    models.AdminUser.hasMany(models.InterestGallery, {
      foreignKey: "created_by",
      as: "createdInterestGalleryItems",
    });
    models.InterestGallery.belongsTo(models.AdminUser, {
      foreignKey: "created_by",
      as: "creator",
    });

    models.AdminUser.hasMany(models.InterestGallery, {
      foreignKey: "updated_by",
      as: "updatedInterestGalleryItems",
    });
    models.InterestGallery.belongsTo(models.AdminUser, {
      foreignKey: "updated_by",
      as: "updater",
    });

    // MarketplaceUser → MarketplaceUserProfile (1:1)
    models.MarketplaceUser.hasOne(models.MarketplaceUserProfile, {
      foreignKey: "userId",
      as: "profile",
    });
    models.MarketplaceUserProfile.belongsTo(models.MarketplaceUser, {
      foreignKey: "userId",
      as: "user",
    });

    // Dynamic Form Associations
    // Form → FormField (1:Many)
    models.Form.hasMany(models.FormField, {
      foreignKey: "form_id",
      as: "fields",
      onDelete: "CASCADE",
    });
    models.FormField.belongsTo(models.Form, {
      foreignKey: "form_id",
      as: "form",
    });

    // FormField → FieldOption (1:Many)
    models.FormField.hasMany(models.FieldOption, {
      foreignKey: "form_field_id",
      as: "options",
      onDelete: "CASCADE",
    });
    models.FieldOption.belongsTo(models.FormField, {
      foreignKey: "form_field_id",
      as: "field",
    });

    // Form → FormSubmission (1:Many)
    models.Form.hasMany(models.FormSubmission, {
      foreignKey: "form_id",
      as: "submissions",
      onDelete: "CASCADE",
    });
    models.FormSubmission.belongsTo(models.Form, {
      foreignKey: "form_id",
      as: "form",
    });

    // AdminUser → Form (created_by/updated_by)
    models.AdminUser.hasMany(models.Form, {
      foreignKey: "created_by",
      as: "createdForms",
    });
    models.Form.belongsTo(models.AdminUser, {
      foreignKey: "created_by",
      as: "creator",
    });

    models.AdminUser.hasMany(models.Form, {
      foreignKey: "updated_by",
      as: "updatedForms",
    });
    models.Form.belongsTo(models.AdminUser, {
      foreignKey: "updated_by",
      as: "updater",
    });

    // AdminUser → FormSubmission (reviewed_by)
    models.AdminUser.hasMany(models.FormSubmission, {
      foreignKey: "reviewed_by",
      as: "reviewedSubmissions",
    });
    models.FormSubmission.belongsTo(models.AdminUser, {
      foreignKey: "reviewed_by",
      as: "reviewer",
    });

    // Training Opportunities Associations
    // AdminUser → TrainingEvent, Grant, Partner (created_by/updated_by)
    models.AdminUser.hasMany(models.TrainingEvent, {
      foreignKey: "created_by",
      as: "createdTrainingEvents",
    });
    models.TrainingEvent.belongsTo(models.AdminUser, {
      foreignKey: "created_by",
      as: "creator",
    });

    models.AdminUser.hasMany(models.TrainingEvent, {
      foreignKey: "updated_by",
      as: "updatedTrainingEvents",
    });
    models.TrainingEvent.belongsTo(models.AdminUser, {
      foreignKey: "updated_by",
      as: "updater",
    });

    models.AdminUser.hasMany(models.Grant, {
      foreignKey: "created_by",
      as: "createdGrants",
    });
    models.Grant.belongsTo(models.AdminUser, {
      foreignKey: "created_by",
      as: "creator",
    });

    models.AdminUser.hasMany(models.Grant, {
      foreignKey: "updated_by",
      as: "updatedGrants",
    });
    models.Grant.belongsTo(models.AdminUser, {
      foreignKey: "updated_by",
      as: "updater",
    });

    models.AdminUser.hasMany(models.Partner, {
      foreignKey: "created_by",
      as: "createdPartners",
    });
    models.Partner.belongsTo(models.AdminUser, {
      foreignKey: "created_by",
      as: "creator",
    });

    models.AdminUser.hasMany(models.Partner, {
      foreignKey: "updated_by",
      as: "updatedPartners",
    });
    models.Partner.belongsTo(models.AdminUser, {
      foreignKey: "updated_by",
      as: "updater",
    });

    // TrainingEvent → TrainingRegistration (1:Many)
    models.TrainingEvent.hasMany(models.TrainingRegistration, {
      foreignKey: "training_event_id",
      as: "registrations",
      onDelete: "CASCADE",
    });
    models.TrainingRegistration.belongsTo(models.TrainingEvent, {
      foreignKey: "training_event_id",
      as: "trainingEvent",
    });

    // Grant → GrantApplication (1:Many)
    models.Grant.hasMany(models.GrantApplication, {
      foreignKey: "grant_id",
      as: "applications",
      onDelete: "CASCADE",
    });
    models.GrantApplication.belongsTo(models.Grant, {
      foreignKey: "grant_id",
      as: "grant",
    });

    // MarketplaceUser → TrainingRegistration (1:Many)
    models.MarketplaceUser.hasMany(models.TrainingRegistration, {
      foreignKey: "user_id",
      as: "trainingRegistrations",
    });
    models.TrainingRegistration.belongsTo(models.MarketplaceUser, {
      foreignKey: "user_id",
      as: "user",
    });

    // MarketplaceUser → GrantApplication (1:Many)
    models.MarketplaceUser.hasMany(models.GrantApplication, {
      foreignKey: "user_id",
      as: "grantApplications",
    });
    models.GrantApplication.belongsTo(models.MarketplaceUser, {
      foreignKey: "user_id",
      as: "user",
    });

    // MarketplaceUser → FeedFormulationRequest (1:Many, optional)
    models.MarketplaceUser.hasMany(models.FeedFormulationRequest, {
      foreignKey: "marketplace_user_id",
      as: "feedFormulationRequests",
    });
    models.FeedFormulationRequest.belongsTo(models.MarketplaceUser, {
      foreignKey: "marketplace_user_id",
      as: "user",
    });

    // MarketplaceUser → MarketplaceListing (1:Many)
    models.MarketplaceUser.hasMany(models.MarketplaceListing, {
      foreignKey: "user_id",
      as: "listings",
    });
    models.MarketplaceListing.belongsTo(models.MarketplaceUser, {
      foreignKey: "user_id",
      as: "user",
    });

    // MarketplaceListing → AdminUser (approved_by, optional)
    models.MarketplaceListing.belongsTo(models.AdminUser, {
      foreignKey: "approved_by",
      as: "approver",
    });
    models.AdminUser.hasMany(models.MarketplaceListing, {
      foreignKey: "approved_by",
      as: "approvedListings",
    });

    console.log("✅ All associations set up successfully");
  } catch (error) {
    console.error("❌ Error during setupAssociations:", error);
  }
};

module.exports = { ...models, initializeModels, setupAssociations, sequelize };
