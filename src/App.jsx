import React, { useState, useEffect, useRef } from "react";
import { getDatabase, ref, push, onChildAdded, remove } from "firebase/database";
import { initializeApp } from "firebase/app";
import { MessageCircle, Send, Trash2 } from "lucide-react";

// Firebase Configuration
const firebaseConfig = {
  apiKey: "AIzaSyD1-lTZAZ7sSqDeLyYd7J7sJSUHL7lPHbs",
  authDomain: "chat-app-76979.firebaseapp.com",
  projectId: "chat-app-76979",
  storageBucket: "chat-app-76979.firebasestorage.app",
  messagingSenderId: "509762392994",
  appId: "1:509762392994:web:a247d9806437d69e7c58fb",
  databaseURL: "https://chat-app-76979-default-rtdb.firebaseio.com/",
  measurementId: "G-BTTCJ4HXDJ"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const database = getDatabase(app);

const App = () => {
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);
  const [userId] = useState(() => `user-${Math.random().toString(36).substr(2, 9)}`);
  const messagesEndRef = useRef(null);
  const unsubscribeRef = useRef(null);

  // Scroll to bottom of messages
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    const messagesRef = ref(database, "chats");
    const messageIds = new Set(); // Keep track of processed message IDs

    // Set up message listener
    unsubscribeRef.current = onChildAdded(messagesRef, (snapshot) => {
      const messageId = snapshot.key;
      // Only add message if we haven't processed it before
      if (!messageIds.has(messageId)) {
        messageIds.add(messageId);
        setMessages(prevMessages => [...prevMessages, { id: messageId, ...snapshot.val() }]);
      }
    });

    // Cleanup function
    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
      }
    };
  }, []); // Empty dependency array - only run once on mount

  // Scroll to bottom whenever messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const sendMessage = async () => {
    if (message.trim()) {
      try {
        const msgData = {
          text: message.trim(),
          time: new Date().toLocaleTimeString(),
          userId: userId,
          sender: "Sanchu",
          timestamp: Date.now() // Add timestamp for ordering
        };

        // Push message to Firebase and wait for completion
        await push(ref(database, "chats"), msgData);
        setMessage(""); // Clear input only after successful send
      } catch (error) {
        console.error("Error sending message:", error);
        // Optionally add error handling UI here
      }
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const clearChat = async () => {
    try {
      await remove(ref(database, "chats"));
      setMessages([]); // Clear local messages
    } catch (error) {
      console.error("Error clearing chat:", error);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-orange-400 via-pink-200 to-white p-4">
      <div className="w-full max-w-lg bg-white shadow-2xl rounded-xl overflow-hidden">
        {/* Header */}
        <div className="bg-orange-500 p-4 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <MessageCircle className="text-white" size={24} />
            <h1 className="text-2xl font-bold text-white">Chat for My Love</h1>
          </div>
          <button
            onClick={clearChat}
            className="p-2 hover:bg-orange-600 rounded-full transition-colors"
            title="Clear chat"
          >
            <Trash2 className="text-white" size={20} />
          </button>
        </div>

        {/* Love Quote */}
        <div className="bg-pink-50 p-3 text-center border-b">
          <p className="text-gray-600 italic">
            "Sanchu, you're the reason behind my every smile ❤️"
          </p>
        </div>

        {/* Chat Box */}
        <div className="h-96 overflow-y-auto p-4 bg-gray-50">
          {messages.length > 0 ? (
            messages
              .sort((a, b) => a.timestamp - b.timestamp) // Sort messages by timestamp
              .map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.userId === userId ? 'justify-end' : 'justify-start'} mb-4`}
                >
                  <div
                    className={`max-w-[70%] rounded-xl p-3 ${
                      msg.userId === userId
                        ? 'bg-orange-500 text-white rounded-br-none'
                        : 'bg-gray-200 text-gray-800 rounded-bl-none'
                    }`}
                  >
                    <div className="font-medium text-sm mb-1">
                      {msg.userId === userId ? 'You' : msg.sender}
                    </div>
                    <p className="break-words">{msg.text}</p>
                    <div className={`text-xs mt-1 ${
                      msg.userId === userId ? 'text-orange-100' : 'text-gray-500'
                    }`}>
                      {msg.time}
                    </div>
                  </div>
                </div>
              ))
          ) : (
            <div className="flex items-center justify-center h-full">
              <p className="text-gray-400 text-center">
                No messages yet. Be the first to say hi! 😊
              </p>
            </div>
          )}
          <div ref={messagesEndRef} /> {/* Scroll anchor */}
        </div>

        {/* Input Section */}
        <div className="p-4 bg-white border-t">
          <div className="flex space-x-2">
            <textarea
              rows="1"
              placeholder="Type your message..."
              className="flex-grow px-4 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-400 resize-none"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyPress={handleKeyPress}
            />
            <button
              className="px-4 py-2 bg-orange-500 text-white rounded-xl hover:bg-orange-600 transition duration-200 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={sendMessage}
              disabled={!message.trim()}
            >
              <Send size={20} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default App;