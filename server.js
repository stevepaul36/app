const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");  // Import CORS package

// Initialize the express app and create the HTTP server
const app = express();
const server = http.createServer(app);

// Create a new instance of Socket.IO, passing in the server
const io = new Server(server);

// CORS configuration to allow frontend from Vercel
const corsOptions = {
  origin: "https://app-azure-chi-15.vercel.app",  // Replace with your frontend URL on Vercel
  methods: ["GET", "POST"],
  allowedHeaders: ["Content-Type"],
};

// Use the CORS middleware to handle cross-origin requests
app.use(cors(corsOptions));

// Serve static files from the "public" folder (if needed for front-end assets like images or stylesheets)
app.use(express.static("public"));

// WebSocket connection handler using socket.io
io.on("connection", (socket) => {
  console.log("A user connected:", socket.id);

  // Relay the offer message between peers
  socket.on("offer", (data) => {
    console.log("Offer received from", socket.id);
    // Send the offer to the target peer
    socket.to(data.target).emit("offer", { sender: socket.id, offer: data.offer });
  });

  // Relay the answer message between peers
  socket.on("answer", (data) => {
    console.log("Answer received from", socket.id);
    // Send the answer to the target peer
    socket.to(data.target).emit("answer", { sender: socket.id, answer: data.answer });
  });

  // Relay the ICE candidates between peers
  socket.on("ice-candidate", (data) => {
    console.log("ICE candidate received from", socket.id);
    // Send the ICE candidate to the target peer
    socket.to(data.target).emit("ice-candidate", { sender: socket.id, candidate: data.candidate });
  });

  // Handle user disconnection
  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
  });
});

// Define the server's port
const PORT = process.env.PORT || 3000;

// Start the server
server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
