const { Op } = require("sequelize");
const {
  ChatRoom,
  ChatParticipant,
  ChatMessage,
  SupportTicket,
  User,
  Hospital,
  Staff,
} = require("../models");
const { getHospitalId } = require("../utils/hospitalScope");

// --- Helpers ---
function requireHospital(req, res) {
  const hospitalId = getHospitalId(req);
  if (!hospitalId) {
    return res.status(403).json({
      success: false,
      message: "Chat is only available for users belonging to a hospital.",
    });
  }
  return hospitalId;
}

// --- Rooms ---

/**
 * GET /api/chat/rooms
 * List chat rooms the current user participates in (scoped to their hospital).
 */
async function getRooms(req, res) {
  try {
    const hospitalId = requireHospital(req, res);
    if (!hospitalId) return;

    const rooms = await ChatRoom.findAll({
      where: { hospital_id: hospitalId },
      include: [
        {
          model: ChatParticipant,
          as: "participants",
          where: { user_id: req.userId },
          required: true,
          attributes: ["id", "user_id", "role_in_room", "last_read_at"],
        },
        {
          model: User,
          as: "creator",
          attributes: ["id", "full_name", "email"],
        },
      ],
      order: [["updatedAt", "DESC"]],
    });

    // For each room, attach other participants (for display names) and last message
    const roomIds = rooms.map((r) => r.id);
    const allRecent = await ChatMessage.findAll({
      where: { chat_room_id: roomIds },
      order: [["createdAt", "DESC"]],
      attributes: ["id", "chat_room_id", "message", "sender_id", "createdAt"],
    });
    const lastByRoom = {};
    allRecent.forEach((m) => {
      if (!lastByRoom[m.chat_room_id]) lastByRoom[m.chat_room_id] = m;
    });

    const participantsByRoom = await ChatParticipant.findAll({
      where: { chat_room_id: roomIds },
      include: [{ model: User, as: "user", attributes: ["id", "full_name", "email"] }],
    });
    const partsMap = {};
    participantsByRoom.forEach((p) => {
      if (!partsMap[p.chat_room_id]) partsMap[p.chat_room_id] = [];
      partsMap[p.chat_room_id].push(p);
    });

    const data = rooms.map((r) => ({
      id: r.id,
      hospital_id: r.hospital_id,
      title: r.title,
      is_private: r.is_private,
      type: r.type,
      created_by: r.created_by,
      creator: r.creator,
      participants: partsMap[r.id] || [],
      last_message: lastByRoom[r.id] ? {
        message: lastByRoom[r.id].message,
        sender_id: lastByRoom[r.id].sender_id,
        createdAt: lastByRoom[r.id].createdAt,
      } : null,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
    }));

    return res.status(200).json({ success: true, data });
  } catch (error) {
    console.error("getRooms error:", error);
    return res.status(500).json({ success: false, message: "Failed to list chat rooms", error: error.message });
  }
}

/**
 * POST /api/chat/rooms
 * Create a new chat room (direct or group). Body: { title?, is_private, type?, participantIds: string[] }
 * All participant user IDs must belong to the same hospital.
 */
async function createRoom(req, res) {
  try {
    const hospitalId = requireHospital(req, res);
    if (!hospitalId) return;

    const { title, is_private = true, type = "direct", participantIds } = req.body || {};
    const ids = Array.isArray(participantIds) ? participantIds.filter(Boolean) : [];
    const uniqueIds = [...new Set([req.userId, ...ids])];

    // Ensure all users belong to this hospital (User.hospital_id)
    const users = await User.findAll({
      where: { id: uniqueIds, status: "active", hospital_id: hospitalId },
    });
    if (users.length !== uniqueIds.length) {
      return res.status(400).json({
        success: false,
        message: "All participants must be active users in the same hospital.",
      });
    }

    const room = await ChatRoom.create({
      hospital_id: hospitalId,
      title: title || null,
      is_private: !!is_private,
      type: type || "direct",
      created_by: req.userId,
    });

    await ChatParticipant.bulkCreate(
      uniqueIds.map((userId) => ({
        chat_room_id: room.id,
        user_id: userId,
        role_in_room: userId === req.userId ? "admin" : "member",
      }))
    );

    const withParticipants = await ChatRoom.findByPk(room.id, {
      include: [
        { model: ChatParticipant, as: "participants", include: [{ model: User, as: "user", attributes: ["id", "full_name", "email"] }] },
        { model: User, as: "creator", attributes: ["id", "full_name", "email"] },
      ],
    });

    return res.status(201).json({ success: true, data: withParticipants });
  } catch (error) {
    console.error("createRoom error:", error);
    return res.status(500).json({ success: false, message: "Failed to create chat room", error: error.message });
  }
}

