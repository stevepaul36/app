const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Serve static files from "public" folder
app.use(express.static("public"));

// WebSocket signaling logic
io.on("connection", (socket) => {
  console.log("A user connected:", socket.id);

  // Handle offer from one peer
  socket.on("offer", (data) => {
    socket.to(data.target).emit("offer", { sender: socket.id, offer: data.offer });
  });

  // Handle answer from the second peer
  socket.on("answer", (data) => {
    socket.to(data.target).emit("answer", { sender: socket.id, answer: data.answer });
  });

  // Handle ICE candidates
  socket.on("ice-candidate", (data) => {
    socket.to(data.target).emit("ice-candidate", { sender: socket.id, candidate: data.candidate });
  });

  // Handle disconnection
  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
  });
});

// Start the server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
