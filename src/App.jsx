// import React, { useState, useEffect } from "react";
// import { io } from "socket.io-client";
// import './index.css';

// // Connect to the socket.io server
// const socket = io("https://chating-backend.onrender.com");

// const App = () => {
//   const [message, setMessage] = useState("");
//   const [messages, setMessages] = useState([]);

//   useEffect(() => {
//     // Load messages from localStorage on component mount
//     const storedMessages = JSON.parse(localStorage.getItem("messages")) || [];
//     setMessages(storedMessages);

//     // Listen for chat history from the server
//     socket.on("chat_history", (history) => {
//       setMessages(history);
//       localStorage.setItem("messages", JSON.stringify(history));
//     });

//     // Listen for incoming messages
//     socket.on("receive_message", (data) => {
//       setMessages((prevMessages) => {
//         const updatedMessages = [...prevMessages, data];
//         localStorage.setItem("messages", JSON.stringify(updatedMessages));
//         return updatedMessages;
//       });
//     });

//     return () => {
//       socket.off("chat_history");
//       socket.off("receive_message");
//     };
//   }, []);

//   const sendMessage = () => {
//     if (message.trim()) {
//       const msgData = {
//         text: message,
//         id: socket.id,
//         time: new Date().toLocaleTimeString(),
//       };
//       // Send the message to the server
//       socket.emit("send_message", msgData);
//       setMessage(""); // Clear input field after sending
//     }
//   };

//   const clearChat = () => {
//     // Clear messages locally and on the server
//     setMessages([]);
//     localStorage.removeItem("messages");
//     socket.emit("clear_chat"); // Tell the server to clear the chat history
//   };

//   return (
//     <div className="flex flex-col items-center justify-center h-screen bg-gradient-to-r from-orange-400 to-white">
//       <div className="w-full max-w-md bg-white shadow-xl rounded-lg p-4 sm:p-6">
//         <h1 className="text-xl sm:text-2xl font-bold text-orange-600 mb-2 text-center">
//           💬 Chat for My Love
//         </h1>
//         <p className="text-center text-gray-600 italic mb-4">
//           "Sanchu, you're the reason behind my every smile ❤️"
//         </p>

//         {/* Chat Box */}
//         <div className="h-60 sm:h-64 overflow-y-auto p-4 bg-gray-100 rounded-lg shadow-inner">
//           {messages.length > 0 ? (
//             messages.map((msg, idx) => (
//               <div
//                 key={idx}
//                 className={`p-3 my-2 rounded-lg ${
//                   msg.id === socket.id
//                     ? "bg-orange-500 text-white self-end"
//                     : "bg-gray-300 text-gray-800"
//                 }`}
//               >
//                 <span className="block text-sm font-medium">
//                   {msg.id === socket.id ? "You" : "User"}
//                 </span>
//                 <p>{msg.text}</p>
//                 <span className="block text-xs text-gray-400">{msg.time}</span>
//               </div>
//             ))
//           ) : (
//             <p className="text-gray-400 text-center">
//               No messages yet. Be the first to say hi! 😊
//             </p>
//           )}
//         </div>

//         {/* Input Section */}
//         <div className="mt-4 flex flex-col sm:flex-row">
//           <input
//             type="text"
//             placeholder="Type your message..."
//             className="flex-grow px-4 py-2 border border-gray-300 rounded-lg sm:rounded-l-lg sm:rounded-none focus:outline-none focus:ring-2 focus:ring-orange-400 mb-2 sm:mb-0"
//             value={message}
//             onChange={(e) => setMessage(e.target.value)}
//           />
//           <button
//             className="px-6 py-2 bg-orange-500 text-white font-bold rounded-lg sm:rounded-r-lg hover:bg-orange-600 transition duration-200"
//             onClick={sendMessage}
//           >
//             Send
//           </button>
//         </div>

//         {/* Clear Chat Button */}
//         <button
//           className="mt-4 px-6 py-2 bg-red-500 text-white font-bold rounded-lg hover:bg-red-600 transition duration-200"
//           onClick={clearChat}
//         >
//           Clear Chat
//         </button>
//       </div>
//     </div>
//   );
// };

// export default App;

import React, { useState, useEffect } from "react";
import { io } from "socket.io-client";
import "./index.css";

// Connect to the socket.io server
const socket = io("https://chating-backend.onrender.com");

// Predefined chat code for login
const CHAT_CODE = "9834153020";

// Login Component
const Login = ({ onLogin }) => {
  const [inputCode, setInputCode] = useState("");

  const handleLogin = () => {
    if (inputCode === CHAT_CODE) {
      onLogin();
    } else {
      alert("Incorrect code! Please try again.");
    }
  };

  return (
    <div className="flex flex-col items-center justify-center h-screen bg-gradient-to-r from-purple-400 to-pink-300">
      <div className="w-full max-w-md bg-white shadow-xl rounded-lg p-6">
        <h1 className="text-xl sm:text-2xl font-bold text-purple-600 text-center mb-4">
          🔐 Secure Chat Login
        </h1>
        <p className="text-center text-gray-600 italic mb-6">
          "Enter the secret code to join the chat."
        </p>

        <input
          type="text"
          placeholder="Enter secret code"
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-400 mb-4"
          value={inputCode}
          onChange={(e) => setInputCode(e.target.value)}
        />
        <button
          className="w-full px-4 py-2 bg-purple-500 text-white font-bold rounded-lg hover:bg-purple-600 transition duration-200"
          onClick={handleLogin}
        >
          Login
        </button>
      </div>
    </div>
  );
};

// Chat App Component
const ChatApp = () => {
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);

  useEffect(() => {
    // Load messages from localStorage on component mount
    const storedMessages = JSON.parse(localStorage.getItem("messages")) || [];
    setMessages(storedMessages);

    // Listen for chat history from the server
    socket.on("chat_history", (history) => {
      setMessages(history);
      localStorage.setItem("messages", JSON.stringify(history));
    });

    // Listen for incoming messages
    socket.on("receive_message", (data) => {
      setMessages((prevMessages) => {
        const updatedMessages = [...prevMessages, data];
        localStorage.setItem("messages", JSON.stringify(updatedMessages));
        return updatedMessages;
      });
    });

    return () => {
      socket.off("chat_history");
      socket.off("receive_message");
    };
  }, []);

  const sendMessage = () => {
    if (message.trim()) {
      const msgData = {
        text: message,
        id: socket.id,
        time: new Date().toLocaleTimeString(),
      };
      // Send the message to the server
      socket.emit("send_message", msgData);
      setMessage(""); // Clear input field after sending
    }
  };

  const clearChat = () => {
    // Clear messages locally and on the server
    setMessages([]);
    localStorage.removeItem("messages");
    socket.emit("clear_chat"); // Tell the server to clear the chat history
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
            <p className="text-gray-400 text-center">
              No messages yet. Be the first to say hi! 😊
            </p>
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

// Main App Component
const App = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  return isLoggedIn ? (
    <ChatApp />
  ) : (
    <Login onLogin={() => setIsLoggedIn(true)} />
  );
};

export default App;

