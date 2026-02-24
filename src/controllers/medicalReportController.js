const path = require("path");
const fs = require("fs");
const PDFDocument = require("pdfkit");
const { MedicalReport, Patient, Staff, User, Consultation, Appointment, Hospital } = require("../models");
const { parsePagination } = require("../utils/crudControllerFactory");
const { auditLog } = require("../utils/auditLog");

const include = [
  { model: Patient, as: "patient", attributes: ["id", "full_name"], required: false, include: [{ model: User, as: "user", attributes: ["id", "full_name"], required: false }] },
  { model: Staff, as: "doctor", attributes: ["id", "staff_type"], required: false, include: [{ model: User, as: "user", attributes: ["id", "full_name"], required: false }] },
  { model: Consultation, as: "consultation", required: false, attributes: ["id", "symptoms", "diagnosis", "notes"] },
];

const create = async (req, res) => {
  try {
    const { patient_id, doctor_id, consultation_id, report_text } = req.body;
    if (!report_text || typeof report_text !== "string" || !report_text.trim()) {
      return res.status(400).json({ success: false, message: "report_text is required" });
    }
    if (!patient_id) {
      return res.status(400).json({ success: false, message: "patient_id is required" });
    }
    const report = await MedicalReport.create({
      patient_id,
      doctor_id: doctor_id || null,
      consultation_id: consultation_id || null,
      report_text: report_text.trim(),
    });
    if (consultation_id) {
      const consultation = await Consultation.findByPk(consultation_id, { attributes: ["id", "appointment_id"] });
      if (consultation?.appointment_id) {
        await Appointment.update(
          { status: "completed" },
          { where: { id: consultation.appointment_id } }
        );
      }
    }
    const created = await MedicalReport.findByPk(report.id, { include });
    await auditLog(req, { action: "CREATE_MEDICALREPORT", table_name: "MedicalReport", record_id: report.id });
    return res.status(201).json({ success: true, data: created });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Error creating medical report",
      error: error.message,
    });
  }
};

const list = async (req, res) => {
  try {
    const { page, limit, offset } = parsePagination(req.query);
    const { consultation_id, patient_id } = req.query;
    const where = {};
    if (consultation_id) where.consultation_id = consultation_id;
    if (patient_id) where.patient_id = patient_id;

    const { count, rows } = await MedicalReport.findAndCountAll({
      where,
      limit,
      offset,
      include,
      order: [["created_at", "DESC"]],
    });
    return res.status(200).json({
      success: true,
      data: rows,
      pagination: { total: count, page, limit, totalPages: Math.ceil(count / limit) },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Error listing medical reports",
      error: error.message,
    });
  }
};

const getById = async (req, res) => {
  try {
    const { id } = req.params;
    const report = await MedicalReport.findByPk(id, { include });
    if (!report) return res.status(404).json({ success: false, message: "Medical report not found" });
    return res.status(200).json({ success: true, data: report });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Error fetching medical report",
      error: error.message,
    });
  }
};

const includeForPdf = [
  { model: Patient, as: "patient", attributes: ["id"], required: false, include: [{ model: Hospital, as: "hospital", attributes: ["name", "address", "phone", "email", "logo_path"], required: false }] },
  { model: Staff, as: "doctor", attributes: ["id"], required: false, include: [{ model: Hospital, as: "hospital", attributes: ["name", "address", "phone", "email", "logo_path"], required: false }] },
];

const getPdf = async (req, res) => {
  try {
    const { id } = req.params;
    const asAttachment = req.query.download === "1" || req.query.download === "true";
    const report = await MedicalReport.findByPk(id, { include: includeForPdf });
    if (!report) return res.status(404).json({ success: false, message: "Medical report not found" });

    const hospital = report.patient?.hospital || report.doctor?.hospital || {};
    const header = {
      name: hospital.name || "Hospital",
      address: hospital.address || "",
      phone: hospital.phone || "",
      email: hospital.email || "",
      logo_path: hospital.logo_path || null,
    };

    const doc = new PDFDocument({ margin: 50, size: "A4" });
    const chunks = [];
    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => {
      const buffer = Buffer.concat(chunks);
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", asAttachment ? 'attachment; filename="medical-report.pdf"' : 'inline; filename="medical-report.pdf"');
      res.send(buffer);
    });

    const pageWidth = 595.28;
    const logoWidth = 100;
    const logoHeight = 56;
    const projectRoot = path.join(__dirname, "..", "..");
    let headerY = 50;
    if (header.logo_path) {
      const logoPath = path.isAbsolute(header.logo_path)
        ? header.logo_path
        : path.join(projectRoot, header.logo_path.replace(/^[/\\]+/, ""));
      if (fs.existsSync(logoPath)) {
        try {
          const x = (pageWidth - logoWidth) / 2;
          doc.image(logoPath, x, headerY, { fit: [logoWidth, logoHeight], align: "center", valign: "center" });
          headerY += logoHeight + 12;
        } catch {
          // skip logo if image fails (e.g. unsupported format)
        }
      }
    }

    doc.fontSize(18).font("Helvetica-Bold").text(header.name, 50, headerY, { width: pageWidth - 100, align: "center" });
    doc.moveDown(0.5);
    doc.fontSize(10).font("Helvetica");
    if (header.address) doc.text(header.address, { align: "center" });
    if (header.phone) doc.text(`Phone: ${header.phone}`, { align: "center" });
    if (header.email) doc.text(`Email: ${header.email}`, { align: "center" });
    doc.moveDown(1);
    doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke();
    doc.moveDown(1.5);

    doc.fontSize(12).font("Helvetica-Bold").text("Medical Report", { align: "center" });
    doc.moveDown(1);
    doc.fontSize(10).font("Helvetica");
    const reportText = (report.report_text || "").trim() || "No content.";
    doc.text(reportText, { align: "left", lineGap: 4 });
    doc.end();
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Error generating PDF",
      error: error.message,
    });
  }
};

module.exports = { create, list, getById, getPdf };
