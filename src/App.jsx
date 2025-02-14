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

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    const messagesRef = ref(database, "chats");
    const messageIds = new Set();

    unsubscribeRef.current = onChildAdded(messagesRef, (snapshot) => {
      const messageId = snapshot.key;
      if (!messageIds.has(messageId)) {
        messageIds.add(messageId);
        setMessages(prevMessages => [...prevMessages, { id: messageId, ...snapshot.val() }]);
      }
    });

    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
      }
    };
  }, []);

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
          sender: "User",
          timestamp: Date.now()
        };

        await push(ref(database, "chats"), msgData);
        setMessage("");
      } catch (error) {
        console.error("Error sending message:", error);
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
      setMessages([]);
    } catch (error) {
      console.error("Error clearing chat:", error);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-purple-500 via-pink-300 to-white p-4">
      <div className="w-full max-w-lg bg-white shadow-lg rounded-xl overflow-hidden border border-gray-200">
        <div className="bg-gradient-to-r from-purple-600 to-pink-500 p-4 flex items-center justify-between text-white">
          <div className="flex items-center space-x-2">
            <MessageCircle size={24} />
            <h1 className="text-2xl font-bold">User's Chat</h1>
          </div>
          <button
            onClick={clearChat}
            className="p-2 hover:bg-pink-700 rounded-full transition-colors"
            title="Clear chat"
          >
            <Trash2 size={20} />
          </button>
        </div>

        <div className="h-96 overflow-y-auto p-4 bg-gray-50">
          {messages.length > 0 ? (
            messages.sort((a, b) => a.timestamp - b.timestamp).map((msg) => (
              <div key={msg.id} className={`flex ${msg.userId === userId ? 'justify-end' : 'justify-start'} mb-4`}>
                <div
                  className={`max-w-[70%] rounded-xl p-3 shadow-md ${
                    msg.userId === userId
                      ? 'bg-purple-500 text-white rounded-br-none'
                      : 'bg-gray-200 text-gray-800 rounded-bl-none'
                  }`}
                >
                  <div className="font-medium text-sm mb-1">
                    {msg.userId === userId ? 'You' : msg.sender}
                  </div>
                  <p className="break-words">{msg.text}</p>
                  <div className={`text-xs mt-1 ${msg.userId === userId ? 'text-purple-200' : 'text-gray-500'}`}>
                    {msg.time}
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="flex items-center justify-center h-full">
              <p className="text-gray-400 text-center">No messages yet. Be the first to say hi! 😊</p>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="p-4 bg-white border-t flex items-center">
          <textarea
            rows="1"
            placeholder="Type your message..."
            className="flex-grow px-4 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-400 resize-none"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyPress={handleKeyPress}
          />
          <button
            className="ml-2 px-4 py-2 bg-purple-500 text-white rounded-xl hover:bg-purple-600 transition duration-200 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={sendMessage}
            disabled={!message.trim()}
          >
            <Send size={20} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default App;
