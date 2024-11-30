const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

// Initialize Express app and HTTP server
const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Serve static files from the "public" folder
app.use(express.static("public"));

// Keep track of connected users and their socket IDs
let users = {};

io.on("connection", (socket) => {
  console.log("A user connected:", socket.id);

  // Add the connected user to the users list
  users[socket.id] = { id: socket.id };

  // Send the list of connected users to all clients
  io.emit("update-users", Object.values(users));

  // Handle offer, answer, and ICE candidates (same as before)
  socket.on("offer", (data) => {
    socket.to(data.target).emit("offer", { sender: socket.id, offer: data.offer });
  });

  socket.on("answer", (data) => {
    socket.to(data.target).emit("answer", { sender: socket.id, answer: data.answer });
  });

  socket.on("ice-candidate", (data) => {
    socket.to(data.target).emit("ice-candidate", { sender: socket.id, candidate: data.candidate });
  });

  // Remove user from the list on disconnect
  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
    delete users[socket.id];
    io.emit("update-users", Object.values(users)); // Update user list for everyone
  });
});

// Start the server
server.listen(3000, () => {
  console.log("Server is running on http://localhost:3000");
});
