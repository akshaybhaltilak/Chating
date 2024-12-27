import React, { useState, useEffect } from "react";
import { io } from "socket.io-client";
import './index.css'


const socket = io("http://localhost:3001");

const App = () => {
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);

  useEffect(() => {
    socket.on("receive_message", (data) => {
      setMessages((prev) => [...prev, data]);
    });

    return () => socket.off("receive_message");
  }, []);

  const sendMessage = () => {
    if (message.trim()) {
      const msgData = {
        text: message,
        id: socket.id,
        time: new Date().toLocaleTimeString(),
      };
      socket.emit("send_message", msgData);
      setMessages((prev) => [...prev, msgData]);
      setMessage("");
    }
  };

  return (
    <div className="flex flex-col items-center justify-center h-screen bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500">
      <div className="w-full max-w-lg bg-white shadow-xl rounded-lg p-6">
        <h1 className="text-2xl font-bold text-gray-800 mb-4 text-center">
          💬 Real-Time Chat
        </h1>

        {/* Chat Box */}
        <div className="h-64 overflow-y-auto p-4 bg-gray-100 rounded-lg shadow-inner">
          {messages.length > 0 ? (
            messages.map((msg, idx) => (
              <div
                key={idx}
                className={`p-3 my-2 rounded-lg ${
                  msg.id === socket.id
                    ? "bg-blue-500 text-white self-end"
                    : "bg-gray-300 text-gray-800"
                }`}
              >
                <span className="block text-sm font-medium">
                  {msg.id === socket.id ? "You" : "User"}
                </span>
                <p>{msg.text}</p>
                <span className="block text-xs text-gray-400">{msg.time}</span>
              </div>
            ))
          ) : (
            <p className="text-gray-400 text-center">No messages yet.</p>
          )}
        </div>

        {/* Input Section */}
        <div className="mt-4 flex">
          <input
            type="text"
            placeholder="Type your message..."
            className="flex-grow px-4 py-2 border border-gray-300 rounded-l-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
          />
          <button
            className="px-6 py-2 bg-blue-500 text-white font-bold rounded-r-lg hover:bg-blue-600 transition duration-200"
            onClick={sendMessage}
          >
            Send
          </button>
          
        </div>
      </div>
    </div>
  );
};

export default App;
