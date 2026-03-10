const jwt = require("jsonwebtoken");
const config = require("../config/config");
const { User } = require("../models");
const { ChatParticipant } = require("../models");

/**
 * Attach chat socket logic to the given Socket.IO server.
 * Expects client to send auth token in handshake: auth.token or query.token
 * Events: join_room(roomId), leave_room(roomId). Server emits: message_new, message_read
 */
function attachChatSocket(io) {
  io.use(async (socket, next) => {
    const token = socket.handshake.auth?.token || socket.handshake.query?.token;
    if (!token) {
      return next(new Error("Authentication required"));
    }
    try {
      const decoded = jwt.verify(token, config.jwtSecret);
      if (decoded.type !== "user") return next(new Error("Invalid token type"));
      const user = await User.findByPk(decoded.id, { attributes: ["id", "full_name", "email", "hospital_id"] });
      if (!user || user.status !== "active") return next(new Error("Invalid or inactive user"));
      socket.userId = user.id;
      socket.hospitalId = user.hospital_id;
      socket.user = user;
      next();
    } catch (err) {
      next(new Error("Invalid token"));
    }
  });

  io.on("connection", (socket) => {
    socket.emit("connected", { userId: socket.userId });

    socket.on("join_room", async (roomId, cb) => {
      if (!roomId) {
        if (typeof cb === "function") cb({ ok: false, message: "roomId required" });
        return;
      }
      try {
        const part = await ChatParticipant.findOne({
          where: { chat_room_id: roomId, user_id: socket.userId },
        });
        if (!part) {
          if (typeof cb === "function") cb({ ok: false, message: "Not a participant" });
          return;
        }
        socket.join(`room:${roomId}`);
        if (typeof cb === "function") cb({ ok: true });
      } catch (err) {
        if (typeof cb === "function") cb({ ok: false, message: err.message });
      }
    });

    socket.on("leave_room", (roomId) => {
      if (roomId) socket.leave(`room:${roomId}`);
    });

    socket.on("message_read", (payload) => {
      const { roomId, messageId } = payload || {};
      if (roomId) {
        socket.to(`room:${roomId}`).emit("message_read", {
          roomId,
          messageId,
          userId: socket.userId,
        });
      }
    });

    socket.on("disconnect", () => {});
  });

  return io;
}

module.exports = { attachChatSocket };
