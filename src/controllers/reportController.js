const {
  Hospital,
  Department,
  Staff,
  Patient,
  Appointment,
  Consultation,
  LabOrder,
  Prescription,
  Bill,
  Admission,
  Event,
  News,
} = require("../models");

const generateAnalyticsReports = async (req, res) => {
  try {
    const [
      hospitals,
      departments,
      staff,
      patients,
      appointments,
      consultations,
      labOrders,
      prescriptions,
      bills,
      admissions,
      events,
      news,
    ] = await Promise.all([
      Hospital.count(),
      Department.count(),
      Staff.count(),
      Patient.count(),
      Appointment.count(),
      Consultation.count(),
      LabOrder.count(),
      Prescription.count(),
      Bill.count(),
      Admission.count(),
      Event.count(),
      News.count(),
    ]);

    return res.status(200).json({
      success: true,
      data: {
        hospitals,
        departments,
        staff,
        patients,
        appointments,
        consultations,
        labOrders,
        prescriptions,
        bills,
        admissions,
        events,
        news,
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Error generating reports", error: error.message });
  }
};

module.exports = { generateAnalyticsReports };

