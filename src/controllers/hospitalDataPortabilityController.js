const bcrypt = require("bcryptjs");
const { User } = require("../models");
const { buildHospitalExport, purgeHospitalData } = require("../services/hospitalPortabilityService");

const CONFIRM_PURGE_PHRASE = "DELETE MY ORGANIZATION";

function assertOwnHospital(req, hospitalId) {
  const hid = req.user?.hospital_id;
  if (hid == null || String(hid) !== String(hospitalId)) {
    const err = new Error("You can only manage data for your own hospital.");
    err.status = 403;
    throw err;
  }
}

/**
 * GET /api/hospitals/:id/export-data
 * Super Admin — downloads JSON snapshot of all hospital-scoped data (passwords never included).
 */
const exportData = async (req, res) => {
  try {
    const { id } = req.params;
    assertOwnHospital(req, id);
    const payload = await buildHospitalExport(id);
    const filename = `hospital-${id}-export-${new Date().toISOString().slice(0, 10)}.json`;
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    return res.status(200).send(JSON.stringify(payload, null, 2));
  } catch (error) {
    const status = error.status || 500;
    return res.status(status).json({
      success: false,
      message: error.message || "Error exporting hospital data",
    });
  }
};

/**
 * POST /api/hospitals/:id/purge-organization
 * Body: { password: string, confirmPhrase: "DELETE MY ORGANIZATION" }
 * Irreversibly deletes the hospital and all related rows. Caller must clear client session after.
 */
const purgeOrganization = async (req, res) => {
  try {
    const { id } = req.params;
    assertOwnHospital(req, id);

    const { password, confirmPhrase } = req.body || {};
    if (!password || typeof password !== "string") {
      return res.status(400).json({ success: false, message: "password is required" });
    }
    if (String(confirmPhrase) !== CONFIRM_PURGE_PHRASE) {
      return res.status(400).json({
        success: false,
        message: `Type the exact phrase: ${CONFIRM_PURGE_PHRASE}`,
      });
    }

    const user = await User.findByPk(req.userId, { attributes: ["id", "password", "hospital_id"] });
    if (!user || String(user.hospital_id) !== String(id)) {
      return res.status(403).json({ success: false, message: "Access denied" });
    }

    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      return res.status(400).json({ success: false, message: "Incorrect password" });
    }

    const result = await purgeHospitalData(id);
    return res.status(200).json({ success: true, ...result });
  } catch (error) {
    const status = error.status || 500;
    return res.status(status).json({
      success: false,
      message: error.message || "Error deleting organization",
    });
  }
};

module.exports = {
  exportData,
  purgeOrganization,
};
