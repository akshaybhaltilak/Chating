import React, { useState, useEffect, useRef } from "react";
import { getDatabase, ref, push, onChildAdded, remove, update, query, orderByChild, get } from "firebase/database";
import { initializeApp } from "firebase/app";
import { MessageCircle, Send, Trash2, Image, Smile, Moon, Sun, Settings, UserCircle, Bell, Search, ChevronDown } from "lucide-react";

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

// Emoji picker data
const emojiCategories = [
  { name: "Smileys", emojis: ["😀", "😃", "😄", "😁", "😆", "😅", "😂", "🤣", "🥲", "☺️", "😊"] },
  { name: "Gestures", emojis: ["👍", "👎", "👌", "✌️", "🤞", "🤝", "🙏", "👏", "🤲", "👐"] },
  { name: "Animals", emojis: ["🐶", "🐱", "🐭", "🐹", "🐰", "🦊", "🐻", "🐼", "🐨", "🐯"] },
  { name: "Food", emojis: ["🍎", "🍐", "🍊", "🍋", "🍌", "🍉", "🍇", "🍓", "🫐", "🍈"] },
];

// Username generation
const adjectives = ["Happy", "Clever", "Brave", "Gentle", "Wise", "Lucky", "Swift", "Calm", "Bright", "Kind"];
const nouns = ["Dolphin", "Tiger", "Eagle", "Fox", "Wolf", "Panda", "Koala", "Rabbit", "Lion", "Bear"];

const generateUsername = () => {
  const adjective = adjectives[Math.floor(Math.random() * adjectives.length)];
  const noun = nouns[Math.floor(Math.random() * nouns.length)];
  return `${adjective}${noun}`;
};

// Theme colors
const themes = {
  light: {
    primary: "from-purple-600 to-pink-500",
    secondary: "bg-white",
    text: "text-gray-800",
    background: "bg-gradient-to-br from-purple-500 via-pink-300 to-white",
    messageArea: "bg-gray-50",
    userMessage: "bg-purple-500 text-white",
    otherMessage: "bg-gray-200 text-gray-800",
    input: "bg-white border-gray-300",
    button: "bg-purple-500 hover:bg-purple-600",
  },
  dark: {
    primary: "from-indigo-900 to-purple-900",
    secondary: "bg-gray-800",
    text: "text-gray-200",
    background: "bg-gradient-to-br from-gray-900 via-purple-900 to-indigo-900",
    messageArea: "bg-gray-800",
    userMessage: "bg-indigo-600 text-white",
    otherMessage: "bg-gray-700 text-gray-200",
    input: "bg-gray-700 border-gray-600 text-white",
    button: "bg-indigo-600 hover:bg-indigo-700",
  },
};

