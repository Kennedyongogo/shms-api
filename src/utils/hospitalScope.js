/**
 * Multi-tenant hospital scoping.
 * When req.user.hospital_id is set (e.g. Super Admin / staff of a hospital), all data must be
 * restricted to that hospital. The first user who registers (Super Admin) is tied to their
 * hospital on registration; all subsequent API calls use req.user.hospital_id to filter.
 */

const { Op } = require("sequelize");

/**
 * Returns where clause for hospital_id when the user belongs to a hospital.
 * Use in getAll: where: { ...otherWhere, ...scopeByHospital(req) }
 * When user has no hospital_id (legacy global admin), returns {} so no filter is applied.
 */
function scopeByHospital(req) {
  const hid = req.user?.hospital_id;
  if (hid == null) return {};
  return { hospital_id: hid };
}

/**
 * Returns the hospital_id the current user is scoped to, or null if not scoped.
 */
function getHospitalId(req) {
  return req.user?.hospital_id ?? null;
}

/**
 * Ensures the record belongs to the user's hospital. Use in getById/update/remove.
 * Returns true if user has no hospital_id (global) or record.hospital_id matches.
 */
function belongsToUserHospital(record, req) {
  const hid = req.user?.hospital_id;
  if (hid == null) return true;
  return record && record.hospital_id === hid;
}

/**
 * For create: merge hospital_id from req.user into body if model is hospital-scoped.
 */
function withHospitalId(body, req) {
  const hid = req.user?.hospital_id;
  if (hid == null) return body;
  return { ...body, hospital_id: body.hospital_id ?? hid };
}

module.exports = {
  scopeByHospital,
  getHospitalId,
  belongsToUserHospital,
  withHospitalId,
  Op,
};
