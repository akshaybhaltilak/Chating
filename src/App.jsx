import React, { useState, useEffect } from "react";
import { io } from "socket.io-client";
import './index.css';

const socket = io("https://chating-backend.onrender.com");

const App = () => {
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);

  useEffect(() => {
    // Load messages from localStorage
    const storedMessages = JSON.parse(localStorage.getItem("messages")) || [];
    setMessages(storedMessages);

    socket.on("receive_message", (data) => {
      const newMessages = [...messages, data];
      setMessages(newMessages);
      // Update localStorage
      localStorage.setItem("messages", JSON.stringify(newMessages));
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
      const newMessages = [...messages, msgData];
      setMessages(newMessages);
      // Update localStorage
      localStorage.setItem("messages", JSON.stringify(newMessages));
      setMessage("");
    }
  };

  const clearChat = () => {
    // Clear messages from local storage and state
    setMessages([]);
    localStorage.removeItem("messages");
  };

  return (
    <div className="flex flex-col items-center justify-center h-screen bg-gradient-to-r from-orange-400 to-white">
      <div className="w-full max-w-md bg-white shadow-xl rounded-lg p-4 sm:p-6">
        <h1 className="text-xl sm:text-2xl font-bold text-orange-600 mb-2 text-center">
          💬 Chat for My Love
        </h1>
        <p className="text-center text-gray-600 italic mb-4">
          "Sanchu, you're the reason behind my every smile ❤️"
        </p>

        {/* Chat Box */}
        <div className="h-60 sm:h-64 overflow-y-auto p-4 bg-gray-100 rounded-lg shadow-inner">
          {messages.length > 0 ? (
            messages.map((msg, idx) => (
              <div
                key={idx}
                className={`p-3 my-2 rounded-lg ${
                  msg.id === socket.id
                    ? "bg-orange-500 text-white self-end"
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
            <p className="text-gray-400 text-center">No messages yet. Be the first to say hi! 😊</p>
          )}
        </div>

        {/* Input Section */}
        <div className="mt-4 flex flex-col sm:flex-row">
          <input
            type="text"
            placeholder="Type your message..."
            className="flex-grow px-4 py-2 border border-gray-300 rounded-lg sm:rounded-l-lg sm:rounded-none focus:outline-none focus:ring-2 focus:ring-orange-400 mb-2 sm:mb-0"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
          />
          <button
            className="px-6 py-2 bg-orange-500 text-white font-bold rounded-lg sm:rounded-r-lg hover:bg-orange-600 transition duration-200"
            onClick={sendMessage}
          >
            Send
          </button>
        </div>

        {/* Clear Chat Button */}
        <button
          className="mt-4 px-6 py-2 bg-red-500 text-white font-bold rounded-lg hover:bg-red-600 transition duration-200"
          onClick={clearChat}
        >
          Clear Chat
        </button>
      </div>
    </div>
  );
};

export default App;