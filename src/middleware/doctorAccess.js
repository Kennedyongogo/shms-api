const { Appointment, Consultation, Staff } = require("../models");

const isAdmin = (req) => req.userType === "user" && req.role?.name === "admin";

async function getCurrentStaff(req) {
  if (!req.userId) return null;
  const staff = await Staff.findOne({ where: { user_id: req.userId } });
  return staff || null;
}

exports.requireStaffOrAdmin = async (req, res, next) => {
  try {
    if (isAdmin(req)) return next();
    const staff = await getCurrentStaff(req);
    if (!staff) return res.status(403).json({ success: false, message: "Access denied: staff account required" });
    req.staff = staff;
    req.staffId = staff.id;
    return next();
  } catch (e) {
    return res.status(500).json({ success: false, message: "Authorization error", error: e.message });
  }
};

exports.requireAppointmentDoctorOrAdmin = async (req, res, next) => {
  try {
    const id = req.params.id;
    const appt = await Appointment.findByPk(id);
    if (!appt) return res.status(404).json({ success: false, message: "Appointment not found" });

    if (isAdmin(req)) {
      req.appointment = appt;
      return next();
    }

    const staff = await getCurrentStaff(req);
    if (!staff) return res.status(403).json({ success: false, message: "Access denied: staff account required" });
    if (String(appt.doctor_id) !== String(staff.id)) {
      return res.status(403).json({ success: false, message: "Access denied: only assigned doctor can perform this action" });
    }

    req.staff = staff;
    req.staffId = staff.id;
    req.appointment = appt;
    return next();
  } catch (e) {
    return res.status(500).json({ success: false, message: "Authorization error", error: e.message });
  }
};

exports.requireAppointmentDoctorOrAdminFromBody = (fieldName) => {
  return async (req, res, next) => {
    try {
      const appointmentId = req.body?.[fieldName];
      if (!appointmentId) return res.status(400).json({ success: false, message: `${fieldName} is required` });
      const appt = await Appointment.findByPk(appointmentId);
      if (!appt) return res.status(404).json({ success: false, message: "Appointment not found" });

      if (isAdmin(req)) {
        req.appointment = appt;
        return next();
      }

      const staff = await getCurrentStaff(req);
      if (!staff) return res.status(403).json({ success: false, message: "Access denied: staff account required" });
      if (String(appt.doctor_id) !== String(staff.id)) {
        return res.status(403).json({ success: false, message: "Access denied: only assigned doctor can perform this action" });
      }

      req.staff = staff;
      req.staffId = staff.id;
      req.appointment = appt;
      return next();
    } catch (e) {
      return res.status(500).json({ success: false, message: "Authorization error", error: e.message });
    }
  };
};

exports.requireAppointmentDoctorOrAdminParam = (paramName) => {
  return async (req, res, next) => {
    try {
      const appointmentId = req.params?.[paramName];
      if (!appointmentId) return res.status(400).json({ success: false, message: `${paramName} is required` });

      const appt = await Appointment.findByPk(appointmentId);
      if (!appt) return res.status(404).json({ success: false, message: "Appointment not found" });

      if (isAdmin(req)) {
        req.appointment = appt;
        return next();
      }

      const staff = await getCurrentStaff(req);
      if (!staff) return res.status(403).json({ success: false, message: "Access denied: staff account required" });
      if (String(appt.doctor_id) !== String(staff.id)) {
        return res.status(403).json({ success: false, message: "Access denied: only assigned doctor can perform this action" });
      }

      req.staff = staff;
      req.staffId = staff.id;
      req.appointment = appt;
      return next();
    } catch (e) {
      return res.status(500).json({ success: false, message: "Authorization error", error: e.message });
    }
  };
};

