const fs = require("fs");
const path = require("path");
const PDFDocument = require("pdfkit");
const {
  LabResultData,
  LabOrderItem,
  LabTest,
  LabOrder,
  Patient,
  Hospital,
  Staff,
  User,
  LabTestTemplate,
} = require("../models");

function normalizeScalarForCompare(v) {
  if (v === null || v === undefined) return null;
  if (typeof v === "boolean") return v;
  if (typeof v === "number") return v;
  const s = String(v).trim();
  const lower = s.toLowerCase();
  if (lower === "true") return true;
  if (lower === "false") return false;
  if (s !== "" && /^-?\d+(\.\d+)?$/.test(s)) {
    const n = Number(s);
    return Number.isFinite(n) ? n : s;
  }
  return s;
}

function evaluateShowIfRule(rule, values) {
  if (!rule || typeof rule !== "object") return true;
  if (Array.isArray(rule.all)) return rule.all.every((r) => evaluateShowIfRule(r, values));
  if (Array.isArray(rule.any)) return rule.any.some((r) => evaluateShowIfRule(r, values));

  const key = rule.key ?? rule.field ?? rule.dep_key ?? null;
  if (!key) return true;
  const expected = rule.equals ?? rule.value ?? null;
  const actual = values?.[key];

  if (Array.isArray(actual)) {
    const normalizedArray = actual.map((x) => normalizeScalarForCompare(x));
    const nExpected = normalizeScalarForCompare(expected);
    return normalizedArray.some((x) => x === nExpected);
  }

  const nActual = normalizeScalarForCompare(actual);
  const nExpected = normalizeScalarForCompare(expected);

  if (nActual === null) return nExpected === null;
  return nActual === nExpected;
}

function shouldShowField(q, values) {
  const rule = q?.show_if ?? q?.visible_if ?? q?.showIf ?? null;
  return evaluateShowIfRule(rule, values);
}

function formatFieldValue(field, value) {
  if (value === null || value === undefined) return "—";
  const type = String(field?.type || "text").toLowerCase();

  if (type === "checkbox" || type === "boolean") {
    return value === true || String(value).toLowerCase() === "true" ? "Yes" : "No";
  }

  if (Array.isArray(value)) {
    if (type === "multi_text") return value.map(String).join("\n");
    return value.map(String).join(", ");
  }

  return String(value);
}

async function getLabResultReceiptData(resultId, req) {
  const hid = req.user?.hospital_id ?? null;

  const include = [
    {
      model: LabOrderItem,
      as: "labOrderItem",
      required: true,
      include: [
        { model: LabTest, as: "labTest", required: false, include: [{ model: LabTestTemplate, as: "template", required: false }] },
        {
          model: LabOrder,
          as: "labOrder",
          required: false,
          include: [
            {
              model: Patient,
              as: "patient",
              required: false,
              include: [
                {
                  model: Hospital,
                  as: "hospital",
                  required: false,
                  attributes: ["id", "name", "address", "phone", "email", "logo_path"],
                },
              ],
            },
          ],
        },
      ],
    },
    {
      model: Staff,
      as: "labTechnician",
      required: false,
      include: [{ model: User, as: "user", attributes: ["full_name"], required: false }],
    },
  ];

  const record = await LabResultData.findByPk(resultId, { include });
  if (!record) return null;

  // Enforce hospital scoping if enabled
  if (hid != null) {
    const orderHospitalId = record?.labOrderItem?.labOrder?.hospital_id;
    // If labOrder is missing hospital_id for some reason, fallback to patient's hospital id
    const patientHospitalId = record?.labOrderItem?.labOrder?.patient?.hospital?.id;
    const effective = orderHospitalId || patientHospitalId;
    if (effective && String(effective) !== String(hid)) return null;
  }

  const hospital = record?.labOrderItem?.labOrder?.patient?.hospital || null;
  return {
    hospital: hospital
      ? {
          name: hospital.name,
          address: hospital.address || "",
          phone: hospital.phone || "",
          email: hospital.email || "",
          logo_path: hospital.logo_path || null,
        }
      : { name: "Hospital" },
    patientName:
      record?.labOrderItem?.labOrder?.patient?.full_name ||
      record?.labOrderItem?.labOrder?.patient?.user?.full_name ||
      "",
    testName: record?.labOrderItem?.labTest?.test_name || "",
    technicianName: record?.labTechnician?.user?.full_name || "",
    resultDate: record?.result_date || record?.createdAt || null,
    templateSnapshot: record?.template_snapshot || null,
    results: record?.results || {},
    interpretation: record?.interpretation || "",
  };
}