/**
 * GET /api/chat/rooms/:roomId
 * Get one room details. User must be a participant and room must be in same hospital.
 */
async function getRoomById(req, res) {
  try {
    const hospitalId = requireHospital(req, res);
    if (!hospitalId) return;

    const { roomId } = req.params;
    const room = await ChatRoom.findByPk(roomId, {
      include: [
        { model: ChatParticipant, as: "participants", include: [{ model: User, as: "user", attributes: ["id", "full_name", "email"] }] },
        { model: User, as: "creator", attributes: ["id", "full_name", "email"] },
      ],
    });
    if (!room) return res.status(404).json({ success: false, message: "Chat room not found" });
    if (room.hospital_id !== hospitalId) return res.status(403).json({ success: false, message: "Access denied" });

    const participation = await ChatParticipant.findOne({ where: { chat_room_id: roomId, user_id: req.userId } });
    if (!participation) return res.status(403).json({ success: false, message: "You are not a participant of this room" });

    return res.status(200).json({ success: true, data: room });
  } catch (error) {
    console.error("getRoomById error:", error);
    return res.status(500).json({ success: false, message: "Failed to get chat room", error: error.message });
  }
}

/**
 * GET /api/chat/rooms/:roomId/messages
 * Query: limit (default 50), before (message id for cursor pagination)
 */
async function getMessages(req, res) {
  try {
    const hospitalId = requireHospital(req, res);
    if (!hospitalId) return;

    const { roomId } = req.params;
    const limit = Math.min(parseInt(req.query.limit, 10) || 50, 100);
    const before = req.query.before;

    const room = await ChatRoom.findByPk(roomId);
    if (!room) return res.status(404).json({ success: false, message: "Chat room not found" });
    if (room.hospital_id !== hospitalId) return res.status(403).json({ success: false, message: "Access denied" });

    const participation = await ChatParticipant.findOne({ where: { chat_room_id: roomId, user_id: req.userId } });
    if (!participation) return res.status(403).json({ success: false, message: "You are not a participant" });

    const where = { chat_room_id: roomId };
    if (before) {
      const beforeMsg = await ChatMessage.findByPk(before);
      if (beforeMsg && beforeMsg.chat_room_id === roomId) where.createdAt = { [Op.lt]: beforeMsg.createdAt };
    }

    const messages = await ChatMessage.findAll({
      where,
      include: [{ model: User, as: "sender", attributes: ["id", "full_name", "email"] }],
      order: [["createdAt", "DESC"]],
      limit,
    });

    return res.status(200).json({ success: true, data: messages.reverse() });
  } catch (error) {
    console.error("getMessages error:", error);
    return res.status(500).json({ success: false, message: "Failed to get messages", error: error.message });
  }
}

/**
 * POST /api/chat/rooms/:roomId/messages
 * Body: { message: string }
 */
