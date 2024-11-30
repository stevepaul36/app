const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Serve static files (like index.html, app.js, style.css) from the "public" folder
app.use(express.static("public"));

// When a client connects to the server via WebSocket
io.on("connection", (socket) => {
  console.log("A user connected:", socket.id);

  // Listen for "offer" event from client and forward it to the target peer
  socket.on("offer", (data) => {
    console.log("Offer received from:", socket.id);
    socket.to(data.target).emit("offer", { sender: socket.id, offer: data.offer });
  });

  // Listen for "answer" event from client and forward it to the target peer
  socket.on("answer", (data) => {
    console.log("Answer received from:", socket.id);
    socket.to(data.target).emit("answer", { sender: socket.id, answer: data.answer });
  });

  // Listen for "ice-candidate" event from client and forward it to the target peer
  socket.on("ice-candidate", (data) => {
    console.log("ICE candidate received from:", socket.id);
    socket.to(data.target).emit("ice-candidate", { sender: socket.id, candidate: data.candidate });
  });

  // Handle disconnection
  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
  });
});

// Start the server
const PORT = process.env.PORT || 3000; // Use environment port or default to 3000
server.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
