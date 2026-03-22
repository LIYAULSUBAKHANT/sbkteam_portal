const { Server } = require("socket.io");

let ioInstance = null;

function initSocket(server) {
  ioInstance = new Server(server, {
    cors: {
      origin: "*",
      methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    },
  });

  ioInstance.on("connection", (socket) => {
    console.log("[socket] client connected:", socket.id);

    socket.on("disconnect", () => {
      console.log("[socket] client disconnected:", socket.id);
    });
  });

  return ioInstance;
}

function emitDataChanged(payload) {
  if (!ioInstance) {
    return;
  }

  ioInstance.emit("data_changed", {
    timestamp: new Date().toISOString(),
    ...payload,
  });
}

module.exports = { initSocket, emitDataChanged };
