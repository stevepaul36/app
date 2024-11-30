const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

// Initialize Express app and HTTP server
const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Serve static files from the "public" folder
app.use(express.static("public"));

// Store connected users
const users = {};

io.on("connection", (socket) => {
  console.log("A user connected:", socket.id);

  // Add the connected user to the users object
  users[socket.id] = { id: socket.id };
  console.log("Current users:", users);

  // Send the updated user list to all clients
  io.emit("update-users", Object.values(users));

  // Handle signaling messages
  socket.on("offer", (data) => {
    console.log(`Offer from ${socket.id} to ${data.target}`);
    socket.to(data.target).emit("offer", { sender: socket.id, offer: data.offer });
  });

  socket.on("answer", (data) => {
    console.log(`Answer from ${socket.id} to ${data.target}`);
    socket.to(data.target).emit("answer", { sender: socket.id, answer: data.answer });
  });

  socket.on("ice-candidate", (data) => {
    console.log(`ICE candidate from ${socket.id} to ${data.target}`);
    socket.to(data.target).emit("ice-candidate", { sender: socket.id, candidate: data.candidate });
  });

  // Handle user disconnection
  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
    delete users[socket.id];
    console.log("Updated users:", users);

    // Notify all clients about the updated user list
    io.emit("update-users", Object.values(users));
  });
});

// Start the server
server.listen(3000, () => {
  console.log("Server is running on http://localhost:3000");
});
