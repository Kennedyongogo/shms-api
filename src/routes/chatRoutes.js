const express = require("express");
const chatController = require("../controllers/chatController");
const { authenticateUser } = require("../middleware/auth");

const router = express.Router();

router.use(authenticateUser);

// Peers (same-hospital users for starting DMs)
router.get("/peers", chatController.getPeers);

// Rooms
router.get("/rooms", chatController.getRooms);
router.post("/rooms", chatController.createRoom);
router.get("/rooms/:roomId", chatController.getRoomById);
router.get("/rooms/:roomId/messages", chatController.getMessages);
router.post("/rooms/:roomId/messages", chatController.sendMessage);
router.post("/rooms/:roomId/read", chatController.markRoomRead);

// Support tickets
router.get("/tickets", chatController.getTickets);
router.post("/tickets", chatController.createTicket);
router.get("/tickets/:ticketId", chatController.getTicketById);
router.patch("/tickets/:ticketId", chatController.updateTicket);

module.exports = router;
