/**
 * Export and purge all data scoped to a hospital (hospital_id).
 * Used when a tenant wants a copy of their data before leaving or deleting the organization.
 */

const { Op } = require("sequelize");
const {
  sequelize,
  Hospital,
  Department,
  Ward,
  Bed,
  User,
  Role,
  RoleMenuItem,
  Patient,
  Staff,
  DoctorSchedule,
  PatientAllergy,
  PatientMedicalHistory,
  Service,
  ServiceImage,
  Appointment,
  Consultation,
  VitalSigns,
  LabTest,
  LabTestTemplate,
  LabOrder,
  LabOrderItem,
  LabResultData,
  Medication,
  Prescription,
  PrescriptionItem,
  DispenseRecord,
  InventoryItem,
  InventoryTransaction,
  Supplier,
  PurchaseOrder,
  PurchaseOrderItem,
  Bill,
  BillItem,
  Payment,
  InsuranceClaim,
  Admission,
  NursingNote,
  MedicalReport,
  MedicalAttachment,
  Notification,
  AuditLog,
  SystemSetting,
  Event,
  EventRegistration,
  EventImage,
  News,
  NewsImage,
  MpesaSetting,
  ChatRoom,
  ChatParticipant,
  ChatMessage,
  SupportTicket,
  RegistrationPackagePayment,
} = require("../models");

/**
 * Full JSON export for one hospital (for download / migration).
 */
