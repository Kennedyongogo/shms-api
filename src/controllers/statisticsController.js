const { Op } = require("sequelize");
const {
  Hospital,
  Department,
  Service,
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
      serviceCount,
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
      Service.count(),
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
        totalServices: serviceCount,
        totalStaff: staffCount,
        totalPatients: patientCount,
        totalAppointments: appointmentCount,
        totalConsultations: consultationCount,
        totalRevenue: totalRevenueResult,
        activeAdmissions: admissionAdmitted,
        totalBeds: bedCount,
      },
      departments: {
        total: departmentCount,
      },
      services: {
        total: serviceCount,
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

/**
 * GET /api/statistics/appointments/chart
 * Query: year (optional, default current), month (optional 1-12), groupBy (optional: 'month' | 'day')
 * Returns bar data for the appointments chart:
 * - If month is provided: one bar per day in that month (groupBy 'day' or default).
 * - If only year: one bar per month Jan–Dec (groupBy 'month' or default).
 */
const getAppointmentsChart = async (req, res) => {
  try {
    const now = new Date();
    const year = Math.min(9999, Math.max(1, parseInt(req.query.year, 10) || now.getFullYear()));
    const monthParam = req.query.month;
    const month = monthParam != null ? Math.min(12, Math.max(1, parseInt(monthParam, 10))) : null;
    const groupBy = (req.query.groupBy || (month ? "day" : "month")).toLowerCase();

    let bars;

    if (groupBy === "day" && month != null) {
      const daysInMonth = new Date(year, month, 0).getDate();
      const dayCounts = await Promise.all(
        Array.from({ length: daysInMonth }, (_, i) => {
          const day = i + 1;
          const start = new Date(year, month - 1, day, 0, 0, 0, 0);
          const end = new Date(year, month - 1, day, 23, 59, 59, 999);
          return Appointment.count({
            where: {
              appointment_date: {
                [Op.gte]: start,
                [Op.lte]: end,
              },
            },
          }).then((count) => ({ name: String(day), count }));
        })
      );
      bars = dayCounts;
    } else {
      const monthCounts = await Promise.all(
        Array.from({ length: 12 }, (_, i) => {
          const m = i + 1;
          const start = new Date(year, i, 1, 0, 0, 0, 0);
          const end = new Date(year, i + 1, 0, 23, 59, 59, 999);
          const monthNames = [
            "Jan", "Feb", "Mar", "Apr", "May", "Jun",
            "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
          ];
          return Appointment.count({
            where: {
              appointment_date: {
                [Op.gte]: start,
                [Op.lte]: end,
              },
            },
          }).then((count) => ({ name: monthNames[i], count }));
        })
      );
      bars = monthCounts;
    }

    return res.status(200).json({
      success: true,
      data: {
        bars,
        year,
        month: month ?? null,
        groupBy: groupBy === "day" ? "day" : "month",
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Error fetching appointments chart data",
      error: error.message,
    });
  }
};

/**
 * GET /api/statistics/revenue/chart
 * Query: year (optional, default current), month (optional 1-12), groupBy (optional: 'month' | 'day')
 * Returns bar data for revenue (sum of payments) by period:
 * - If month is provided: one bar per day in that month.
 * - If only year: one bar per month Jan–Dec.
 */
const getRevenueChart = async (req, res) => {
  try {
    const now = new Date();
    const year = Math.min(9999, Math.max(1, parseInt(req.query.year, 10) || now.getFullYear()));
    const monthParam = req.query.month;
    const month = monthParam != null ? Math.min(12, Math.max(1, parseInt(monthParam, 10))) : null;
    const groupBy = (req.query.groupBy || (month ? "day" : "month")).toLowerCase();

    let bars;

    if (groupBy === "day" && month != null) {
      const daysInMonth = new Date(year, month, 0).getDate();
      const dayAmounts = await Promise.all(
        Array.from({ length: daysInMonth }, (_, i) => {
          const day = i + 1;
          const start = new Date(year, month - 1, day, 0, 0, 0, 0);
          const end = new Date(year, month - 1, day, 23, 59, 59, 999);
          return Payment.sum("amount_paid", {
            where: {
              payment_date: {
                [Op.gte]: start,
                [Op.lte]: end,
              },
            },
          }).then((v) => ({ name: String(day), amount: Number(v) || 0 }));
        })
      );
      bars = dayAmounts;
    } else {
      const monthAmounts = await Promise.all(
        Array.from({ length: 12 }, (_, i) => {
          const start = new Date(year, i, 1, 0, 0, 0, 0);
          const end = new Date(year, i + 1, 0, 23, 59, 59, 999);
          const monthNames = [
            "Jan", "Feb", "Mar", "Apr", "May", "Jun",
            "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
          ];
          return Payment.sum("amount_paid", {
            where: {
              payment_date: {
                [Op.gte]: start,
                [Op.lte]: end,
              },
            },
          }).then((v) => ({ name: monthNames[i], amount: Number(v) || 0 }));
        })
      );
      bars = monthAmounts;
    }

    return res.status(200).json({
      success: true,
      data: {
        bars,
        year,
        month: month ?? null,
        groupBy: groupBy === "day" ? "day" : "month",
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Error fetching revenue chart data",
      error: error.message,
    });
  }
};

module.exports = { getAll, getAppointmentsChart, getRevenueChart };
