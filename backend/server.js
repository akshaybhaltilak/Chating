const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");

const app = express();
app.use(cors());

// Set up the server and socket.io
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "https://chating-nfl1.vercel.app", // Replace with your frontend's URL
    methods: ["GET", "POST"],
  },
});

// Add a default route to show a message in the browser
app.get("/", (req, res) => {
  res.send("Hello, welcome to the backend!");
});

// Socket.io connection handling
io.on("connection", (socket) => {
  console.log("A user connected:", socket.id);

  socket.on("send_message", (data) => {
    io.emit("receive_message", data);
  });

  socket.on("disconnect", () => {
    console.log("A user disconnected:", socket.id);
  });
});

// Use the PORT provided by Render or default to 3001 locally
const PORT = process.env.PORT || 3001;

server.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});