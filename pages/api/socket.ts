import { Server } from "socket.io";

let io;

export default function handler(req, res) {
  if (!io) {
    io = new Server(res.socket.server);
    io.on("connection", (socket) => {
      console.log("New client connected");

      socket.on("disconnect", () => {
        console.log("Client disconnected");
      });
    });
    res.socket.server.io = io;
  }
  res.end();
}
