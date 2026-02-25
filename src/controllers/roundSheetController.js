const path = require("path");
const fs = require("fs");
const PDFDocument = require("pdfkit");
const { Admission, Patient, User, Bed, Ward, PatientDietOrder, DietType, MealPlan, Hospital } = require("../models");
const { Op } = require("sequelize");

const projectRoot = path.join(__dirname, "..", "..");
const pageWidth = 595.28;

/**
 * GET /api/meal-rounds?date=YYYY-MM-DD
 * Returns a list of current inpatients with their diet order and meal plan for the given date,
 * for the cook to print and do ward rounds.
 */
const getMealRounds = async (req, res) => {
  try {
    const dateParam = req.query.date;
    const date = dateParam && /^\d{4}-\d{2}-\d{2}$/.test(dateParam)
      ? dateParam
      : new Date().toISOString().slice(0, 10);

    const admissions = await Admission.findAll({
      where: { status: "admitted" },
      include: [
        { model: Patient, as: "patient", attributes: ["id", "full_name"], include: [{ model: User, as: "user", attributes: ["full_name"] }] },
        { model: Bed, as: "bed", attributes: ["id", "bed_number", "ward_id"], include: [{ model: Ward, as: "ward", attributes: ["id", "name"] }] },
      ],
      order: [["admission_date", "DESC"]],
    });

    if (admissions.length === 0) {
      return res.status(200).json({ success: true, data: [], date });
    }

    const admissionIds = admissions.map((a) => a.id);
    const orders = await PatientDietOrder.findAll({
      where: {
        admission_id: { [Op.in]: admissionIds },
        start_date: { [Op.lte]: date },
        [Op.or]: [{ end_date: null }, { end_date: { [Op.gte]: date } }],
      },
      include: [{ model: DietType, as: "dietType", attributes: ["id", "name"] }],
      order: [["start_date", "DESC"]],
    });

    // One active order per admission (take latest start_date per admission)
    const orderByAdmission = {};
    orders.forEach((o) => {
      if (!orderByAdmission[o.admission_id]) orderByAdmission[o.admission_id] = o;
    });

    const dietTypeIds = [...new Set(Object.values(orderByAdmission).map((o) => o.diet_type_id).filter(Boolean))];
    const mealPlans = await MealPlan.findAll({
      where: { diet_type_id: { [Op.in]: dietTypeIds } },
      order: [["createdAt", "DESC"]],
    });
    const planByDietType = {};
    mealPlans.forEach((p) => {
      if (!planByDietType[p.diet_type_id]) planByDietType[p.diet_type_id] = p;
    });

    const rows = admissions.map((adm) => {
      const order = orderByAdmission[adm.id];
      const dietTypeName = order?.dietType?.name ?? null;
      const plan = order ? planByDietType[order.diet_type_id] : null;
      const patientName = adm.patient?.full_name || adm.patient?.user?.full_name || "—";
      const wardName = adm.bed?.ward?.name ?? "—";
      const bedNumber = adm.bed?.bed_number ?? "—";

      return {
        admission_id: adm.id,
        patient_name: patientName,
        bed_number: bedNumber,
        ward_name: wardName,
        diet_type_name: dietTypeName,
        breakfast: plan?.breakfast ?? null,
        lunch: plan?.lunch ?? null,
        dinner: plan?.dinner ?? null,
        snack: plan?.snack ?? null,
      };
    });

    // Sort by ward then bed for round order
    rows.sort((a, b) => {
      const w = (a.ward_name || "").localeCompare(b.ward_name || "");
      if (w !== 0) return w;
      return String(a.bed_number).localeCompare(String(b.bed_number), undefined, { numeric: true });
    });

    return res.status(200).json({ success: true, data: rows, date });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Error loading meal rounds", error: error.message });
  }
};

/**
 * GET /api/meal-rounds/pdf?date=YYYY-MM-DD
 * Returns meal round sheet as PDF with hospital header (receipt-style) for download.
 */