async function buildHospitalExport(hospitalId) {
  const hid = hospitalId;
  const hospital = await Hospital.findByPk(hid);
  if (!hospital) {
    const err = new Error("Hospital not found");
    err.status = 404;
    throw err;
  }

  const departments = await Department.findAll({ where: { hospital_id: hid }, raw: true });
  const deptIds = departments.map((d) => d.id);
  const wards =
    deptIds.length > 0 ? await Ward.findAll({ where: { department_id: { [Op.in]: deptIds } }, raw: true }) : [];
  const wardIds = wards.map((w) => w.id);
  const beds =
    wardIds.length > 0 ? await Bed.findAll({ where: { ward_id: { [Op.in]: wardIds } }, raw: true }) : [];

  const usersRaw = await User.findAll({
    where: { hospital_id: hid },
    attributes: { exclude: ["password"] },
  });
  const users = usersRaw.map((u) => u.toJSON());

  const roles = await Role.findAll({ where: { hospital_id: hid }, raw: true });
  const roleIds = roles.map((r) => r.id);
  const roleMenuItems =
    roleIds.length > 0
      ? await RoleMenuItem.findAll({ where: { role_id: { [Op.in]: roleIds } }, raw: true })
      : [];

  const staff = await Staff.findAll({ where: { hospital_id: hid }, raw: true });
  const staffIds = staff.map((s) => s.id);
  const doctorSchedules =
    staffIds.length > 0
      ? await DoctorSchedule.findAll({ where: { doctor_id: { [Op.in]: staffIds } }, raw: true })
      : [];

  const patients = await Patient.findAll({ where: { hospital_id: hid }, raw: true });
  const patientIds = patients.map((p) => p.id);
  const patientAllergies =
    patientIds.length > 0
      ? await PatientAllergy.findAll({ where: { patient_id: { [Op.in]: patientIds } }, raw: true })
      : [];
  const patientMedicalHistory =
    patientIds.length > 0
      ? await PatientMedicalHistory.findAll({ where: { patient_id: { [Op.in]: patientIds } }, raw: true })
      : [];

  const services = await Service.findAll({ where: { hospital_id: hid }, raw: true });
  const serviceIds = services.map((s) => s.id);
  const serviceImages =
    serviceIds.length > 0
      ? await ServiceImage.findAll({ where: { service_id: { [Op.in]: serviceIds } }, raw: true })
      : [];

  const appointments = await Appointment.findAll({ where: { hospital_id: hid }, raw: true });
  const consultations = await Consultation.findAll({ where: { hospital_id: hid }, raw: true });
  const consultationIds = consultations.map((c) => c.id);
  const vitalSigns =
    consultationIds.length > 0
      ? await VitalSigns.findAll({ where: { consultation_id: { [Op.in]: consultationIds } }, raw: true })
      : [];

  const labTests = await LabTest.findAll({ where: { hospital_id: hid }, raw: true });
  const labTestIds = labTests.map((t) => t.id);
  const labTestTemplates =
    labTestIds.length > 0
      ? await LabTestTemplate.findAll({ where: { lab_test_id: { [Op.in]: labTestIds } }, raw: true })
      : [];

  const labOrders = await LabOrder.findAll({ where: { hospital_id: hid }, raw: true });
  const labOrderIds = labOrders.map((o) => o.id);
  const labOrderItems =
    labOrderIds.length > 0
      ? await LabOrderItem.findAll({ where: { lab_order_id: { [Op.in]: labOrderIds } }, raw: true })
      : [];
  const labOrderItemIds = labOrderItems.map((i) => i.id);
  const labResultData =
    labOrderItemIds.length > 0
      ? await LabResultData.findAll({ where: { lab_order_item_id: { [Op.in]: labOrderItemIds } }, raw: true })
      : [];

  const medications = await Medication.findAll({ where: { hospital_id: hid }, raw: true });
  const prescriptions = await Prescription.findAll({ where: { hospital_id: hid }, raw: true });
  const prescriptionIds = prescriptions.map((p) => p.id);
  const prescriptionItems =
    prescriptionIds.length > 0
      ? await PrescriptionItem.findAll({ where: { prescription_id: { [Op.in]: prescriptionIds } }, raw: true })
      : [];

  const dispenseRecords = await DispenseRecord.findAll({ where: { hospital_id: hid }, raw: true });

  const inventoryItems = await InventoryItem.findAll({ where: { hospital_id: hid }, raw: true });
  const inventoryItemIds = inventoryItems.map((i) => i.id);
  const inventoryTransactions =
    inventoryItemIds.length > 0
      ? await InventoryTransaction.findAll({
          where: { inventory_item_id: { [Op.in]: inventoryItemIds } },
          raw: true,
        })
      : [];

  const suppliers = await Supplier.findAll({ where: { hospital_id: hid }, raw: true });
  const purchaseOrders = await PurchaseOrder.findAll({ where: { hospital_id: hid }, raw: true });
  const purchaseOrderIds = purchaseOrders.map((p) => p.id);
  const purchaseOrderItems =
    purchaseOrderIds.length > 0
      ? await PurchaseOrderItem.findAll({
          where: { purchase_order_id: { [Op.in]: purchaseOrderIds } },
          raw: true,
        })
      : [];

  const bills = await Bill.findAll({ where: { hospital_id: hid }, raw: true });
  const billIds = bills.map((b) => b.id);
  const billItems =
    billIds.length > 0 ? await BillItem.findAll({ where: { bill_id: { [Op.in]: billIds } }, raw: true }) : [];
  const payments = await Payment.findAll({ where: { hospital_id: hid }, raw: true });
  const insuranceClaims =
    billIds.length > 0
      ? await InsuranceClaim.findAll({ where: { bill_id: { [Op.in]: billIds } }, raw: true })
      : [];

  const admissions = await Admission.findAll({ where: { hospital_id: hid }, raw: true });
  const nursingNotes = await NursingNote.findAll({ where: { hospital_id: hid }, raw: true });

  const medicalReports =
    patientIds.length > 0
      ? await MedicalReport.findAll({ where: { patient_id: { [Op.in]: patientIds } }, raw: true })
      : [];

  const medicalAttachments =
    patientIds.length > 0
      ? await MedicalAttachment.findAll({ where: { patient_id: { [Op.in]: patientIds } }, raw: true })
      : [];

  const userIdsForNotif = usersRaw.map((u) => u.id);
  const notifications =
    userIdsForNotif.length > 0
      ? await Notification.findAll({ where: { user_id: { [Op.in]: userIdsForNotif } }, raw: true })
      : [];

  const auditOr = [{ hospital_id: hid }];
  if (userIdsForNotif.length) auditOr.push({ user_id: { [Op.in]: userIdsForNotif } });
  const auditLogs = await AuditLog.findAll({ where: { [Op.or]: auditOr }, raw: true });

  const systemSettings = await SystemSetting.findAll({ where: { hospital_id: hid }, raw: true });
  const events = await Event.findAll({ where: { hospital_id: hid }, raw: true });
  const eventIds = events.map((e) => e.id);
  const eventRegistrations =
    eventIds.length > 0
      ? await EventRegistration.findAll({ where: { event_id: { [Op.in]: eventIds } }, raw: true })
      : [];
  const eventImages =
    eventIds.length > 0
      ? await EventImage.findAll({ where: { event_id: { [Op.in]: eventIds } }, raw: true })
      : [];

  const newsItems = await News.findAll({ where: { hospital_id: hid }, raw: true });
  const newsIds = newsItems.map((n) => n.id);
  const newsImages =
    newsIds.length > 0
      ? await NewsImage.findAll({ where: { news_id: { [Op.in]: newsIds } }, raw: true })
      : [];

  const mpesaSettings = await MpesaSetting.findAll({ where: { hospital_id: hid }, raw: true });

  const chatRooms = await ChatRoom.findAll({ where: { hospital_id: hid }, raw: true });
  const chatRoomIds = chatRooms.map((c) => c.id);
  const chatParticipants =
    chatRoomIds.length > 0
      ? await ChatParticipant.findAll({ where: { chat_room_id: { [Op.in]: chatRoomIds } }, raw: true })
      : [];
  const chatMessages =
    chatRoomIds.length > 0
      ? await ChatMessage.findAll({ where: { chat_room_id: { [Op.in]: chatRoomIds } }, raw: true })
      : [];

  const supportTickets = await SupportTicket.findAll({ where: { hospital_id: hid }, raw: true });

  const registrationPackagePayments = await RegistrationPackagePayment.findAll({
    where: { hospital_id: hid },
    raw: true,
  });

  return {
    exportVersion: 1,
    exportedAt: new Date().toISOString(),
    hospitalId: hid,
    hospital: hospital.toJSON(),
    departments,
    wards,
    beds,
    users,
    roles,
    roleMenuItems,
    staff,
    doctorSchedules,
    patients,
    patientAllergies,
    patientMedicalHistory,
    services,
    serviceImages,
    appointments,
    consultations,
    vitalSigns,
    labTests,
    labTestTemplates,
    labOrders,
    labOrderItems,
    labResultData,
    medications,
    prescriptions,
    prescriptionItems,
    dispenseRecords,
    inventoryItems,
    inventoryTransactions,
    suppliers,
    purchaseOrders,
    purchaseOrderItems,
    bills,
    billItems,
    payments,
    insuranceClaims,
    admissions,
    nursingNotes,
    medicalReports,
    medicalAttachments,
    notifications,
    auditLogs,
    systemSettings,
    events,
    eventRegistrations,
    eventImages,
    newsItems,
    newsImages,
    mpesaSettings,
    chatRooms,
    chatParticipants,
    chatMessages,
    supportTickets,
    registrationPackagePayments,
    _note:
      "Passwords are never exported. Global catalog tables (e.g. shared drug reference) are not included. Extend export if you add new hospital-scoped modules.",
  };
}

