import { Server } from "socket.io";
import userModel from "./models/user.model.js";
import captainModel from "./models/captain.model.js";

let io;

export function initializeSocket(server) {
  io = new Server(server, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
    },
  });

  io.on("connection", (socket) => {
    console.log(`Client connected: ${socket.id}`);

    socket.on("join", async (data, acknowledge) => {
      const { userId, userType } = data || {};
      const model =
        userType === "user"
          ? userModel
          : userType === "captain"
            ? captainModel
            : null;

      if (!model || !userId) {
        acknowledge?.({ ok: false, message: "Invalid socket identity" });
        return;
      }

      try {
        const account = await model.findByIdAndUpdate(userId, {
          socketId: socket.id,
        });
        if (!account) {
          acknowledge?.({ ok: false, message: "Account not found" });
          return;
        }

        const room = `${userType}:${userId}`;
        await socket.join(room);
        if (userType === "captain") await socket.join("captains");
        socket.data.accountRoom = room;
        socket.data.accountType = userType;
        socket.data.accountId = userId;
        console.log(`${userType} ${userId} joined ${room}`);
        acknowledge?.({ ok: true });
      } catch (error) {
        console.error(`Unable to register ${userType} socket:`, error);
        acknowledge?.({ ok: false, message: "Unable to register socket" });
      }
    });

    socket.on("update-location-captain", async (data, acknowledge) => {
      const { userId, location } = data || {};
      const ltd = Number(location?.ltd);
      const lng = Number(location?.lng);

      if (!userId || !Number.isFinite(ltd) || !Number.isFinite(lng)) {
        acknowledge?.({ ok: false, message: "Invalid location data" });
        return;
      }

      try {
        const captain = await captainModel.findByIdAndUpdate(userId, {
          location: { ltd, lng },
        });
        acknowledge?.({ ok: Boolean(captain) });
      } catch (error) {
        console.error(`Unable to save captain ${userId} location:`, error);
        acknowledge?.({ ok: false, message: "Unable to save location" });
      }
    });

    socket.on("disconnect", () => {
      console.log(`Client disconnected: ${socket.id}`);
      const { accountType, accountId } = socket.data;
      const model =
        accountType === "user"
          ? userModel
          : accountType === "captain"
            ? captainModel
            : null;
      if (model && accountId) {
        model
          .findOneAndUpdate(
            { _id: accountId, socketId: socket.id },
            { $unset: { socketId: 1 } },
          )
          .catch((error) =>
            console.error(
              `Unable to clear disconnected socket ${socket.id}:`,
              error,
            ),
          );
      }
    });
  });
}

export const sendMessageToSocketId = (socketId, messageObject) => {
  if (io && socketId) {
    io.to(socketId).emit(messageObject.event, messageObject.data);
  } else if (!io) {
    console.log("Socket.io not initialized.");
  }
};

export const sendMessageToRoom = (room, messageObject) => {
  if (!io) {
    console.log("Socket.io not initialized.");
    return false;
  }

  const connectedSockets = io.sockets.adapter.rooms.get(room);
  if (!connectedSockets?.size) return false;

  io.to(room).emit(messageObject.event, messageObject.data);
  return true;
};
