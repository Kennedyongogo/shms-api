const { Op } = require("sequelize");
const { getHospitalId } = require("../utils/hospitalScope");
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
  LabOrderItem,
  LabResultData,
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
  AuditLog,
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
  const yearStart = new Date(now.getFullYear(), 0, 1);
  return { now, todayStart, weekStart, monthStart, yearStart };
}

/**
 * GET /api/statistics
 * Returns all statistics grouped by domain for dashboard (cards, pie charts, bar charts, tabs).
 */
const getAll = async (req, res) => {
  try {
    const hid = getHospitalId(req);
    const hospWhere = hid != null ? { hospital_id: hid } : {};
    const hospitalCountWhere = hid != null ? { id: hid } : {};
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
      Hospital.count({ where: hospitalCountWhere }),
      Department.count({ where: hospWhere }),
      Service.count({ where: hospWhere }),
      hid != null
        ? Ward.count({
            include: [{ model: Department, as: "department", where: { hospital_id: hid }, required: true }],
          })
        : Ward.count(),
      hid != null
        ? Bed.count({
            include: [
              { model: Ward, as: "ward", required: true, include: [{ model: Department, as: "department", where: { hospital_id: hid }, required: true }] },
            ],
          })
        : Bed.count(),
      Staff.count({ where: hospWhere }),
      Patient.count({ where: hospWhere }),
      Patient.count({ where: { ...hospWhere, status: "active" } }),
      Patient.findAll({ attributes: ["status"], raw: true, where: hospWhere }).then((rows) => {
        const byStatus = { active: 0, inactive: 0, suspended: 0 };
        rows.forEach((r) => {
          const s = r.status || "active";
          if (Object.prototype.hasOwnProperty.call(byStatus, s)) byStatus[s] += 1;
          else byStatus[s] = 1;
        });
        return byStatus;
      }),
      Appointment.count({ where: hospWhere }),
      Appointment.findAll({ attributes: ["status"], raw: true, where: hospWhere }).then((rows) => {
        const byStatus = { pending: 0, confirmed: 0, completed: 0, cancelled: 0 };
        rows.forEach((r) => {
          const s = r.status || "pending";
          if (Object.prototype.hasOwnProperty.call(byStatus, s)) byStatus[s] += 1;
          else byStatus[s] = 1;
        });
        return byStatus;
      }),
      Appointment.count({ where: { ...hospWhere, appointment_date: { [Op.gte]: todayStart } } }),
      Appointment.count({ where: { ...hospWhere, appointment_date: { [Op.gte]: weekStart } } }),
      Appointment.count({ where: { ...hospWhere, appointment_date: { [Op.gte]: monthStart } } }),
      Consultation.count({ where: hospWhere }),
      Consultation.count({ where: { ...hospWhere, createdAt: { [Op.gte]: monthStart } } }),
      LabOrder.count({ where: hospWhere }),
      LabOrder.findAll({ attributes: ["status"], raw: true, where: hospWhere }).then((rows) => {
        const byStatus = { pending: 0, in_progress: 0, completed: 0, cancelled: 0 };
        rows.forEach((r) => {
          const s = r.status || "pending";
          if (Object.prototype.hasOwnProperty.call(byStatus, s)) byStatus[s] += 1;
          else byStatus[s] = 1;
        });
        return byStatus;
      }),
      hid != null
        ? LabResultData.count({
            include: [{ model: LabOrderItem, as: "labOrderItem", required: true, include: [{ model: LabOrder, as: "labOrder", where: { hospital_id: hid }, required: true }] }],
          })
        : LabResultData.count(),
      LabTest.count({ where: hospWhere }),
      Medication.count({ where: hospWhere }),
      Prescription.count({ where: hospWhere }),
      DispenseRecord.count({ where: hospWhere }),
      Bill.count({ where: hospWhere }),
      Bill.findAll({ attributes: ["status"], raw: true, where: hospWhere }).then((rows) => {
        const byStatus = { unpaid: 0, partial: 0, paid: 0, cancelled: 0 };
        rows.forEach((r) => {
          const s = r.status || "unpaid";
          if (Object.prototype.hasOwnProperty.call(byStatus, s)) byStatus[s] += 1;
          else byStatus[s] = 1;
        });
        return byStatus;
      }),
      Payment.sum("amount_paid", { where: hospWhere }).then((v) => Number(v) || 0),
      Payment.sum("amount_paid", { where: { ...hospWhere, payment_date: { [Op.gte]: monthStart } } }).then((v) => Number(v) || 0),
      Admission.count({ where: hospWhere }),
      Admission.count({ where: { ...hospWhere, status: "admitted" } }),
      Admission.findAll({ attributes: ["status"], raw: true, where: hospWhere }).then((rows) => {
        const byStatus = {};
        rows.forEach((r) => { byStatus[r.status] = (byStatus[r.status] || 0) + 1; });
        return byStatus;
      }),
      Admission.count({ where: { ...hospWhere, discharge_date: { [Op.gte]: monthStart } } }),
      InventoryItem.count({ where: hospWhere }),
      InventoryItem.count({
        where:
          hid != null
            ? { hospital_id: hid, [Op.and]: [sequelize.literal("quantity_available <= reorder_level")] }
            : sequelize.literal("quantity_available <= reorder_level"),
      }).catch(() => 0),
      Supplier.count(),
      PurchaseOrder.count(),
      PurchaseOrder.findAll({ attributes: ["status"], raw: true }).then((rows) => {
        const byStatus = { draft: 0, ordered: 0, received: 0, cancelled: 0 };
        rows.forEach((r) => {
          const s = r.status || "draft";
          if (Object.prototype.hasOwnProperty.call(byStatus, s)) byStatus[s] += 1;
          else byStatus[s] = 1;
        });
        return byStatus;
      }),
      hid != null ? MedicalReport.count({ include: [{ model: Patient, as: "patient", where: { hospital_id: hid }, required: true }] }) : MedicalReport.count(),
      hid != null ? VitalSigns.count({ include: [{ model: Consultation, as: "consultation", where: { hospital_id: hid }, required: true }] }) : VitalSigns.count(),
      User.count({ where: hospWhere }),
      Event.count({ where: hospWhere }),
      News.count({ where: hospWhere }),
      hid != null
        ? Bed.findAll({
            attributes: ["status"],
            raw: true,
            include: [
              { model: Ward, as: "ward", required: true, include: [{ model: Department, as: "department", where: { hospital_id: hid }, required: true }] },
            ],
          }).then((rows) => {
            const byStatus = { available: 0, occupied: 0, maintenance: 0 };
            rows.forEach((r) => {
              const s = r.status || "available";
              if (Object.prototype.hasOwnProperty.call(byStatus, s)) byStatus[s] += 1;
              else byStatus[s] = 1;
            });
            return byStatus;
          })
        : Bed.findAll({ attributes: ["status"], raw: true }).then((rows) => {
            const byStatus = { available: 0, occupied: 0, maintenance: 0 };
            rows.forEach((r) => {
              const s = r.status || "available";
              if (Object.prototype.hasOwnProperty.call(byStatus, s)) byStatus[s] += 1;
              else byStatus[s] = 1;
            });
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

    // Silver package: omit ward, admissions, inventory stats (clinic scope); frontend hides those tabs via menu.
    if (hid) {
      const hospital = await Hospital.findByPk(hid, { attributes: ["subscription_package"] });
      const pkg = hospital?.subscription_package;
      if (pkg === "silver") {
        delete data.wardsAndBeds;
        delete data.admissions;
        delete data.inventory;
        data.overview.activeAdmissions = null;
        data.overview.totalBeds = null;
      }
    }

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
    const hid = getHospitalId(req);
    const hospWhere = hid != null ? { hospital_id: hid } : {};
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
              ...hospWhere,
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
              ...hospWhere,
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
    const hid = getHospitalId(req);
    const hospWhere = hid != null ? { hospital_id: hid } : {};
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
              ...hospWhere,
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
              ...hospWhere,
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

/**
 * GET /api/statistics/pharmacy/chart
 * Returns medications with multiple quantity columns for a bar chart.
 * Each bar = one medication; frontend can switch which column is shown (quantity_available, quantity_in_pharmacy, reorder_level).
 */
const getPharmacyChart = async (req, res) => {
  try {
    const hid = getHospitalId(req);
    const hospWhere = hid != null ? { hospital_id: hid } : {};
    const medications = await Medication.findAll({
      where: hospWhere,
      attributes: ["id", "name"],
      include: [
        {
          model: InventoryItem,
          as: "inventoryItem",
          required: false,
          attributes: ["quantity_available", "quantity_in_pharmacy", "reorder_level"],
        },
      ],
      order: [["name", "ASC"]],
    });

    const bars = medications.map((m) => {
      const inv = m.inventoryItem;
      return {
        name: m.name || "Unnamed",
        quantity_available: inv ? Number(inv.quantity_available) || 0 : 0,
        quantity_in_pharmacy: inv ? Number(inv.quantity_in_pharmacy) || 0 : 0,
        reorder_level: inv ? Number(inv.reorder_level) || 0 : 0,
      };
    });

    return res.status(200).json({
      success: true,
      data: {
        bars,
        columns: [
          { key: "quantity_available", label: "Quantity in store" },
          { key: "quantity_in_pharmacy", label: "Quantity in pharmacy" },
          { key: "reorder_level", label: "Reorder level" },
        ],
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Error fetching pharmacy chart data",
      error: error.message,
    });
  }
};

/**
 * GET /api/statistics/admissions/chart
 * Query: year (optional, default current), month (optional 1-12), groupBy (optional: 'month' | 'day')
 * Returns bar data for admissions by admission_date:
 * - If month is provided: one bar per day in that month.
 * - If only year: one bar per month Jan–Dec.
 */
const getAdmissionsChart = async (req, res) => {
  try {
    const hid = getHospitalId(req);
    const hospWhere = hid != null ? { hospital_id: hid } : {};
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
          return Admission.count({
            where: {
              ...hospWhere,
              admission_date: {
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
          const start = new Date(year, i, 1, 0, 0, 0, 0);
          const end = new Date(year, i + 1, 0, 23, 59, 59, 999);
          const monthNames = [
            "Jan", "Feb", "Mar", "Apr", "May", "Jun",
            "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
          ];
          return Admission.count({
            where: {
              ...hospWhere,
              admission_date: {
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
      message: "Error fetching admissions chart data",
      error: error.message,
    });
  }
};

/**
 * GET /api/statistics/my-activity
 * Returns per-user activity stats (based on AuditLog) for the authenticated user:
 * - today: actions done since start of today
 * - month: actions done since start of this month
 * - year: actions done since start of this year
 * Includes breakdown by table_name and a small recent activity list.
 */
const getMyActivity = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, message: "Authentication required" });
    }

    const { todayStart, monthStart, yearStart, now } = getDateRanges();

    const logs = await AuditLog.findAll({
      where: {
        user_id: userId,
        timestamp: {
          [Op.gte]: yearStart,
        },
      },
      attributes: ["action", "table_name", "timestamp"],
      order: [["timestamp", "DESC"]],
      raw: true,
    });

    const baseBucket = () => ({ total: 0, byTable: {} });
    const today = baseBucket();
    const month = baseBucket();
    const year = baseBucket();

    const recent = [];

    logs.forEach((log, index) => {
      const ts = new Date(log.timestamp);
      if (Number.isNaN(ts.getTime())) return;

      const table = log.table_name || "other";

      if (ts >= yearStart) {
        year.total += 1;
        year.byTable[table] = (year.byTable[table] || 0) + 1;
      }
      if (ts >= monthStart) {
        month.total += 1;
        month.byTable[table] = (month.byTable[table] || 0) + 1;
      }
      if (ts >= todayStart) {
        today.total += 1;
        today.byTable[table] = (today.byTable[table] || 0) + 1;
      }

      if (index < 10) {
        recent.push({
          action: log.action,
          table_name: log.table_name,
          timestamp: log.timestamp,
        });
      }
    });

    const toTopTables = (bucket, limit = 5) => {
      const entries = Object.entries(bucket.byTable || {});
      entries.sort((a, b) => b[1] - a[1]);
      return entries.slice(0, limit).map(([table_name, count]) => ({ table_name, count }));
    };

    const data = {
      today: {
        total: today.total,
        byTable: today.byTable,
        topTables: toTopTables(today),
      },
      month: {
        total: month.total,
        byTable: month.byTable,
        topTables: toTopTables(month),
      },
      year: {
        total: year.total,
        byTable: year.byTable,
        topTables: toTopTables(year),
      },
      recent,
      generatedAt: now.toISOString(),
    };

    return res.status(200).json({ success: true, data });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Error fetching my activity statistics",
      error: error.message,
    });
  }
};

const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/**
 * GET /api/statistics/my-activity/chart?year=2026&month=3
 * Returns bar data for the authenticated user's audit activity:
 * - If month is provided (1-12): one bar per day in that month (name "1".."31", count).
 * - If only year: one bar per month Jan–Dec (name "Jan".."Dec", count).
 */
const getMyActivityChart = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, message: "Authentication required" });
    }

    const now = new Date();
    const year = Math.min(9999, Math.max(1, parseInt(req.query.year, 10) || now.getFullYear()));
    const monthParam = req.query.month;
    const month = monthParam != null ? Math.min(12, Math.max(1, parseInt(monthParam, 10))) : null;

    let bars;

    if (month != null) {
      const daysInMonth = new Date(year, month, 0).getDate();
      const dayCounts = await Promise.all(
        Array.from({ length: daysInMonth }, (_, i) => {
          const day = i + 1;
          const start = new Date(year, month - 1, day, 0, 0, 0, 0);
          const end = new Date(year, month - 1, day, 23, 59, 59, 999);
          return AuditLog.count({
            where: {
              user_id: userId,
              timestamp: {
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
          const start = new Date(year, i, 1, 0, 0, 0, 0);
          const end = new Date(year, i + 1, 0, 23, 59, 59, 999);
          return AuditLog.count({
            where: {
              user_id: userId,
              timestamp: {
                [Op.gte]: start,
                [Op.lte]: end,
              },
            },
          }).then((count) => ({ name: MONTH_NAMES[i], count }));
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
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Error fetching my activity chart",
      error: error.message,
    });
  }
};

/**
 * GET /api/statistics/my-activity/detail?year=2026&month=3&day=5
 * Returns aggregated activity for the authenticated user in a specific period:
 * - If day is provided: that specific day
 * - Else if month is provided: that month
 * - Else: whole year
 * Response rows: [{ table_name, count }]
 */
const getMyActivityDetail = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, message: "Authentication required" });
    }

    const now = new Date();
    const year = Math.min(9999, Math.max(1, parseInt(req.query.year, 10) || now.getFullYear()));
    const monthParam = req.query.month;
    const dayParam = req.query.day;

    let start;
    let end;

    if (dayParam != null && monthParam != null) {
      const month = Math.min(12, Math.max(1, parseInt(monthParam, 10)));
      const day = Math.min(31, Math.max(1, parseInt(dayParam, 10)));
      start = new Date(year, month - 1, day, 0, 0, 0, 0);
      end = new Date(year, month - 1, day, 23, 59, 59, 999);
    } else if (monthParam != null) {
      const month = Math.min(12, Math.max(1, parseInt(monthParam, 10)));
      start = new Date(year, month - 1, 1, 0, 0, 0, 0);
      end = new Date(year, month, 0, 23, 59, 59, 999);
    } else {
      start = new Date(year, 0, 1, 0, 0, 0, 0);
      end = new Date(year, 11, 31, 23, 59, 59, 999);
    }

    const rows = await AuditLog.findAll({
      attributes: [
        "table_name",
        [sequelize.fn("COUNT", sequelize.col("id")), "count"],
      ],
      where: {
        user_id: userId,
        timestamp: {
          [Op.gte]: start,
          [Op.lte]: end,
        },
      },
      group: ["table_name"],
      order: [[sequelize.literal("count"), "DESC"]],
      raw: true,
    });

    const normalized = rows.map((r) => ({
      table_name: r.table_name || "other",
      count: Number(r.count) || 0,
    }));

    return res.status(200).json({
      success: true,
      data: {
        year,
        month: monthParam != null ? Number(monthParam) : null,
        day: dayParam != null ? Number(dayParam) : null,
        rows: normalized,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Error fetching my activity detail",
      error: error.message,
    });
  }
};

/**
 * GET /api/statistics/packages/hospitals
 * Returns hospital counts grouped by subscription_package.
 * - Super Admin (no hospital_id scope): returns counts for all hospitals.
 * - Hospital-scoped user: returns a { silver|gold } 1/0 split for that hospital.
 */
const getHospitalsCountByPackage = async (req, res) => {
  try {
    const hid = getHospitalId(req);

    // Scoped user: return counts for the single hospital (1 for its package, 0 for the other).
    if (hid != null) {
      const hospital = await Hospital.findByPk(hid, { attributes: ["subscription_package"] });
      const pkg = hospital?.subscription_package || "silver";

      const silver = pkg === "silver" ? 1 : 0;
      const gold = pkg === "gold" ? 1 : 0;

      return res.status(200).json({
        success: true,
        data: {
          total: 1,
          silver,
          gold,
        },
      });
    }

    // Super Admin: aggregate across all hospitals.
    const rows = await Hospital.findAll({
      attributes: [
        "subscription_package",
        [sequelize.fn("COUNT", sequelize.col("id")), "count"],
      ],
      group: ["subscription_package"],
      raw: true,
    });

    let silver = 0;
    let gold = 0;
    let total = 0;

    for (const r of rows) {
      const pkg = r.subscription_package || "silver";
      const count = Number(r.count) || 0;
      total += count;
      if (pkg === "silver") silver += count;
      if (pkg === "gold") gold += count;
    }

    return res.status(200).json({
      success: true,
      data: {
        total,
        silver,
        gold,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Error fetching hospitals count by package",
      error: error.message,
    });
  }
};

module.exports = {
  getAll,
  getAppointmentsChart,
  getRevenueChart,
  getPharmacyChart,
  getAdmissionsChart,
  getMyActivity,
  getMyActivityChart,
  getMyActivityDetail,
  getHospitalsCountByPackage,
};
