const path = require("path");
const fs = require("fs");
const PDFDocument = require("pdfkit");
const {
  Payment,
  Bill,
  BillItem,
  Patient,
  Hospital,
  User,
  Appointment,
  Consultation,
  Staff,
  Prescription,
  PrescriptionItem,
  Medication,
  Admission,
  Bed,
  Ward,
  LabOrder,
} = require("../models");

/**
 * Build full receipt data for a payment (used by GET receipt and by process payment response).
 * @param {string} paymentId - Payment UUID
 * @returns {Promise<object>} Receipt object for frontend (print/PDF)
 * @throws if payment not found
 */
async function getReceiptData(paymentId) {
  const payment = await Payment.findByPk(paymentId, {
      include: [
        {
          model: Bill,
          as: "bill",
          required: true,
          include: [
            { model: Patient, as: "patient", required: true, include: [{ model: Hospital, as: "hospital", attributes: ["id", "name", "address", "phone", "email", "logo_path"] }] },
            { model: BillItem, as: "items", required: false },
          ],
        },
      ],
  });
  if (!payment) return null;

  const bill = payment.bill;
  const patient = bill.patient;
  const hospital = patient.hospital;
  const facility = hospital
    ? { name: hospital.name, address: hospital.address || null, phone: hospital.phone || null, email: hospital.email || null, logo_path: hospital.logo_path || null }
    : { name: "Hospital", address: null, phone: null, email: null, logo_path: null };

    const items = bill.items || [];
    const lineItems = [];

    for (const item of items) {
      const amount = Number(item.amount || 0);
      const refId = item.reference_id;
      const type = item.item_type;

      let description = type;
      let details = null;

      if (type === "appointment" && refId) {
        const appt = await Appointment.findByPk(refId, {
          include: [
            { model: Consultation, as: "consultation", required: false },
            { model: Staff, as: "doctor", required: false, attributes: ["id"], include: [{ model: User, as: "user", required: false, attributes: ["full_name"] }] },
          ],
        });
        if (appt) {
          const docName = appt.doctor?.user?.full_name || "Doctor";
          const apptDate = appt.appointment_date ? new Date(appt.appointment_date).toLocaleDateString() : "";
          description = "Consultation";
          details = { type: "consultation", appointmentDate: apptDate, doctor: docName };
        }
      } else if (type === "prescription" && refId) {
        const prescription = await Prescription.findByPk(refId, {
          include: [
            { model: Staff, as: "doctor", required: false, attributes: ["id"], include: [{ model: User, as: "user", required: false, attributes: ["full_name"] }] },
            { model: PrescriptionItem, as: "items", required: false, include: [{ model: Medication, as: "medication", attributes: ["name"] }] },
          ],
        });
        if (prescription) {
          const docName = prescription.doctor?.user?.full_name || "Doctor";
          const meds = (prescription.items || []).map((pi) => pi.medication?.name || "Medication").filter(Boolean);
          description = "Prescription";
          details = { type: "prescription", prescriptionDate: prescription.prescription_date ? new Date(prescription.prescription_date).toLocaleDateString() : "", doctor: docName, medications: meds };
        }
      } else if (type === "admission" && refId) {
        const admission = await Admission.findByPk(refId, {
          include: [
            { model: Bed, as: "bed", required: false, include: [{ model: Ward, as: "ward", attributes: ["name"] }] },
            { model: Staff, as: "doctor", required: false, attributes: ["id"], include: [{ model: User, as: "user", required: false, attributes: ["full_name"] }] },
          ],
        });
        if (admission) {
          const wardName = admission.bed?.ward?.name || "Ward";
          const bedLabel = admission.bed?.bed_number || admission.bed?.id || "";
          const admDate = admission.admission_date ? new Date(admission.admission_date).toLocaleDateString() : "";
          const disDate = admission.discharge_date ? new Date(admission.discharge_date).toLocaleDateString() : null;
          description = "Ward / Admission";
          details = { type: "ward", ward: wardName, bed: bedLabel, admissionDate: admDate, dischargeDate: disDate };
        }
      } else if (type === "lab_order" && refId) {
        const order = await LabOrder.findByPk(refId);
        if (order) {
          description = "Lab Order";
          details = { type: "lab_order", orderId: order.id };
        }
      }

      lineItems.push({
        item_type: type,
        amount,
        description,
        details,
      });
    }

  return {
    receipt_number: payment.receipt_number || `PAY-${payment.id}`,
    payment_date: payment.payment_date,
    amount_paid: Number(payment.amount_paid || 0),
    payment_method: payment.payment_method,
    facility,
    patient: {
      id: patient.id,
      full_name: patient.full_name,
      email: patient.email,
      phone: patient.phone,
    },
    bill_total: Number(bill.total_amount || 0),
    bill_status: bill.status,
    items: lineItems,
  };
}

