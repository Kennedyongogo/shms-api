const { EventRegistration, Event, Patient, Staff } = require("../models");

const registerForEvent = async (req, res) => {
  try {
    const { event_id, patient_id, full_name, phone, email, gender, age } = req.body;
    if (!event_id || !full_name || !phone) {
      return res.status(400).json({
        success: false,
        message: "event_id, full_name, phone are required",
      });
    }

    const event = await Event.findByPk(event_id);
    if (!event) return res.status(404).json({ success: false, message: "Event not found" });

    if (patient_id) {
      const patient = await Patient.findByPk(patient_id);
      if (!patient) return res.status(404).json({ success: false, message: "Patient not found" });
    }

    const reg = await EventRegistration.create({
      event_id,
      patient_id: patient_id ?? null,
      full_name,
      phone,
      email: email ?? null,
      gender: gender ?? null,
      age: age ?? null,
      registration_date: new Date(),
      attendance_status: "registered",
      check_in_time: null,
      checked_in_by: null,
    });
    return res.status(201).json({ success: true, data: reg });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Error registering for event", error: error.message });
  }
};

const checkInAttendee = async (req, res) => {
  try {
    const { id } = req.params; // registration id
    const { staff_id } = req.body;
    const reg = await EventRegistration.findByPk(id);
    if (!reg) return res.status(404).json({ success: false, message: "Registration not found" });

    if (staff_id) {
      const staff = await Staff.findByPk(staff_id);
      if (!staff) return res.status(404).json({ success: false, message: "Staff not found" });
    }

    const updated = await reg.update({
      attendance_status: "attended",
      check_in_time: new Date(),
      checked_in_by: staff_id ?? null,
    });
    return res.status(200).json({ success: true, data: updated });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Error checking in attendee", error: error.message });
  }
};

module.exports = { registerForEvent, checkInAttendee };

