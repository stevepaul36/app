const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

// Initialize Express app and HTTP server
const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Serve static files from the "public" folder
app.use(express.static("public"));

// Handle WebSocket connections
io.on("connection", (socket) => {
  console.log("A user connected:", socket.id);

  // Relay offer/answer between peers
  socket.on("offer", (data) => {
    console.log("Received offer from", socket.id, "to", data.target);
    socket.to(data.target).emit("offer", { sender: socket.id, offer: data.offer });
  });

  socket.on("answer", (data) => {
    console.log("Received answer from", socket.id, "to", data.target);
    socket.to(data.target).emit("answer", { sender: socket.id, answer: data.answer });
  });

  // Relay ICE candidates
  socket.on("ice-candidate", (data) => {
    console.log("Received ICE candidate from", socket.id, "to", data.target);
    socket.to(data.target).emit("ice-candidate", { sender: socket.id, candidate: data.candidate });
  });

  // Handle disconnection
  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
  });
});

// Start the server
const port = process.env.PORT || 3000; // For deployment on Render, use environment variable for port
server.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
