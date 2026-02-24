const { Op } = require("sequelize");
const {
  Hospital,
  Department,
  Ward,
  Bed,
  Staff,
  Patient,
  Appointment,
  Consultation,
  LabOrder,
  LabResult,
  LabTest,
  Medication,
  Prescription,
  DispenseRecord,
  Bill,
  Payment,
  Admission,
  InventoryItem,
  Supplier,
  PurchaseOrder,
  MedicalReport,
  VitalSigns,
  User,
  Event,
  News,
  sequelize,
} = require("../models");

/** Get start of today (UTC date) and start of this week/month for filtering */
function getDateRanges() {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const dayOfWeek = now.getDay();
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
  weekStart.setHours(0, 0, 0, 0);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  return { now, todayStart, weekStart, monthStart };
}

/**
 * GET /api/statistics
 * Returns all statistics grouped by domain for dashboard (cards, pie charts, bar charts, tabs).
 */
const getAll = async (req, res) => {
  try {
    const { todayStart, weekStart, monthStart } = getDateRanges();

    const [
      hospitalCount,
      departmentCount,
      wardCount,
      bedCount,
      staffCount,
      patientCount,
      patientActiveCount,
      patientByStatus,
      appointmentCount,
      appointmentByStatus,
      appointmentToday,
      appointmentThisWeek,
      appointmentThisMonth,
      consultationCount,
      consultationThisMonth,
      labOrderCount,
      labOrderByStatus,
      labResultCount,
      labTestCount,
      medicationCount,
      prescriptionCount,
      dispenseCount,
      billCount,
      billByStatus,
      totalRevenueResult,
      paymentThisMonthResult,
      admissionCount,
      admissionAdmitted,
      admissionByStatus,
      admissionThisMonth,
      inventoryItemCount,
      lowStockCount,
      supplierCount,
      purchaseOrderCount,
      purchaseOrderByStatus,
      medicalReportCount,
      vitalSignsCount,
      userCount,
      eventCount,
      newsCount,
      bedByStatus,
    ] = await Promise.all([
      Hospital.count(),
      Department.count(),
      Ward.count(),
      Bed.count(),
      Staff.count(),
      Patient.count(),
      Patient.count({ where: { status: "active" } }),
      Patient.findAll({ attributes: ["status"], raw: true }).then((rows) => {
        const byStatus = {};
        rows.forEach((r) => { byStatus[r.status] = (byStatus[r.status] || 0) + 1; });
        return byStatus;
      }),
      Appointment.count(),
      Appointment.findAll({ attributes: ["status"], raw: true }).then((rows) => {
        const byStatus = {};
        rows.forEach((r) => { byStatus[r.status] = (byStatus[r.status] || 0) + 1; });
        return byStatus;
      }),
      Appointment.count({ where: { appointment_date: { [Op.gte]: todayStart } } }),
      Appointment.count({ where: { appointment_date: { [Op.gte]: weekStart } } }),
      Appointment.count({ where: { appointment_date: { [Op.gte]: monthStart } } }),
      Consultation.count(),
      Consultation.count({ where: { createdAt: { [Op.gte]: monthStart } } }),
      LabOrder.count(),
      LabOrder.findAll({ attributes: ["status"], raw: true }).then((rows) => {
        const byStatus = {};
        rows.forEach((r) => { byStatus[r.status] = (byStatus[r.status] || 0) + 1; });
        return byStatus;
      }),
      LabResult.count(),
      LabTest.count(),
      Medication.count(),
      Prescription.count(),
      DispenseRecord.count(),
      Bill.count(),
      Bill.findAll({ attributes: ["status"], raw: true }).then((rows) => {
        const byStatus = {};
        rows.forEach((r) => { byStatus[r.status] = (byStatus[r.status] || 0) + 1; });
        return byStatus;
      }),
      Payment.sum("amount_paid").then((v) => Number(v) || 0),
      Payment.sum("amount_paid", { where: { payment_date: { [Op.gte]: monthStart } } }).then((v) => Number(v) || 0),
      Admission.count(),
      Admission.count({ where: { status: "admitted" } }),
      Admission.findAll({ attributes: ["status"], raw: true }).then((rows) => {
        const byStatus = {};
        rows.forEach((r) => { byStatus[r.status] = (byStatus[r.status] || 0) + 1; });
        return byStatus;
      }),
      Admission.count({ where: { discharge_date: { [Op.gte]: monthStart } } }),
      InventoryItem.count(),
      InventoryItem.count({
        where: sequelize.literal("quantity_available <= reorder_level"),
      }).catch(() => 0),
      Supplier.count(),
      PurchaseOrder.count(),
      PurchaseOrder.findAll({ attributes: ["status"], raw: true }).then((rows) => {
        const byStatus = {};
        rows.forEach((r) => { byStatus[r.status] = (byStatus[r.status] || 0) + 1; });
        return byStatus;
      }),
      MedicalReport.count(),
      VitalSigns.count(),
      User.count(),
      Event.count(),
      News.count(),
      Bed.findAll({ attributes: ["status"], raw: true }).then((rows) => {
        const byStatus = {};
        rows.forEach((r) => { byStatus[r.status] = (byStatus[r.status] || 0) + 1; });
        return byStatus;
      }),
    ]);

    const data = {
      overview: {
        totalHospitals: hospitalCount,
        totalDepartments: departmentCount,
        totalStaff: staffCount,
        totalPatients: patientCount,
        totalAppointments: appointmentCount,
        totalConsultations: consultationCount,
        totalRevenue: totalRevenueResult,
        activeAdmissions: admissionAdmitted,
        totalBeds: bedCount,
      },
      appointments: {
        total: appointmentCount,
        byStatus: appointmentByStatus,
        today: appointmentToday,
        thisWeek: appointmentThisWeek,
        thisMonth: appointmentThisMonth,
      },
      patients: {
        total: patientCount,
        active: patientActiveCount,
        byStatus: patientByStatus,
      },
      consultations: {
        total: consultationCount,
        thisMonth: consultationThisMonth,
      },
      laboratory: {
        totalOrders: labOrderCount,
        byStatus: labOrderByStatus,
        totalResults: labResultCount,
        totalTests: labTestCount,
      },
      pharmacy: {
        totalPrescriptions: prescriptionCount,
        totalDispensed: dispenseCount,
        totalMedications: medicationCount,
      },
      billing: {
        totalBills: billCount,
        byStatus: billByStatus,
        totalRevenue: totalRevenueResult,
        revenueThisMonth: paymentThisMonthResult,
      },
      admissions: {
        total: admissionCount,
        currentlyAdmitted: admissionAdmitted,
        byStatus: admissionByStatus,
        dischargedThisMonth: admissionThisMonth,
      },
      inventory: {
        totalItems: inventoryItemCount,
        lowStockCount: lowStockCount || 0,
        totalSuppliers: supplierCount,
        totalPurchaseOrders: purchaseOrderCount,
        purchaseOrdersByStatus: purchaseOrderByStatus || {},
      },
      wardsAndBeds: {
        totalWards: wardCount,
        totalBeds: bedCount,
        bedsByStatus: bedByStatus || {},
      },
      staff: {
        total: staffCount,
      },
      medicalReports: {
        total: medicalReportCount,
      },
      vitals: {
        total: vitalSignsCount,
      },
      users: {
        total: userCount,
      },
      eventsAndNews: {
        totalEvents: eventCount,
        totalNews: newsCount,
      },
    };

    return res.status(200).json({ success: true, data });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Error fetching statistics",
      error: error.message,
    });
  }
};

module.exports = { getAll };
