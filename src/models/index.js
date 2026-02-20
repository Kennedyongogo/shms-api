const { sequelize } = require("../config/database");

// COMPLETE HOSPITAL MANAGEMENT SYSTEM – ALL MODELS (41)
const Role = require("./role")(sequelize);
const Permission = require("./permission")(sequelize);
const RolePermission = require("./rolePermission")(sequelize);

const User = require("./user")(sequelize);
const Hospital = require("./hospital")(sequelize);
const Department = require("./department")(sequelize);
const Ward = require("./ward")(sequelize);
const Bed = require("./bed")(sequelize);

const Staff = require("./staff")(sequelize);
const DoctorSchedule = require("./doctorSchedule")(sequelize);

const Patient = require("./patient")(sequelize);
const PatientAllergy = require("./patientAllergy")(sequelize);
const PatientMedicalHistory = require("./patientMedicalHistory")(sequelize);

const Service = require("./service")(sequelize);
const ServiceImage = require("./serviceImage")(sequelize);

const Appointment = require("./appointment")(sequelize);
const Consultation = require("./consultation")(sequelize);
const VitalSigns = require("./vitalSigns")(sequelize);

const LabTest = require("./labTest")(sequelize);
const LabOrder = require("./labOrder")(sequelize);
const LabOrderItem = require("./labOrderItem")(sequelize);
const LabResult = require("./labResult")(sequelize);

const Medication = require("./medication")(sequelize);
const Prescription = require("./prescription")(sequelize);
const PrescriptionItem = require("./prescriptionItem")(sequelize);
const DispenseRecord = require("./dispenseRecord")(sequelize);

const InventoryItem = require("./inventoryItem")(sequelize);
const InventoryTransaction = require("./inventoryTransaction")(sequelize);
const Supplier = require("./supplier")(sequelize);
const PurchaseOrder = require("./purchaseOrder")(sequelize);

const Bill = require("./bill")(sequelize);
const BillItem = require("./billItem")(sequelize);
const Payment = require("./payment")(sequelize);
const InsuranceClaim = require("./insuranceClaim")(sequelize);

const Admission = require("./admission")(sequelize);
const NursingNote = require("./nursingNote")(sequelize);

const MedicalReport = require("./medicalReport")(sequelize);
const MedicalAttachment = require("./medicalAttachment")(sequelize);
const Notification = require("./notification")(sequelize);
const AuditLog = require("./auditLog")(sequelize);
const SystemSetting = require("./systemSetting")(sequelize);

// Events & News
const Event = require("./event")(sequelize);
const EventRegistration = require("./eventRegistration")(sequelize);
const EventImage = require("./eventImage")(sequelize);
const News = require("./news")(sequelize);
const NewsImage = require("./newsImage")(sequelize);

const models = {
  Role,
  Permission,
  RolePermission,
  User,
  Hospital,
  Department,
  Ward,
  Bed,
  Staff,
  DoctorSchedule,
  Patient,
  PatientAllergy,
  PatientMedicalHistory,
  Service,
  ServiceImage,
  Appointment,
  Consultation,
  VitalSigns,
  LabTest,
  LabOrder,
  LabOrderItem,
  LabResult,
  Medication,
  Prescription,
  PrescriptionItem,
  DispenseRecord,
  InventoryItem,
  InventoryTransaction,
  Supplier,
  PurchaseOrder,
  Bill,
  BillItem,
  Payment,
  InsuranceClaim,
  Admission,
  NursingNote,
  MedicalReport,
  MedicalAttachment,
  Notification,
  AuditLog,
  SystemSetting,
  Event,
  EventRegistration,
  EventImage,
  News,
  NewsImage,
};