/**
 * GET /api/payments/:id/receipt
 * Returns receipt data for a payment (for printing: prescription, consultation, ward/admission, lab).
 * Frontend can render this as HTML and trigger print or PDF.
 */
async function getReceipt(req, res) {
  try {
    const { id: paymentId } = req.params;
    const receipt = await getReceiptData(paymentId);
    if (!receipt) return res.status(404).json({ success: false, message: "Payment not found" });
    return res.status(200).json({ success: true, data: receipt });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Error fetching receipt", error: error.message });
  }
}

/**
 * GET /api/payments/:id/receipt/pdf
 * Returns receipt as PDF with hospital header (same style as medical report).
 */
async function getReceiptPdf(req, res) {
  try {
    const { id: paymentId } = req.params;
    const asAttachment = req.query.download === "1" || req.query.download === "true";
    const receipt = await getReceiptData(paymentId);
    if (!receipt) return res.status(404).json({ success: false, message: "Payment not found" });

    const header = {
      name: receipt.facility?.name || "Hospital",
      address: receipt.facility?.address || "",
      phone: receipt.facility?.phone || "",
      email: receipt.facility?.email || "",
      logo_path: receipt.facility?.logo_path || null,
    };

    const doc = new PDFDocument({ margin: 50, size: "A4" });
    const chunks = [];
    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => {
      const buffer = Buffer.concat(chunks);
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", asAttachment ? 'attachment; filename="receipt.pdf"' : 'inline; filename="receipt.pdf"');
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
          // skip logo if image fails
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

    doc.fontSize(12).font("Helvetica-Bold").text("Payment Receipt", { align: "center" });
    doc.moveDown(1);
    doc.fontSize(10).font("Helvetica");

    doc.text(`Receipt No: ${receipt.receipt_number}`, { continued: false });
    doc.text(`Date: ${receipt.payment_date ? new Date(receipt.payment_date).toLocaleString() : ""}`, { continued: false });
    doc.text(`Payment Method: ${receipt.payment_method || ""}`, { continued: false });
    doc.moveDown(0.5);
    doc.text(`Patient: ${receipt.patient?.full_name || ""}`, { continued: false });
    if (receipt.patient?.phone) doc.text(`Phone: ${receipt.patient.phone}`, { continued: false });
    doc.moveDown(1);

    doc.fontSize(10).font("Helvetica-Bold").text("Items", { continued: false });
    doc.font("Helvetica");
    const tableTop = doc.y + 6;
    doc.fontSize(9).text("Description", 50, tableTop);
    doc.text("Amount", pageWidth - 120, tableTop);
    doc.moveTo(50, tableTop + 2).lineTo(pageWidth - 50, tableTop + 2).stroke();
    doc.moveDown(0.3);
    let rowY = doc.y;
    for (const item of receipt.items || []) {
      const desc = item.details ? `${item.description} (${item.details.doctor || item.details.ward || item.details.prescriptionDate || ""})` : item.description;
      doc.text(desc.substring(0, 50) + (desc.length > 50 ? "…" : ""), 50, rowY);
      doc.text(Number(item.amount || 0).toFixed(2), pageWidth - 120, rowY);
      rowY += 18;
    }
    doc.y = rowY + 6;
    doc.moveTo(50, doc.y).lineTo(pageWidth - 50, doc.y).stroke();
    doc.moveDown(0.5);
    doc.font("Helvetica-Bold").text(`Amount Paid: ${Number(receipt.amount_paid || 0).toFixed(2)}`, pageWidth - 120, doc.y, { align: "right" });
    doc.moveDown(1);
    doc.font("Helvetica").fontSize(9).text("Thank you for your payment.", { align: "center" });
    doc.end();
  } catch (error) {
    return res.status(500).json({ success: false, message: "Error generating receipt PDF", error: error.message });
  }
}

module.exports = { getReceipt, getReceiptPdf, getReceiptData };