/**
 * GET /api/lab-results/:id/receipt/pdf
 * Lab result as PDF with hospital header and template-driven field list.
 */
async function getLabResultReceiptPdf(req, res) {
  try {
    const { id } = req.params;
    const asAttachment = req.query.download === "1" || req.query.download === "true";

    const receipt = await getLabResultReceiptData(id, req);
    if (!receipt) return res.status(404).json({ success: false, message: "Lab result not found" });

    const header = receipt.hospital || { name: "Hospital" };

    const doc = new PDFDocument({ margin: 50, size: "A4" });
    const chunks = [];
    doc.on("data", (chunk) => chunks.push(chunk));

    doc.on("end", () => {
      const buffer = Buffer.concat(chunks);
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader(
        "Content-Disposition",
        asAttachment ? 'attachment; filename="lab-result.pdf"' : 'inline; filename="lab-result.pdf"'
      );
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
          // ignore logo
        }
      }
    }

    doc.fontSize(18).font("Helvetica-Bold").text(header.name || "Hospital", 50, headerY, {
      width: pageWidth - 100,
      align: "center",
    });
    doc.moveDown(0.5);
    doc.fontSize(10).font("Helvetica");
    if (header.address) doc.text(header.address, { align: "center" });
    if (header.phone) doc.text(`Phone: ${header.phone}`, { align: "center" });
    if (header.email) doc.text(`Email: ${header.email}`, { align: "center" });

    doc.moveDown(1);
    doc.moveTo(50, doc.y).lineTo(pageWidth - 50, doc.y).stroke();
    doc.moveDown(1.5);

    doc.fontSize(12).font("Helvetica-Bold").text("Lab Result", { align: "center" });
    doc.moveDown(1);

    const dt = receipt.resultDate ? new Date(receipt.resultDate).toLocaleString() : "";
    doc.fontSize(10).font("Helvetica");
    doc.text(`Date: ${dt}`);
    doc.text(`Patient: ${receipt.patientName || ""}`);
    doc.text(`Test: ${receipt.testName || ""}`);
    if (receipt.technicianName) doc.text(`Technician: ${receipt.technicianName}`);

    doc.moveDown(1);

    doc.font("Helvetica-Bold").fontSize(10).text("Results");
    doc.font("Helvetica").fontSize(10);

    const fields = Array.isArray(receipt.templateSnapshot?.fields) ? receipt.templateSnapshot.fields : [];
    const values = receipt.results || {};

    // Render template-driven answers
    let y = doc.y + 6;
    for (const q of fields) {
      if (!shouldShowField(q, values)) continue;
      const label = q?.label || q?.key || "—";
      const val = formatFieldValue(q, values?.[q?.key]);
      const line = `${label}`;
      doc.font("Helvetica-Bold").text(line, 50, y);
      y = doc.y + 2;
      doc.font("Helvetica").text(String(val), 50, y);
      y = doc.y + 8;
    }

    if (!fields.length) {
      // Fallback: show raw key/value pairs
      const entries = Object.entries(values);
      if (entries.length === 0) {
        doc.font("Helvetica").text("—");
      } else {
        for (const [k, v] of entries.slice(0, 30)) {
          doc.font("Helvetica-Bold").text(`${k}`, 50, doc.y);
          doc.font("Helvetica").text(Array.isArray(v) ? v.join(", ") : String(v), 50, doc.y + 2);
          doc.moveDown(1);
        }
      }
    }

    doc.moveDown(0.5);
    doc.font("Helvetica-Bold").fontSize(10).text("Interpretation");
    doc.font("Helvetica").fontSize(10);
    doc.text(receipt.interpretation ? String(receipt.interpretation) : "—");

    doc.moveDown(1);
    doc.font("Helvetica").fontSize(9).text("Thank you for your visit.", { align: "center" });

    doc.end();
  } catch (error) {
    return res.status(500).json({ success: false, message: "Error generating lab result receipt PDF", error: error.message });
  }
}

module.exports = {
  getLabResultReceiptPdf,
};