// Initialize models in correct order (parent tables first)
const initializeModels = async () => {
  try {
    console.log("🔄 Creating/updating tables...");

    console.log("📋 Syncing tables...");

    // 1) AUTH & ACCESS CONTROL
    await Role.sync({ force: false, alter: false });
    await Permission.sync({ force: false, alter: false });
    await RolePermission.sync({ force: false, alter: false });
    await User.sync({ force: false, alter: false });

    // 2) HOSPITAL STRUCTURE
    await Hospital.sync({ force: false, alter: false });
    await Department.sync({ force: false, alter: false });
    await Ward.sync({ force: false, alter: false });
    await Bed.sync({ force: false, alter: false });

    // 3) STAFF MANAGEMENT
    await Staff.sync({ force: false, alter: false });
    await DoctorSchedule.sync({ force: false, alter: false });

    // 4) PATIENT MANAGEMENT
    await Patient.sync({ force: false, alter: false });
    await PatientAllergy.sync({ force: false, alter: false });
    await PatientMedicalHistory.sync({ force: false, alter: false });

    // 5) SERVICES (Public Portal)
    await Service.sync({ force: false, alter: false });
    await ServiceImage.sync({ force: false, alter: false });

    // 6) APPOINTMENT & CONSULTATION
    await Appointment.sync({ force: false, alter: false });
    await Consultation.sync({ force: false, alter: false });
    await VitalSigns.sync({ force: false, alter: false });

    // 7) LABORATORY MODULE
    await LabTest.sync({ force: false, alter: false });
    await LabOrder.sync({ force: false, alter: false });
    await LabOrderItem.sync({ force: false, alter: false });
    await LabResult.sync({ force: false, alter: false });

    // 8) PHARMACY MODULE
    await Medication.sync({ force: false, alter: false });
    await Prescription.sync({ force: false, alter: false });
    await PrescriptionItem.sync({ force: false, alter: false });
    await DispenseRecord.sync({ force: false, alter: false });

    // 9) INVENTORY & SUPPLY CHAIN
    await InventoryItem.sync({ force: false, alter: false });
    await InventoryTransaction.sync({ force: false, alter: false });
    await Supplier.sync({ force: false, alter: false });
    await PurchaseOrder.sync({ force: false, alter: false });

    // 10) BILLING & FINANCE
    await Bill.sync({ force: false, alter: false });
    await BillItem.sync({ force: false, alter: false });
    await Payment.sync({ force: false, alter: false });
    await InsuranceClaim.sync({ force: false, alter: false });

    // 11) INPATIENT MODULE
    await Admission.sync({ force: false, alter: false });
    await NursingNote.sync({ force: false, alter: false });

    // 12) DOCUMENTS & SYSTEM SUPPORT
    await MedicalReport.sync({ force: false, alter: false });
    await MedicalAttachment.sync({ force: false, alter: false });
    await Notification.sync({ force: false, alter: false });
    await AuditLog.sync({ force: false, alter: false });
    await SystemSetting.sync({ force: false, alter: false });

    // 13) NEWS & EVENTS
    await Event.sync({ force: false, alter: false });
    await EventRegistration.sync({ force: false, alter: false });
    await EventImage.sync({ force: false, alter: false });
    await News.sync({ force: false, alter: false });
    await NewsImage.sync({ force: false, alter: false });

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
    // Role / Permission / User
    Role.hasMany(User, { foreignKey: "role_id", as: "users" });
    User.belongsTo(Role, { foreignKey: "role_id", as: "role" });

    Role.belongsToMany(Permission, {
      through: RolePermission,
      foreignKey: "role_id",
      otherKey: "permission_id",
      as: "permissions",
    });
    Permission.belongsToMany(Role, {
      through: RolePermission,
      foreignKey: "permission_id",
      otherKey: "role_id",
      as: "roles",
    });

    User.hasOne(Patient, { foreignKey: "user_id", as: "patient" });
    Patient.belongsTo(User, { foreignKey: "user_id", as: "user" });

    User.hasOne(Staff, { foreignKey: "user_id", as: "staff" });
    Staff.belongsTo(User, { foreignKey: "user_id", as: "user" });

    User.hasMany(Notification, { foreignKey: "user_id", as: "notifications" });
    Notification.belongsTo(User, { foreignKey: "user_id", as: "user" });

    User.hasMany(AuditLog, { foreignKey: "user_id", as: "auditLogs" });
    AuditLog.belongsTo(User, { foreignKey: "user_id", as: "user" });

    // Hospital structure
    Hospital.hasMany(Department, {
      foreignKey: "hospital_id",
      as: "departments",
    });
    Department.belongsTo(Hospital, {
      foreignKey: "hospital_id",
      as: "hospital",
    });

    Hospital.hasMany(Staff, { foreignKey: "hospital_id", as: "staff" });
    Staff.belongsTo(Hospital, { foreignKey: "hospital_id", as: "hospital" });

    Hospital.hasMany(Patient, { foreignKey: "hospital_id", as: "patients" });
    Patient.belongsTo(Hospital, { foreignKey: "hospital_id", as: "hospital" });

    Hospital.hasMany(Service, { foreignKey: "hospital_id", as: "services" });
    Service.belongsTo(Hospital, { foreignKey: "hospital_id", as: "hospital" });

    Hospital.hasMany(SystemSetting, {
      foreignKey: "hospital_id",
      as: "settings",
    });
    SystemSetting.belongsTo(Hospital, {
      foreignKey: "hospital_id",
      as: "hospital",
    });

    Hospital.hasMany(Event, { foreignKey: "hospital_id", as: "events" });
    Event.belongsTo(Hospital, { foreignKey: "hospital_id", as: "hospital" });

    Hospital.hasMany(News, { foreignKey: "hospital_id", as: "news" });
    News.belongsTo(Hospital, { foreignKey: "hospital_id", as: "hospital" });

    Department.hasMany(Ward, { foreignKey: "department_id", as: "wards" });
    Ward.belongsTo(Department, {
      foreignKey: "department_id",
      as: "department",
    });

    Department.hasMany(Staff, { foreignKey: "department_id", as: "staff" });
    Staff.belongsTo(Department, {
      foreignKey: "department_id",
      as: "department",
    });

    Department.hasMany(Service, {
      foreignKey: "department_id",
      as: "services",
    });
    Service.belongsTo(Department, {
      foreignKey: "department_id",
      as: "department",
    });

    Ward.hasMany(Bed, { foreignKey: "ward_id", as: "beds" });
    Bed.belongsTo(Ward, { foreignKey: "ward_id", as: "ward" });

    Bed.hasMany(Admission, { foreignKey: "bed_id", as: "admissions" });
    Admission.belongsTo(Bed, { foreignKey: "bed_id", as: "bed" });

    // Staff
    Staff.hasMany(DoctorSchedule, { foreignKey: "doctor_id", as: "schedules" });
    DoctorSchedule.belongsTo(Staff, { foreignKey: "doctor_id", as: "doctor" });

    Staff.hasMany(Appointment, { foreignKey: "doctor_id", as: "appointments" });
    Appointment.belongsTo(Staff, { foreignKey: "doctor_id", as: "doctor" });

    Staff.hasMany(Prescription, {
      foreignKey: "doctor_id",
      as: "prescriptions",
    });
    Prescription.belongsTo(Staff, { foreignKey: "doctor_id", as: "doctor" });

    Staff.hasMany(LabOrder, { foreignKey: "doctor_id", as: "labOrders" });
    LabOrder.belongsTo(Staff, { foreignKey: "doctor_id", as: "doctor" });

    Staff.hasMany(Admission, { foreignKey: "doctor_id", as: "admissions" });
    Admission.belongsTo(Staff, { foreignKey: "doctor_id", as: "doctor" });

    Staff.hasMany(MedicalReport, {
      foreignKey: "doctor_id",
      as: "medicalReports",
    });
    MedicalReport.belongsTo(Staff, { foreignKey: "doctor_id", as: "doctor" });

    Staff.hasMany(DispenseRecord, {
      foreignKey: "pharmacist_id",
      as: "dispenseRecords",
    });
    DispenseRecord.belongsTo(Staff, {
      foreignKey: "pharmacist_id",
      as: "pharmacist",
    });

    Staff.hasMany(NursingNote, { foreignKey: "nurse_id", as: "nursingNotes" });
    NursingNote.belongsTo(Staff, { foreignKey: "nurse_id", as: "nurse" });

    Staff.hasMany(LabResult, {
      foreignKey: "lab_technician_id",
      as: "labResults",
    });
    LabResult.belongsTo(Staff, {
      foreignKey: "lab_technician_id",
      as: "labTechnician",
    });

    Staff.hasMany(Event, { foreignKey: "created_by", as: "createdEvents" });
    Event.belongsTo(Staff, { foreignKey: "created_by", as: "creator" });

    Staff.hasMany(EventImage, {
      foreignKey: "uploaded_by",
      as: "uploadedEventImages",
    });
    EventImage.belongsTo(Staff, { foreignKey: "uploaded_by", as: "uploader" });

    Staff.hasMany(News, { foreignKey: "created_by", as: "createdNews" });
    News.belongsTo(Staff, { foreignKey: "created_by", as: "creator" });

    Staff.hasMany(NewsImage, {
      foreignKey: "uploaded_by",
      as: "uploadedNewsImages",
    });
    NewsImage.belongsTo(Staff, { foreignKey: "uploaded_by", as: "uploader" });

    Staff.hasMany(EventRegistration, {
      foreignKey: "checked_in_by",
      as: "checkedInRegistrations",
    });
    EventRegistration.belongsTo(Staff, {
      foreignKey: "checked_in_by",
      as: "checkedInBy",
    });

    // Patient
    Patient.hasMany(Appointment, {
      foreignKey: "patient_id",
      as: "appointments",
    });
    Appointment.belongsTo(Patient, { foreignKey: "patient_id", as: "patient" });

    Patient.hasMany(PatientAllergy, {
      foreignKey: "patient_id",
      as: "allergies",
    });
    PatientAllergy.belongsTo(Patient, {
      foreignKey: "patient_id",
      as: "patient",
    });

    Patient.hasMany(PatientMedicalHistory, {
      foreignKey: "patient_id",
      as: "medicalHistory",
    });
    PatientMedicalHistory.belongsTo(Patient, {
      foreignKey: "patient_id",
      as: "patient",
    });

    Patient.hasMany(Prescription, {
      foreignKey: "patient_id",
      as: "prescriptions",
    });
    Prescription.belongsTo(Patient, {
      foreignKey: "patient_id",
      as: "patient",
    });

    Patient.hasMany(LabOrder, { foreignKey: "patient_id", as: "labOrders" });
    LabOrder.belongsTo(Patient, { foreignKey: "patient_id", as: "patient" });

    Patient.hasMany(Bill, { foreignKey: "patient_id", as: "bills" });
    Bill.belongsTo(Patient, { foreignKey: "patient_id", as: "patient" });

    Patient.hasMany(Admission, { foreignKey: "patient_id", as: "admissions" });
    Admission.belongsTo(Patient, { foreignKey: "patient_id", as: "patient" });

    Patient.hasMany(MedicalReport, {
      foreignKey: "patient_id",
      as: "medicalReports",
    });
    MedicalReport.belongsTo(Patient, {
      foreignKey: "patient_id",
      as: "patient",
    });

    Patient.hasMany(MedicalAttachment, {
      foreignKey: "patient_id",
      as: "attachments",
    });
    MedicalAttachment.belongsTo(Patient, {
      foreignKey: "patient_id",
      as: "patient",
    });

    Patient.hasMany(EventRegistration, {
      foreignKey: "patient_id",
      as: "eventRegistrations",
    });
    EventRegistration.belongsTo(Patient, {
      foreignKey: "patient_id",
      as: "patient",
    });

    Patient.hasMany(NursingNote, {
      foreignKey: "patient_id",
      as: "nursingNotes",
    });
    NursingNote.belongsTo(Patient, { foreignKey: "patient_id", as: "patient" });

    // Service
    Service.hasMany(ServiceImage, {
      foreignKey: "service_id",
      as: "images",
      onDelete: "CASCADE",
    });
    ServiceImage.belongsTo(Service, {
      foreignKey: "service_id",
      as: "service",
    });

    Service.hasMany(Appointment, {
      foreignKey: "service_id",
      as: "appointments",
    });
    Appointment.belongsTo(Service, { foreignKey: "service_id", as: "service" });

    // Appointment / Consultation
    Appointment.hasOne(Consultation, {
      foreignKey: "appointment_id",
      as: "consultation",
      onDelete: "CASCADE",
      hooks: true,
    });
    Consultation.belongsTo(Appointment, {
      foreignKey: "appointment_id",
      as: "appointment",
      onDelete: "CASCADE",
    });

    Consultation.hasOne(VitalSigns, {
      foreignKey: "consultation_id",
      as: "vitalSigns",
    });
    VitalSigns.belongsTo(Consultation, {
      foreignKey: "consultation_id",
      as: "consultation",
    });

    Consultation.hasMany(LabOrder, {
      foreignKey: "consultation_id",
      as: "labOrders",
    });
    LabOrder.belongsTo(Consultation, {
      foreignKey: "consultation_id",
      as: "consultation",
    });

    Consultation.hasMany(Prescription, {
      foreignKey: "consultation_id",
      as: "prescriptions",
    });
    Prescription.belongsTo(Consultation, {
      foreignKey: "consultation_id",
      as: "consultation",
    });

    Consultation.hasMany(Bill, { foreignKey: "consultation_id", as: "bills" });
    Bill.belongsTo(Consultation, {
      foreignKey: "consultation_id",
      as: "consultation",
    });

    Appointment.hasOne(Bill, { foreignKey: "appointment_id", as: "bill" });
    Bill.belongsTo(Appointment, {
      foreignKey: "appointment_id",
      as: "appointment",
    });

    Appointment.hasMany(Admission, {
      foreignKey: "appointment_id",
      as: "admissions",
    });
    Admission.belongsTo(Appointment, {
      foreignKey: "appointment_id",
      as: "appointment",
    });

    Consultation.hasMany(MedicalReport, {
      foreignKey: "consultation_id",
      as: "medicalReports",
    });
    MedicalReport.belongsTo(Consultation, {
      foreignKey: "consultation_id",
      as: "consultation",
    });

    // Lab
    LabOrder.hasMany(LabOrderItem, {
      foreignKey: "lab_order_id",
      as: "items",
      onDelete: "CASCADE",
    });
    LabOrderItem.belongsTo(LabOrder, {
      foreignKey: "lab_order_id",
      as: "labOrder",
    });

    LabTest.hasMany(LabOrderItem, {
      foreignKey: "lab_test_id",
      as: "orderItems",
    });
    LabOrderItem.belongsTo(LabTest, {
      foreignKey: "lab_test_id",
      as: "labTest",
    });

    LabOrderItem.hasOne(LabResult, {
      foreignKey: "lab_order_item_id",
      as: "result",
    });
    LabResult.belongsTo(LabOrderItem, {
      foreignKey: "lab_order_item_id",
      as: "labOrderItem",
    });

    // Pharmacy
    Prescription.hasMany(PrescriptionItem, {
      foreignKey: "prescription_id",
      as: "items",
      onDelete: "CASCADE",
    });
    PrescriptionItem.belongsTo(Prescription, {
      foreignKey: "prescription_id",
      as: "prescription",
    });

    Medication.hasMany(PrescriptionItem, {
      foreignKey: "medication_id",
      as: "prescriptionItems",
    });
    PrescriptionItem.belongsTo(Medication, {
      foreignKey: "medication_id",
      as: "medication",
    });

    Prescription.hasMany(DispenseRecord, {
      foreignKey: "prescription_id",
      as: "dispenseRecords",
    });
    DispenseRecord.belongsTo(Prescription, {
      foreignKey: "prescription_id",
      as: "prescription",
    });

    // Events
    Event.hasMany(EventRegistration, {
      foreignKey: "event_id",
      as: "registrations",
      onDelete: "CASCADE",
    });
    EventRegistration.belongsTo(Event, { foreignKey: "event_id", as: "event" });

    Event.hasMany(EventImage, {
      foreignKey: "event_id",
      as: "images",
      onDelete: "CASCADE",
    });
    EventImage.belongsTo(Event, { foreignKey: "event_id", as: "event" });

    // News
    News.hasMany(NewsImage, {
      foreignKey: "news_id",
      as: "images",
      onDelete: "CASCADE",
    });
    NewsImage.belongsTo(News, { foreignKey: "news_id", as: "news" });

    // Inventory
    InventoryItem.hasMany(InventoryTransaction, {
      foreignKey: "inventory_item_id",
      as: "transactions",
    });
    InventoryTransaction.belongsTo(InventoryItem, {
      foreignKey: "inventory_item_id",
      as: "item",
    });

    // Supply chain
    Supplier.hasMany(PurchaseOrder, {
      foreignKey: "supplier_id",
      as: "purchaseOrders",
    });
    PurchaseOrder.belongsTo(Supplier, {
      foreignKey: "supplier_id",
      as: "supplier",
    });

    // Billing
    Bill.hasMany(BillItem, {
      foreignKey: "bill_id",
      as: "items",
      onDelete: "CASCADE",
    });
    BillItem.belongsTo(Bill, { foreignKey: "bill_id", as: "bill" });

    Bill.hasMany(Payment, {
      foreignKey: "bill_id",
      as: "payments",
      onDelete: "CASCADE",
    });
    Payment.belongsTo(Bill, { foreignKey: "bill_id", as: "bill" });

    Bill.hasOne(InsuranceClaim, {
      foreignKey: "bill_id",
      as: "insuranceClaim",
    });
    InsuranceClaim.belongsTo(Bill, { foreignKey: "bill_id", as: "bill" });
    Patient.hasMany(InsuranceClaim, {
      foreignKey: "patient_id",
      as: "insuranceClaims",
    });
    InsuranceClaim.belongsTo(Patient, {
      foreignKey: "patient_id",
      as: "patient",
    });

    // Inpatient
    Admission.hasMany(NursingNote, {
      foreignKey: "admission_id",
      as: "nursingNotes",
      onDelete: "CASCADE",
    });
    NursingNote.belongsTo(Admission, {
      foreignKey: "admission_id",
      as: "admission",
    });

    // Misc
    User.hasMany(MedicalAttachment, {
      foreignKey: "uploaded_by",
      as: "uploadedAttachments",
    });
    MedicalAttachment.belongsTo(User, {
      foreignKey: "uploaded_by",
      as: "uploader",
    });

    User.hasMany(Appointment, {
      foreignKey: "created_by",
      as: "createdAppointments",
    });
    Appointment.belongsTo(User, { foreignKey: "created_by", as: "createdBy" });

    console.log("✅ All associations set up successfully");
  } catch (error) {
    console.error("❌ Error during setupAssociations:", error);
  }
};

module.exports = { ...models, initializeModels, setupAssociations, sequelize };
