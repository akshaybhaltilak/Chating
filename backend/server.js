const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "https://chating-nfl1.vercel.app",
    methods: ["GET", "POST"],
  },
});

// Add a default route to show a message in the browser
app.get("/", (req, res) => {
  res.send("Hello, welcome to the backend!");
});

io.on("connection", (socket) => {
  console.log("A user connected:", socket.id);

  socket.on("send_message", (data) => {
    io.emit("receive_message", data);
  });

  socket.on("disconnect", () => {
    console.log("A user disconnected:", socket.id);
  });
});

server.listen(3001, () => {
  console.log("Server is running on http://localhost:3001");
  console.log("Hello, welcome to backend"); // Added line
});