/**
 * Permanently delete hospital and dependent rows (irreversible). Runs in a transaction.
 */
async function purgeHospitalData(hospitalId) {
  const hid = hospitalId;

  return sequelize.transaction(async (transaction) => {
    const hospital = await Hospital.findByPk(hid, { transaction });
    if (!hospital) {
      const err = new Error("Hospital not found");
      err.status = 404;
      throw err;
    }

    const users = await User.findAll({ where: { hospital_id: hid }, attributes: ["id"], transaction });
    const userIds = users.map((u) => u.id);
    const roles = await Role.findAll({ where: { hospital_id: hid }, attributes: ["id"], transaction });
    const roleIds = roles.map((r) => r.id);
    const staffList = await Staff.findAll({ where: { hospital_id: hid }, attributes: ["id"], transaction });
    const staffIds = staffList.map((s) => s.id);
    const patients = await Patient.findAll({ where: { hospital_id: hid }, attributes: ["id"], transaction });
    const patientIds = patients.map((p) => p.id);

    if (userIds.length) {
      await Notification.destroy({ where: { user_id: { [Op.in]: userIds } }, transaction });
    }
    await AuditLog.destroy({
      where: {
        [Op.or]: [{ hospital_id: hid }, ...(userIds.length ? [{ user_id: { [Op.in]: userIds } }] : [])],
      },
      transaction,
    });

    await SupportTicket.destroy({ where: { hospital_id: hid }, transaction });

    if (userIds.length) {
      await ChatMessage.destroy({ where: { sender_id: { [Op.in]: userIds } }, transaction });
    }
    const chatRooms = await ChatRoom.findAll({ where: { hospital_id: hid }, attributes: ["id"], transaction });
    const chatRoomIds = chatRooms.map((c) => c.id);
    if (chatRoomIds.length) {
      await ChatMessage.destroy({ where: { chat_room_id: { [Op.in]: chatRoomIds } }, transaction });
      await ChatParticipant.destroy({ where: { chat_room_id: { [Op.in]: chatRoomIds } }, transaction });
    }
    await ChatRoom.destroy({ where: { hospital_id: hid }, transaction });

    const labOrders = await LabOrder.findAll({ where: { hospital_id: hid }, attributes: ["id"], transaction });
    const labOrderIds = labOrders.map((l) => l.id);
    if (labOrderIds.length) {
      const items = await LabOrderItem.findAll({
        where: { lab_order_id: { [Op.in]: labOrderIds } },
        attributes: ["id"],
        transaction,
      });
      const itemIds = items.map((i) => i.id);
      if (itemIds.length) {
        await LabResultData.destroy({ where: { lab_order_item_id: { [Op.in]: itemIds } }, transaction });
      }
      await LabOrderItem.destroy({ where: { lab_order_id: { [Op.in]: labOrderIds } }, transaction });
    }
    await LabOrder.destroy({ where: { hospital_id: hid }, transaction });

    const labTests = await LabTest.findAll({ where: { hospital_id: hid }, attributes: ["id"], transaction });
    const labTestIds = labTests.map((t) => t.id);
    if (labTestIds.length) {
      await LabTestTemplate.destroy({ where: { lab_test_id: { [Op.in]: labTestIds } }, transaction });
    }
    await LabTest.destroy({ where: { hospital_id: hid }, transaction });

    const bills = await Bill.findAll({ where: { hospital_id: hid }, attributes: ["id"], transaction });
    const billIds = bills.map((b) => b.id);
    if (billIds.length) {
      await BillItem.destroy({ where: { bill_id: { [Op.in]: billIds } }, transaction });
      await InsuranceClaim.destroy({ where: { bill_id: { [Op.in]: billIds } }, transaction });
    }
    await Payment.destroy({ where: { hospital_id: hid }, transaction });
    await Bill.destroy({ where: { hospital_id: hid }, transaction });

    const prescriptions = await Prescription.findAll({ where: { hospital_id: hid }, attributes: ["id"], transaction });
    const prescriptionIds = prescriptions.map((p) => p.id);
    if (prescriptionIds.length) {
      await PrescriptionItem.destroy({ where: { prescription_id: { [Op.in]: prescriptionIds } }, transaction });
    }
    await DispenseRecord.destroy({ where: { hospital_id: hid }, transaction });
    await Prescription.destroy({ where: { hospital_id: hid }, transaction });

    if (patientIds.length) {
      await MedicalAttachment.destroy({ where: { patient_id: { [Op.in]: patientIds } }, transaction });
      await MedicalReport.destroy({ where: { patient_id: { [Op.in]: patientIds } }, transaction });
    }

    const consultations = await Consultation.findAll({ where: { hospital_id: hid }, attributes: ["id"], transaction });
    const consultationIds = consultations.map((c) => c.id);
    if (consultationIds.length) {
      await VitalSigns.destroy({ where: { consultation_id: { [Op.in]: consultationIds } }, transaction });
    }
    await Consultation.destroy({ where: { hospital_id: hid }, transaction });

    await Appointment.destroy({ where: { hospital_id: hid }, transaction });
    await NursingNote.destroy({ where: { hospital_id: hid }, transaction });
    await Admission.destroy({ where: { hospital_id: hid }, transaction });

    if (patientIds.length) {
      await PatientAllergy.destroy({ where: { patient_id: { [Op.in]: patientIds } }, transaction });
      await PatientMedicalHistory.destroy({ where: { patient_id: { [Op.in]: patientIds } }, transaction });
      await EventRegistration.destroy({ where: { patient_id: { [Op.in]: patientIds } }, transaction });
    }
    await Patient.destroy({ where: { hospital_id: hid }, transaction });

    const events = await Event.findAll({ where: { hospital_id: hid }, attributes: ["id"], transaction });
    const eventIds = events.map((e) => e.id);
    if (eventIds.length) {
      await EventRegistration.destroy({ where: { event_id: { [Op.in]: eventIds } }, transaction });
      await EventImage.destroy({ where: { event_id: { [Op.in]: eventIds } }, transaction });
    }
    await Event.destroy({ where: { hospital_id: hid }, transaction });

    const newsItems = await News.findAll({ where: { hospital_id: hid }, attributes: ["id"], transaction });
    const newsIds = newsItems.map((n) => n.id);
    if (newsIds.length) {
      await NewsImage.destroy({ where: { news_id: { [Op.in]: newsIds } }, transaction });
    }
    await News.destroy({ where: { hospital_id: hid }, transaction });

    const purchaseOrders = await PurchaseOrder.findAll({ where: { hospital_id: hid }, attributes: ["id"], transaction });
    const poIds = purchaseOrders.map((p) => p.id);
    if (poIds.length) {
      await PurchaseOrderItem.destroy({ where: { purchase_order_id: { [Op.in]: poIds } }, transaction });
    }
    await PurchaseOrder.destroy({ where: { hospital_id: hid }, transaction });

    const inventoryItems = await InventoryItem.findAll({ where: { hospital_id: hid }, attributes: ["id"], transaction });
    const invIds = inventoryItems.map((i) => i.id);
    if (invIds.length) {
      await InventoryTransaction.destroy({ where: { inventory_item_id: { [Op.in]: invIds } }, transaction });
    }
    await Medication.destroy({ where: { hospital_id: hid }, transaction });
    await InventoryItem.destroy({ where: { hospital_id: hid }, transaction });

    await Supplier.destroy({ where: { hospital_id: hid }, transaction });

    const services = await Service.findAll({ where: { hospital_id: hid }, attributes: ["id"], transaction });
    const serviceIds = services.map((s) => s.id);
    if (serviceIds.length) {
      await ServiceImage.destroy({ where: { service_id: { [Op.in]: serviceIds } }, transaction });
    }
    await Service.destroy({ where: { hospital_id: hid }, transaction });

    if (staffIds.length) {
      await DoctorSchedule.destroy({ where: { doctor_id: { [Op.in]: staffIds } }, transaction });
    }
    await Staff.destroy({ where: { hospital_id: hid }, transaction });

    await SystemSetting.destroy({ where: { hospital_id: hid }, transaction });
    await MpesaSetting.destroy({ where: { hospital_id: hid }, transaction });

    const departments = await Department.findAll({ where: { hospital_id: hid }, attributes: ["id"], transaction });
    const deptIds = departments.map((d) => d.id);
    const wards = deptIds.length ? await Ward.findAll({ where: { department_id: { [Op.in]: deptIds } }, attributes: ["id"], transaction }) : [];
    const wardIds = wards.map((w) => w.id);
    if (wardIds.length) {
      await Bed.destroy({ where: { ward_id: { [Op.in]: wardIds } }, transaction });
    }
    if (deptIds.length) {
      await Ward.destroy({ where: { department_id: { [Op.in]: deptIds } }, transaction });
    }
    await Department.destroy({ where: { hospital_id: hid }, transaction });

    if (roleIds.length) {
      await RoleMenuItem.destroy({ where: { role_id: { [Op.in]: roleIds } }, transaction });
    }
    await User.destroy({ where: { hospital_id: hid }, transaction });
    await Role.destroy({ where: { hospital_id: hid }, transaction });

    await RegistrationPackagePayment.destroy({ where: { hospital_id: hid }, transaction });

    await hospital.destroy({ transaction });

    return { success: true, message: "Organization and related data were permanently deleted." };
  });
}

module.exports = {
  buildHospitalExport,
  purgeHospitalData,
};