async function sendMessage(req, res) {
  try {
    const hospitalId = requireHospital(req, res);
    if (!hospitalId) return;

    const { roomId } = req.params;
    const { message } = req.body || {};
    const text = typeof message === "string" ? message.trim() : "";
    if (!text) return res.status(400).json({ success: false, message: "Message text is required" });

    const room = await ChatRoom.findByPk(roomId);
    if (!room) return res.status(404).json({ success: false, message: "Chat room not found" });
    if (room.hospital_id !== hospitalId) return res.status(403).json({ success: false, message: "Access denied" });

    const participation = await ChatParticipant.findOne({ where: { chat_room_id: roomId, user_id: req.userId } });
    if (!participation) return res.status(403).json({ success: false, message: "You are not a participant" });

    const msg = await ChatMessage.create({
      chat_room_id: roomId,
      sender_id: req.userId,
      message: text,
      status: "sent",
    });

    const withSender = await ChatMessage.findByPk(msg.id, {
      include: [{ model: User, as: "sender", attributes: ["id", "full_name", "email"] }],
    });

    // Notify Socket.IO if available (see server.js / socket handler)
    if (req.app.get("io")) {
      req.app.get("io").to(`room:${roomId}`).emit("message_new", {
        roomId,
        message: withSender.toJSON(),
      });
    }

    return res.status(201).json({ success: true, data: withSender });
  } catch (error) {
    console.error("sendMessage error:", error);
    return res.status(500).json({ success: false, message: "Failed to send message", error: error.message });
  }
}

/**
 * POST /api/chat/rooms/:roomId/read
 * Body: { lastReadMessageId?: string } or update last_read_at to now
 */
async function markRoomRead(req, res) {
  try {
    const hospitalId = requireHospital(req, res);
    if (!hospitalId) return;

    const { roomId } = req.params;
    const participation = await ChatParticipant.findOne({ where: { chat_room_id: roomId, user_id: req.userId } });
    if (!participation) return res.status(403).json({ success: false, message: "You are not a participant" });

    const room = await ChatRoom.findByPk(roomId);
    if (!room || room.hospital_id !== hospitalId) return res.status(404).json({ success: false, message: "Chat room not found" });

    await participation.update({ last_read_at: new Date() });
    return res.status(200).json({ success: true, data: participation });
  } catch (error) {
    console.error("markRoomRead error:", error);
    return res.status(500).json({ success: false, message: "Failed to mark as read", error: error.message });
  }
}

/**
 * GET /api/chat/peers
 * List users in the same hospital (for starting direct chats). Excludes current user.
 */
async function getPeers(req, res) {
  try {
    const hospitalId = requireHospital(req, res);
    if (!hospitalId) return;

    const users = await User.findAll({
      where: { hospital_id: hospitalId, status: "active", id: { [Op.ne]: req.userId } },
      attributes: ["id", "full_name", "email", "profile_image_path"],
      include: [{ model: Staff, as: "staff", required: false, attributes: ["staff_type", "department_id"] }],
    });

    return res.status(200).json({ success: true, data: users });
  } catch (error) {
    console.error("getPeers error:", error);
    return res.status(500).json({ success: false, message: "Failed to list peers", error: error.message });
  }
}

// --- Support tickets ---

/**
 * GET /api/chat/tickets
 * List support tickets for the hospital (creator or assigned sees all in hospital).
 */
async function getTickets(req, res) {
  try {
    const hospitalId = requireHospital(req, res);
    if (!hospitalId) return;

    const tickets = await SupportTicket.findAll({
      where: { hospital_id: hospitalId },
      include: [
        { model: User, as: "createdByUser", attributes: ["id", "full_name", "email"] },
        { model: User, as: "assignedToUser", attributes: ["id", "full_name", "email"] },
        { model: ChatRoom, as: "chatRoom", required: false, attributes: ["id", "title"] },
      ],
      order: [["createdAt", "DESC"]],
    });

    return res.status(200).json({ success: true, data: tickets });
  } catch (error) {
    console.error("getTickets error:", error);
    return res.status(500).json({ success: false, message: "Failed to list tickets", error: error.message });
  }
}

/**
 * POST /api/chat/tickets
 * Body: { subject, description?, priority? }. Creates a support room and links it.
 */