const getMealRoundsPdf = async (req, res) => {
  try {
    const dateParam = req.query.date;
    const date = dateParam && /^\d{4}-\d{2}-\d{2}$/.test(dateParam)
      ? dateParam
      : new Date().toISOString().slice(0, 10);

    const admissions = await Admission.findAll({
      where: { status: "admitted" },
      include: [
        {
          model: Patient,
          as: "patient",
          attributes: ["id", "full_name", "hospital_id"],
          include: [
            { model: User, as: "user", attributes: ["full_name"] },
            { model: Hospital, as: "hospital", attributes: ["id", "name", "address", "phone", "email", "logo_path"], required: false },
          ],
        },
        { model: Bed, as: "bed", attributes: ["id", "bed_number", "ward_id"], include: [{ model: Ward, as: "ward", attributes: ["id", "name"] }] },
      ],
      order: [["admission_date", "DESC"]],
    });

    let rows = [];
    let facility = { name: "Hospital", address: "", phone: "", email: "", logo_path: null };
    if (admissions.length > 0) {
      const firstHospital = admissions[0].patient?.hospital;
      if (firstHospital) {
        facility = {
          name: firstHospital.name || "Hospital",
          address: firstHospital.address || "",
          phone: firstHospital.phone || "",
          email: firstHospital.email || "",
          logo_path: firstHospital.logo_path || null,
        };
      }
      const admissionIds = admissions.map((a) => a.id);
      const orders = await PatientDietOrder.findAll({
        where: {
          admission_id: { [Op.in]: admissionIds },
          start_date: { [Op.lte]: date },
          [Op.or]: [{ end_date: null }, { end_date: { [Op.gte]: date } }],
        },
        include: [{ model: DietType, as: "dietType", attributes: ["id", "name"] }],
        order: [["start_date", "DESC"]],
      });
      const orderByAdmission = {};
      orders.forEach((o) => {
        if (!orderByAdmission[o.admission_id]) orderByAdmission[o.admission_id] = o;
      });
      const dietTypeIds = [...new Set(Object.values(orderByAdmission).map((o) => o.diet_type_id).filter(Boolean))];
      const mealPlans = await MealPlan.findAll({
        where: { diet_type_id: { [Op.in]: dietTypeIds } },
        order: [["createdAt", "DESC"]],
      });
      const planByDietType = {};
      mealPlans.forEach((p) => {
        if (!planByDietType[p.diet_type_id]) planByDietType[p.diet_type_id] = p;
      });
      rows = admissions.map((adm) => {
        const order = orderByAdmission[adm.id];
        const plan = order ? planByDietType[order.diet_type_id] : null;
        return {
          patient_name: adm.patient?.full_name || adm.patient?.user?.full_name || "—",
          ward_name: adm.bed?.ward?.name ?? "—",
          bed_number: adm.bed?.bed_number ?? "—",
          diet_type_name: order?.dietType?.name ?? null,
          breakfast: plan?.breakfast ?? null,
          lunch: plan?.lunch ?? null,
          dinner: plan?.dinner ?? null,
          snack: plan?.snack ?? null,
        };
      });
      rows.sort((a, b) => {
        const w = (a.ward_name || "").localeCompare(b.ward_name || "");
        if (w !== 0) return w;
        return String(a.bed_number).localeCompare(String(b.bed_number), undefined, { numeric: true });
      });
    }

    const doc = new PDFDocument({ margin: 50, size: "A4" });
    const chunks = [];
    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => {
      const buffer = Buffer.concat(chunks);
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `attachment; filename="meal-round-sheet-${date}.pdf"`);
      res.send(buffer);
    });

    let headerY = 50;
    const logoWidth = 100;
    const logoHeight = 56;
    if (facility.logo_path) {
      const logoPath = path.isAbsolute(facility.logo_path)
        ? facility.logo_path
        : path.join(projectRoot, facility.logo_path.replace(/^[/\\]+/, ""));
      if (fs.existsSync(logoPath)) {
        try {
          const x = (pageWidth - logoWidth) / 2;
          doc.image(logoPath, x, headerY, { fit: [logoWidth, logoHeight], align: "center", valign: "center" });
          headerY += logoHeight + 12;
        } catch (_) {}
      }
    }
    doc.fontSize(18).font("Helvetica-Bold").text(facility.name, 50, headerY, { width: pageWidth - 100, align: "center" });
    doc.moveDown(0.5);
    doc.fontSize(10).font("Helvetica");
    if (facility.address) doc.text(facility.address, { align: "center" });
    if (facility.phone) doc.text(`Phone: ${facility.phone}`, { align: "center" });
    if (facility.email) doc.text(`Email: ${facility.email}`, { align: "center" });
    doc.moveDown(1);
    doc.moveTo(50, doc.y).lineTo(pageWidth - 50, doc.y).stroke();
    doc.moveDown(1);

    doc.fontSize(14).font("Helvetica-Bold").text("Meal Round Sheet", { align: "center" });
    doc.fontSize(10).font("Helvetica").text(`Date: ${date}`, { align: "center" });
    doc.moveDown(1.5);

    if (rows.length === 0) {
      doc.fontSize(10).text("No admitted patients with diet orders for this date.", { align: "center" });
      doc.end();
      return;
    }

    const left = 50;
    const right = pageWidth - 50;
    const tableCol1Width = 75;
    const tableCol2Width = right - left - tableCol1Width - 2;
    const rowHeight = 16;

    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      if (doc.y > 700) {
        doc.addPage();
        doc.y = 50;
      }
      doc.fontSize(10).font("Helvetica-Bold");
      doc.text(`#${i + 1}  ${r.ward_name} — Bed ${r.bed_number}  ${r.patient_name}`, left, doc.y, { width: right - left });
      if (r.diet_type_name) doc.font("Helvetica").fontSize(9).text(`Diet: ${r.diet_type_name}`, left);
      doc.moveDown(0.4);

      doc.fontSize(9);
      doc.font("Helvetica-Bold").text("Breakfast: ", left, doc.y, { continued: true });
      doc.font("Helvetica").text((r.breakfast || "—").substring(0, 85) + ((r.breakfast || "").length > 85 ? "…" : ""));
      doc.moveDown(0.25);
      doc.font("Helvetica-Bold").text("Lunch: ", left, doc.y, { continued: true });
      doc.font("Helvetica").text((r.lunch || "—").substring(0, 85) + ((r.lunch || "").length > 85 ? "…" : ""));
      doc.moveDown(0.25);
      doc.font("Helvetica-Bold").text("Dinner: ", left, doc.y, { continued: true });
      doc.font("Helvetica").text((r.dinner || "—").substring(0, 85) + ((r.dinner || "").length > 85 ? "…" : ""));
      doc.moveDown(0.25);
      doc.font("Helvetica-Bold").text("Snack: ", left, doc.y, { continued: true });
      doc.font("Helvetica").text((r.snack || "—").substring(0, 85) + ((r.snack || "").length > 85 ? "…" : ""));
      doc.moveDown(0.5);

      const tableTop = doc.y;
      doc.fontSize(8).font("Helvetica-Bold");
      doc.text("Meal", left, tableTop + 6);
      doc.text("Patient choice", left + tableCol1Width + 2, tableTop + 6);
      const headerBottom = tableTop + rowHeight;
      doc.moveTo(left, tableTop).lineTo(right, tableTop).stroke();
      doc.moveTo(left, headerBottom).lineTo(right, headerBottom).stroke();
      doc.moveTo(left, tableTop).lineTo(left, headerBottom + rowHeight * 4).stroke();
      doc.moveTo(left + tableCol1Width, tableTop).lineTo(left + tableCol1Width, headerBottom + rowHeight * 4).stroke();
      doc.moveTo(right, tableTop).lineTo(right, headerBottom + rowHeight * 4).stroke();

      const meals = ["Breakfast", "Lunch", "Dinner", "Snack"];
      for (let m = 0; m < meals.length; m++) {
        const rowY = headerBottom + m * rowHeight;
        doc.font("Helvetica").text(meals[m], left + 4, rowY + 5);
        doc.moveTo(left, rowY + rowHeight).lineTo(right, rowY + rowHeight).stroke();
      }
      doc.y = headerBottom + rowHeight * 4 + 14;
      doc.moveTo(left, doc.y).lineTo(right, doc.y).stroke();
      doc.moveDown(0.6);
    }

    doc.end();
  } catch (error) {
    return res.status(500).json({ success: false, message: "Error generating round sheet PDF", error: error.message });
  }
};

module.exports = { getMealRounds, getMealRoundsPdf };
