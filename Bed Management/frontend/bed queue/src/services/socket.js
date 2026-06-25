import { io } from "socket.io-client";

let socket = null;

const SOCKET_URL = "http://localhost:5000";

export function connectSocket() {
  if (socket && socket.connected) {
    return socket;
  }

  socket = io(SOCKET_URL, {
    transports: ["websocket", "polling"],
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    timeout: 20000,
  });

  socket.on("connect", () => {
    console.log("Socket connected:", socket.id);
  });

  socket.on("disconnect", (reason) => {
    console.log("Socket disconnected:", reason);
  });

  socket.on("connect_error", (err) => {
    console.log("Socket connection error:", err.message);
  });

  socket.on("reconnect", (attemptNumber) => {
    console.log("Socket reconnected after", attemptNumber, "attempts");
  });

  socket.on("reconnect_attempt", (attemptNumber) => {
    console.log("Socket reconnection attempt:", attemptNumber);
  });

  socket.on("reconnect_error", (err) => {
    console.log("Socket reconnection error:", err.message);
  });

  socket.on("reconnect_failed", () => {
    console.log("Socket reconnection failed");
  });

  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

export function onQueueUpdated(callback) {
  if (!socket) connectSocket();
  socket.on("queueUpdated", callback);
  return () => {
    socket.off("queueUpdated", callback);
  };
}

export function getSocket() {
  return socket;
}