async function createTicket(req, res) {
  try {
    const hospitalId = requireHospital(req, res);
    if (!hospitalId) return;

    const { subject, description, priority = "medium" } = req.body || {};
    if (!subject || !subject.trim()) return res.status(400).json({ success: false, message: "Subject is required" });

    const room = await ChatRoom.create({
      hospital_id: hospitalId,
      title: `Ticket: ${subject.trim().slice(0, 100)}`,
      is_private: false,
      type: "support",
      created_by: req.userId,
    });

    await ChatParticipant.create({
      chat_room_id: room.id,
      user_id: req.userId,
      role_in_room: "admin",
    });

    const ticket = await SupportTicket.create({
      hospital_id: hospitalId,
      subject: subject.trim(),
      description: description && description.trim() ? description.trim() : null,
      created_by: req.userId,
      status: "open",
      priority: ["low", "medium", "high"].includes(priority) ? priority : "medium",
      chat_room_id: room.id,
    });

    const data = await SupportTicket.findByPk(ticket.id, {
      include: [
        { model: User, as: "createdByUser", attributes: ["id", "full_name", "email"] },
        { model: ChatRoom, as: "chatRoom", attributes: ["id", "title"] },
      ],
    });

    return res.status(201).json({ success: true, data });
  } catch (error) {
    console.error("createTicket error:", error);
    return res.status(500).json({ success: false, message: "Failed to create ticket", error: error.message });
  }
}

/**
 * GET /api/chat/tickets/:ticketId
 */
async function getTicketById(req, res) {
  try {
    const hospitalId = requireHospital(req, res);
    if (!hospitalId) return;

    const { ticketId } = req.params;
    const ticket = await SupportTicket.findByPk(ticketId, {
      include: [
        { model: User, as: "createdByUser", attributes: ["id", "full_name", "email"] },
        { model: User, as: "assignedToUser", attributes: ["id", "full_name", "email"] },
        { model: ChatRoom, as: "chatRoom" },
      ],
    });
    if (!ticket) return res.status(404).json({ success: false, message: "Ticket not found" });
    if (ticket.hospital_id !== hospitalId) return res.status(403).json({ success: false, message: "Access denied" });

    return res.status(200).json({ success: true, data: ticket });
  } catch (error) {
    console.error("getTicketById error:", error);
    return res.status(500).json({ success: false, message: "Failed to get ticket", error: error.message });
  }
}

/**
 * PATCH /api/chat/tickets/:ticketId
 * Body: { status?, assigned_to?, priority? }
 */
async function updateTicket(req, res) {
  try {
    const hospitalId = requireHospital(req, res);
    if (!hospitalId) return;

    const { ticketId } = req.params;
    const ticket = await SupportTicket.findByPk(ticketId);
    if (!ticket) return res.status(404).json({ success: false, message: "Ticket not found" });
    if (ticket.hospital_id !== hospitalId) return res.status(403).json({ success: false, message: "Access denied" });

    const { status, assigned_to, priority } = req.body || {};
    const updates = {};
    if (["open", "in-progress", "resolved", "closed"].includes(status)) updates.status = status;
    if (priority && ["low", "medium", "high"].includes(priority)) updates.priority = priority;
    if (assigned_to !== undefined) updates.assigned_to = assigned_to || null;

    await ticket.update(updates);

    // When assigning a user, add them as participant to the ticket's chat room so they can see messages
    if (assigned_to && ticket.chat_room_id) {
      const existing = await ChatParticipant.findOne({
        where: { chat_room_id: ticket.chat_room_id, user_id: assigned_to },
      });
      if (!existing) {
        await ChatParticipant.create({
          chat_room_id: ticket.chat_room_id,
          user_id: assigned_to,
          role_in_room: "member",
        });
      }
    }
    const data = await SupportTicket.findByPk(ticket.id, {
      include: [
        { model: User, as: "createdByUser", attributes: ["id", "full_name", "email"] },
        { model: User, as: "assignedToUser", attributes: ["id", "full_name", "email"] },
        { model: ChatRoom, as: "chatRoom", attributes: ["id", "title"] },
      ],
    });
    return res.status(200).json({ success: true, data });
  } catch (error) {
    console.error("updateTicket error:", error);
    return res.status(500).json({ success: false, message: "Failed to update ticket", error: error.message });
  }
}

module.exports = {
  getRooms,
  createRoom,
  getRoomById,
  getMessages,
  sendMessage,
  markRoomRead,
  getPeers,
  getTickets,
  createTicket,
  getTicketById,
  updateTicket,
};