exports.requireConsultationDoctorOrAdmin = async (req, res, next) => {
  try {
    const { id } = req.params;
    const consultation = await Consultation.findByPk(id);
    if (!consultation) return res.status(404).json({ success: false, message: "Consultation not found" });

    const appt = await Appointment.findByPk(consultation.appointment_id);
    if (!appt) return res.status(404).json({ success: false, message: "Appointment not found" });

    if (isAdmin(req)) {
      req.consultation = consultation;
      req.appointment = appt;
      return next();
    }

    const staff = await getCurrentStaff(req);
    if (!staff) return res.status(403).json({ success: false, message: "Access denied: staff account required" });
    if (String(appt.doctor_id) !== String(staff.id)) {
      return res.status(403).json({ success: false, message: "Access denied: only assigned doctor can perform this action" });
    }

    req.staff = staff;
    req.staffId = staff.id;
    req.consultation = consultation;
    req.appointment = appt;
    return next();
  } catch (e) {
    return res.status(500).json({ success: false, message: "Authorization error", error: e.message });
  }
};

// Consultation: assigned doctor only (admin cannot work on consultation; admin can still delete appointments via appointment routes)
exports.requireAppointmentDoctorOnlyFromBody = (fieldName) => {
  return async (req, res, next) => {
    try {
      const appointmentId = req.body?.[fieldName];
      if (!appointmentId) return res.status(400).json({ success: false, message: `${fieldName} is required` });
      const appt = await Appointment.findByPk(appointmentId);
      if (!appt) return res.status(404).json({ success: false, message: "Appointment not found" });

      const staff = await getCurrentStaff(req);
      if (!staff) return res.status(403).json({ success: false, message: "Access denied: only the doctor assigned to this appointment can record or manage its consultation" });
      if (String(appt.doctor_id) !== String(staff.id)) {
        return res.status(403).json({ success: false, message: "Access denied: only the doctor assigned to this appointment can record or manage its consultation" });
      }

      req.staff = staff;
      req.staffId = staff.id;
      req.appointment = appt;
      return next();
    } catch (e) {
      return res.status(500).json({ success: false, message: "Authorization error", error: e.message });
    }
  };
};

exports.requireAppointmentDoctorOnlyParam = (paramName) => {
  return async (req, res, next) => {
    try {
      const appointmentId = req.params?.[paramName];
      if (!appointmentId) return res.status(400).json({ success: false, message: `${paramName} is required` });

      const appt = await Appointment.findByPk(appointmentId);
      if (!appt) return res.status(404).json({ success: false, message: "Appointment not found" });

      const staff = await getCurrentStaff(req);
      if (!staff) return res.status(403).json({ success: false, message: "Access denied: only the doctor assigned to this appointment can view its consultation" });
      if (String(appt.doctor_id) !== String(staff.id)) {
        return res.status(403).json({ success: false, message: "Access denied: only the doctor assigned to this appointment can view its consultation" });
      }

      req.staff = staff;
      req.staffId = staff.id;
      req.appointment = appt;
      return next();
    } catch (e) {
      return res.status(500).json({ success: false, message: "Authorization error", error: e.message });
    }
  };
};

exports.requireConsultationDoctorOnly = async (req, res, next) => {
  try {
    const { id } = req.params;
    const consultation = await Consultation.findByPk(id);
    if (!consultation) return res.status(404).json({ success: false, message: "Consultation not found" });

    const appt = await Appointment.findByPk(consultation.appointment_id);
    if (!appt) return res.status(404).json({ success: false, message: "Appointment not found" });

    const staff = await getCurrentStaff(req);
    if (!staff) return res.status(403).json({ success: false, message: "Access denied: only the doctor assigned to this appointment can update or delete this consultation" });
    if (String(appt.doctor_id) !== String(staff.id)) {
      return res.status(403).json({ success: false, message: "Access denied: only the doctor assigned to this appointment can update or delete this consultation" });
    }

    req.staff = staff;
    req.staffId = staff.id;
    req.consultation = consultation;
    req.appointment = appt;
    return next();
  } catch (e) {
    return res.status(500).json({ success: false, message: "Authorization error", error: e.message });
  }
};