const App = () => {
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);
  const [userId] = useState(() => `user-${Math.random().toString(36).substr(2, 9)}`);
  const [username, setUsername] = useState(() => generateUsername());
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [selectedEmoji, setSelectedEmoji] = useState("😊");
  const [showNotification, setShowNotification] = useState(false);
  const [notificationMessage, setNotificationMessage] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("Smileys");
  const messagesEndRef = useRef(null);
  const emojiPickerRef = useRef(null);
  const settingsRef = useRef(null);
  const unsubscribeRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const theme = darkMode ? themes.dark : themes.light;

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(event.target)) {
        setShowEmojiPicker(false);
      }
      if (settingsRef.current && !settingsRef.current.contains(event.target)) {
        setShowSettings(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  useEffect(() => {
    const messagesRef = ref(database, "chats");
    const messageIds = new Set();

    unsubscribeRef.current = onChildAdded(messagesRef, (snapshot) => {
      const messageId = snapshot.key;
      const messageData = snapshot.val();
      
      if (!messageIds.has(messageId)) {
        messageIds.add(messageId);
        setMessages(prevMessages => [...prevMessages, { id: messageId, ...messageData }]);
        
        // Show notification for new messages from others
        if (messageData.userId !== userId) {
          setNotificationMessage(`New message from ${messageData.sender}`);
          setShowNotification(true);
          setTimeout(() => setShowNotification(false), 3000);
        }
      }
    });

    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
      }
    };
  }, [userId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const updateTypingStatus = (isTypingNow) => {
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    
    update(ref(database, "typing"), {
      [userId]: isTypingNow ? {
        username,
        timestamp: Date.now()
      } : null
    });
    
    if (isTypingNow) {
      typingTimeoutRef.current = setTimeout(() => {
        update(ref(database, "typing"), {
          [userId]: null
        });
      }, 3000);
    }
  };

  const sendMessage = async () => {
    if (message.trim()) {
      try {
        const msgData = {
          text: message.trim(),
          time: new Date().toLocaleTimeString(),
          userId: userId,
          sender: username,
          timestamp: Date.now(),
          emoji: selectedEmoji
        };

        await push(ref(database, "chats"), msgData);
        setMessage("");
        updateTypingStatus(false);
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

  const handleEmojiClick = (emoji) => {
    setSelectedEmoji(emoji);
    setMessage(message + emoji);
  };

  const handleUsernameChange = (e) => {
    setUsername(e.target.value);
  };

  const handleMessageChange = (e) => {
    setMessage(e.target.value);
    updateTypingStatus(e.target.value.trim() !== "");
  };

  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
  };

  const searchMessages = () => {
    if (!searchQuery.trim()) return messages;
    return messages.filter(msg => 
      msg.text.toLowerCase().includes(searchQuery.toLowerCase()) ||
      msg.sender.toLowerCase().includes(searchQuery.toLowerCase())
    );
  };

  const filteredMessages = searchMessages();

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className={`flex flex-col items-center justify-center min-h-screen ${theme.background} p-4 transition-colors duration-300`}>
      <div className={`w-full max-w-xl ${theme.secondary} shadow-xl rounded-xl overflow-hidden border border-gray-200 transition-colors duration-300`}>
        {/* Header */}
        <div className={`bg-gradient-to-r ${theme.primary} p-4 flex items-center justify-between text-white`}>
          <div className="flex items-center space-x-2">
            <MessageCircle size={24} />
            <h1 className="text-2xl font-bold">Chat App</h1>
          </div>
          <div className="flex space-x-2">
            <button
              onClick={() => setShowSearch(!showSearch)}
              className="p-2 hover:bg-opacity-20 hover:bg-white rounded-full transition-colors"
              title="Search messages"
            >
              <Search size={20} />
            </button>
            <button
              onClick={toggleDarkMode}
              className="p-2 hover:bg-opacity-20 hover:bg-white rounded-full transition-colors"
              title={darkMode ? "Switch to light mode" : "Switch to dark mode"}
            >
              {darkMode ? <Sun size={20} /> : <Moon size={20} />}
            </button>
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="p-2 hover:bg-opacity-20 hover:bg-white rounded-full transition-colors"
              title="Settings"
            >
              <Settings size={20} />
            </button>
            <button
              onClick={clearChat}
              className="p-2 hover:bg-opacity-20 hover:bg-white rounded-full transition-colors"
              title="Clear chat"
            >
              <Trash2 size={20} />
            </button>
          </div>
        </div>

        {/* Settings Panel */}
        {showSettings && (
          <div 
            ref={settingsRef}
            className={`${theme.secondary} border-b p-4 ${theme.text} transition-colors duration-300`}
          >
            <h3 className="font-medium mb-2">Profile Settings</h3>
            <div className="flex items-center space-x-2 mb-4">
              <UserCircle size={24} className="text-purple-500" />
              <input
                type="text"
                value={username}
                onChange={handleUsernameChange}
                className={`${theme.input} px-3 py-1 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-400 transition-colors`}
                placeholder="Your display name"
              />
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <span>Select status emoji:</span>
                <div 
                  className="cursor-pointer text-xl"
                  onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                >
                  {selectedEmoji}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Search Bar */}
        {showSearch && (
          <div className={`${theme.secondary} border-b p-2 flex items-center ${theme.text} transition-colors duration-300`}>
            <Search size={16} className="ml-2 mr-1 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`${theme.input} flex-grow px-2 py-1 rounded-lg focus:outline-none focus:ring-1 focus:ring-purple-400 text-sm transition-colors`}
              placeholder="Search messages..."
            />
          </div>
        )}

        {/* Message Area */}
        <div className={`h-96 overflow-y-auto p-4 ${theme.messageArea} transition-colors duration-300`}>
          {filteredMessages.length > 0 ? (
            filteredMessages.sort((a, b) => a.timestamp - b.timestamp).map((msg, index) => {
              const showDate = index === 0 || new Date(msg.timestamp).toDateString() !== new Date(filteredMessages[index - 1].timestamp).toDateString();
              return (
                <React.Fragment key={msg.id}>
                  {showDate && (
                    <div className="flex justify-center my-3">
                      <div className={`px-3 py-1 rounded-full text-xs ${darkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-200 text-gray-600'}`}>
                        {new Date(msg.timestamp).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })}
                      </div>
                    </div>
                  )}
                  <div className={`flex ${msg.userId === userId ? 'justify-end' : 'justify-start'} mb-4`}>
                    {msg.userId !== userId && (
                      <div className="flex flex-col items-center mr-2">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-400 to-purple-500 flex items-center justify-center text-white font-bold">
                          {msg.sender.charAt(0)}
                        </div>
                      </div>
                    )}
                    <div
                      className={`max-w-[70%] rounded-xl p-3 shadow-md ${
                        msg.userId === userId
                          ? `${theme.userMessage} rounded-br-none`
                          : `${theme.otherMessage} rounded-bl-none`
                      } transition-colors duration-300`}
                    >
                      <div className="font-medium text-sm mb-1 flex justify-between items-center">
                        <span>{msg.userId === userId ? 'You' : msg.sender}</span>
                        <span className="text-xs ml-2">{formatTime(msg.timestamp)}</span>
                      </div>
                      <p className="break-words">{msg.text}</p>
                      {msg.emoji && msg.emoji !== "😊" && (
                        <div className="text-right mt-1 text-lg">
                          {msg.emoji}
                        </div>
                      )}
                    </div>
                  </div>
                </React.Fragment>
              );
            })
          ) : (
            <div className="flex items-center justify-center h-full">
              <p className={`${theme.text} text-center transition-colors duration-300`}>
                No messages yet. Be the first to say hi! {selectedEmoji}
              </p>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Typing Indicator */}
        <div className={`px-4 py-1 ${theme.secondary} ${theme.text} text-xs italic transition-colors duration-300`}>
          {isTyping && <p>Someone is typing...</p>}
        </div>

        {/* Message Input */}
        <div className={`p-4 ${theme.secondary} border-t flex items-center transition-colors duration-300`}>
          <div className="relative flex-grow">
            <textarea
              rows="1"
              placeholder="Type your message..."
              className={`w-full px-4 py-2 pr-10 border rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-400 resize-none ${theme.input} transition-colors duration-300`}
              value={message}
              onChange={handleMessageChange}
              onKeyPress={handleKeyPress}
            />
            <div className="absolute right-2 top-2 flex">
              <button
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                className={`p-1 rounded-full hover:bg-gray-200 ${darkMode ? 'hover:bg-gray-700' : ''} transition-colors`}
              >
                <Smile size={18} className={darkMode ? 'text-gray-300' : 'text-gray-500'} />
              </button>
            </div>
            {showEmojiPicker && (
              <div 
                ref={emojiPickerRef}
                className={`absolute bottom-12 right-0 ${theme.secondary} shadow-lg rounded-lg p-2 border ${darkMode ? 'border-gray-700' : 'border-gray-200'} z-10 w-64 transition-colors duration-300`}
              >
                <div className="flex border-b mb-2 pb-1">
                  {emojiCategories.map(category => (
                    <button
                      key={category.name}
                      className={`p-1 mx-1 text-xs rounded ${selectedCategory === category.name ? 'bg-purple-100 text-purple-600' : ''} ${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}
                      onClick={() => setSelectedCategory(category.name)}
                    >
                      {category.name}
                    </button>
                  ))}
                </div>
                <div className="grid grid-cols-6 gap-1">
                  {emojiCategories.find(c => c.name === selectedCategory).emojis.map((emoji, index) => (
                    <button
                      key={index}
                      className={`p-1 text-xl hover:bg-gray-100 ${darkMode ? 'hover:bg-gray-700' : ''} rounded`}
                      onClick={() => handleEmojiClick(emoji)}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
          <button
            className={`ml-2 px-4 py-2 ${theme.button} text-white rounded-xl transition duration-200 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed`}
            onClick={sendMessage}
            disabled={!message.trim()}
          >
            <Send size={20} />
          </button>
        </div>
      </div>
      
      {/* Notification */}
      {showNotification && (
        <div className="fixed top-4 right-4 bg-purple-600 text-white px-4 py-2 rounded-lg shadow-lg animate-fade-in-out">
          <div className="flex items-center space-x-2">
            <Bell size={16} />
            <span>{notificationMessage}</span>
          </div>
        </div>
      )}
      
      {/* Add a bit of custom CSS for animations */}
      <style jsx>{`
        @keyframes fadeInOut {
          0% { opacity: 0; transform: translateY(-20px); }
          10% { opacity: 1; transform: translateY(0); }
          90% { opacity: 1; transform: translateY(0); }
          100% { opacity: 0; transform: translateY(-20px); }
        }
        .animate-fade-in-out {
          animation: fadeInOut 3s forwards;
        }
      `}</style>
    </div>
  );
};

export default App;
