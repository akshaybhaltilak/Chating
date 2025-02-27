import React, { useState, useEffect, useRef } from "react";
import { 
  getDatabase, ref, push, onChildAdded, get, set, query, orderByChild, equalTo 
} from "firebase/database";
import { 
  getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, onAuthStateChanged, signOut 
} from "firebase/auth";
import { initializeApp } from "firebase/app";
import { MessageCircle, Send, Moon, Sun, UserCircle, LogOut, Mail } from "lucide-react";

// Firebase Configuration
const firebaseConfig = {
  apiKey: "AIzaSyD1-lTZAZ7sSqDeLyYd7J7sJSUHL7lPHbs",
  authDomain: "chat-app-76979.firebaseapp.com",
  projectId: "chat-app-76979",
  databaseURL: "https://chat-app-76979-default-rtdb.firebaseio.com/",
  storageBucket: "chat-app-76979.firebasestorage.app",
  messagingSenderId: "509762392994",
  appId: "1:509762392994:web:a247d9806437d69e7c58fb"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const database = getDatabase(app);
const auth = getAuth(app);

const App = () => {
  // Auth states
  const [user, setUser] = useState(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [isLogin, setIsLogin] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  
  // Chat states
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);
  const [darkMode, setDarkMode] = useState(false);
  const [activeChat, setActiveChat] = useState(null);
  const [contacts, setContacts] = useState([]);
  const [searchEmail, setSearchEmail] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  
  const messagesEndRef = useRef(null);
  const theme = darkMode ? "dark" : "light";

  // Auth listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        // Get user profile
        get(ref(database, `users/${currentUser.uid}`))
          .then((snapshot) => {
            if (snapshot.exists()) {
              setDisplayName(snapshot.val().displayName);
            }
          });
        // Load contacts
        loadContacts(currentUser.uid);
      } else {
        setUser(null);
        setActiveChat(null);
        setMessages([]);
      }
    });
    return () => unsubscribe();
  }, []);

  // Scroll to bottom when messages update
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Load messages when active chat changes
  useEffect(() => {
    if (activeChat) {
      loadMessages(activeChat.chatId);
    }
  }, [activeChat]);

  const loadContacts = async (userId) => {
    try {
      const contactsRef = ref(database, `userChats/${userId}`);
      const snapshot = await get(contactsRef);
      if (snapshot.exists()) {
        const contactsList = [];
        snapshot.forEach((childSnapshot) => {
          contactsList.push({
            id: childSnapshot.key,
            ...childSnapshot.val()
          });
        });
        setContacts(contactsList);
      }
    } catch (error) {
      console.error("Error loading contacts:", error);
    }
  };

  const loadMessages = (chatId) => {
    const messagesRef = ref(database, `chats/${chatId}/messages`);
    setMessages([]);
    
    onChildAdded(messagesRef, (snapshot) => {
      const messageData = snapshot.val();
      setMessages(prevMessages => [...prevMessages, { id: snapshot.key, ...messageData }]);
    });
  };

  const handleAuth = async (e) => {
    e.preventDefault();
    setErrorMsg("");
    
    try {
      if (isLogin) {
        // Login
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        // Register
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        // Create user profile
        await set(ref(database, `users/${userCredential.user.uid}`), {
          email,
          displayName: displayName || email.split('@')[0],
          createdAt: Date.now()
        });
      }
      setEmail("");
      setPassword("");
      setDisplayName("");
    } catch (error) {
      setErrorMsg(error.message);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  const handleSearchUser = async () => {
    if (!searchEmail.trim() || searchEmail === user.email) return;
    
    try {
      const usersRef = ref(database, "users");
      const emailQuery = query(usersRef, orderByChild("email"), equalTo(searchEmail));
      const snapshot = await get(emailQuery);
      
      if (snapshot.exists()) {
        const userData = Object.entries(snapshot.val())[0];
        const userId = userData[0];
        const userInfo = userData[1];
        
        // Check if chat already exists
        const userChatsRef = ref(database, `userChats/${user.uid}`);
        const userChatsSnapshot = await get(userChatsRef);
        
        let existingChatId = null;
        
        if (userChatsSnapshot.exists()) {
          Object.entries(userChatsSnapshot.val()).forEach(([key, chat]) => {
            if (chat.userId === userId) {
              existingChatId = chat.chatId;
            }
          });
        }
        
        if (existingChatId) {
          // Chat exists, open it
          setActiveChat({
            chatId: existingChatId,
            displayName: userInfo.displayName,
            userId
          });
        } else {
          // Create new chat
          const newChatId = Date.now().toString();
          
          // Add to current user's chats
          await set(ref(database, `userChats/${user.uid}/${userId}`), {
            userId,
            displayName: userInfo.displayName,
            chatId: newChatId,
            timestamp: Date.now()
          });
          
          // Add to other user's chats
          await set(ref(database, `userChats/${userId}/${user.uid}`), {
            userId: user.uid,
            displayName: displayName || user.email.split('@')[0],
            chatId: newChatId,
            timestamp: Date.now()
          });
          
          // Open the new chat
          setActiveChat({
            chatId: newChatId,
            displayName: userInfo.displayName,
            userId
          });
          
          // Refresh contacts
          loadContacts(user.uid);
        }
        
        setSearchEmail("");
        setShowSearch(false);
      } else {
        setErrorMsg("User not found");
        setTimeout(() => setErrorMsg(""), 3000);
      }
    } catch (error) {
      console.error("Error searching for user:", error);
      setErrorMsg("Error searching for user");
      setTimeout(() => setErrorMsg(""), 3000);
    }
  };

  const sendMessage = async () => {
    if (!message.trim() || !activeChat) return;
    
    try {
      const msgData = {
        text: message.trim(),
        senderId: user.uid,
        senderName: displayName || user.email.split('@')[0],
        timestamp: Date.now()
      };
      
      await push(ref(database, `chats/${activeChat.chatId}/messages`), msgData);
      setMessage("");
    } catch (error) {
      console.error("Error sending message:", error);
    }
  };
  
  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const openChat = (contact) => {
    setActiveChat({
      chatId: contact.chatId,
      displayName: contact.displayName,
      userId: contact.userId
    });
  };

  // Helper functions
  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
  };

  // Auth screen
  if (!user) {
    return (
      <div className={`flex flex-col items-center justify-center min-h-screen bg-gradient-to-br ${
        theme === "dark" 
          ? "from-gray-900 via-purple-900 to-indigo-900 text-white" 
          : "from-purple-500 via-pink-300 to-white"
      } p-4 transition-colors duration-300`}>
        <div className={`w-full max-w-md p-6 rounded-xl shadow-md ${
          theme === "dark" ? "bg-gray-800" : "bg-white"
        }`}>
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center space-x-2">
              <MessageCircle size={24} className="text-purple-500" />
              <h1 className="text-2xl font-bold">Chat App</h1>
            </div>
            <button onClick={toggleDarkMode} className="p-2 rounded-full">
              {darkMode ? <Sun size={20} /> : <Moon size={20} />}
            </button>
          </div>
          
          <h2 className="text-xl font-semibold mb-4">{isLogin ? "Log In" : "Create Account"}</h2>
          
          {errorMsg && (
            <div className="mb-4 p-2 bg-red-100 border border-red-400 text-red-700 rounded">
              {errorMsg}
            </div>
          )}
          
          <form onSubmit={handleAuth}>
            {!isLogin && (
              <div className="mb-4">
                <label className="block mb-1">Display Name</label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-400 ${
                    theme === "dark" ? "bg-gray-700 border-gray-600 text-white" : ""
                  }`}
                  placeholder="Your name"
                />
              </div>
            )}
            
            <div className="mb-4">
              <label className="block mb-1">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-400 ${
                  theme === "dark" ? "bg-gray-700 border-gray-600 text-white" : ""
                }`}
                placeholder="example@email.com"
                required
              />
            </div>
            
            <div className="mb-6">
              <label className="block mb-1">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-400 ${
                  theme === "dark" ? "bg-gray-700 border-gray-600 text-white" : ""
                }`}
                placeholder="••••••••"
                required
              />
            </div>
            
            <button
              type="submit"
              className="w-full py-2 px-4 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition duration-300"
            >
              {isLogin ? "Log In" : "Sign Up"}
            </button>
          </form>
          
          <div className="mt-4 text-center">
            <button
              onClick={() => setIsLogin(!isLogin)}
              className="text-purple-600 hover:text-purple-800"
            >
              {isLogin ? "Need an account? Sign up" : "Already have an account? Log in"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Main chat app
  return (
    <div className={`flex flex-col items-center justify-center min-h-screen bg-gradient-to-br ${
      theme === "dark" 
        ? "from-gray-900 via-purple-900 to-indigo-900" 
        : "from-purple-500 via-pink-300 to-white"
    } p-4 transition-colors duration-300`}>
      <div className={`w-full max-w-4xl flex h-[600px] rounded-xl overflow-hidden shadow-xl border ${
        theme === "dark" ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"
      }`}>
        {/* Sidebar */}
        <div className={`w-1/3 border-r ${
          theme === "dark" ? "bg-gray-800 border-gray-700 text-white" : "bg-gray-50 border-gray-200"
        }`}>
          {/* User profile */}
          <div className={`p-4 border-b flex justify-between items-center ${
            theme === "dark" ? "border-gray-700" : "border-gray-200"
          }`}>
            <div className="flex items-center space-x-2">
              <UserCircle size={24} className="text-purple-500" />
              <span className="font-medium truncate">{displayName || user.email}</span>
            </div>
            <div className="flex space-x-2">
              <button onClick={toggleDarkMode} className="p-2 rounded-full">
                {darkMode ? <Sun size={18} /> : <Moon size={18} />}
              </button>
              <button onClick={handleLogout} className="p-2 rounded-full">
                <LogOut size={18} />
              </button>
            </div>
          </div>
          
          {/* Search */}
          <div className="p-3">
            {showSearch ? (
              <div className="flex">
                <input
                  type="email"
                  value={searchEmail}
                  onChange={(e) => setSearchEmail(e.target.value)}
                  className={`flex-grow px-3 py-2 text-sm border rounded-l-lg focus:outline-none ${
                    theme === "dark" ? "bg-gray-700 border-gray-600 text-white" : ""
                  }`}
                  placeholder="Enter email to chat"
                />
                <button
                  onClick={handleSearchUser}
                  className="px-3 py-2 bg-purple-600 text-white rounded-r-lg"
                >
                  Chat
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowSearch(true)}
                className="flex items-center justify-center w-full py-2 px-3 text-sm rounded-lg border border-dashed bg-transparent"
              >
                <Mail size={16} className="mr-2" />
                <span>New conversation</span>
              </button>
            )}
          </div>
          
          {/* Contacts list */}
          <div className="overflow-y-auto h-[calc(600px-128px)]">
            {contacts.length > 0 ? (
              contacts.map((contact) => (
                <div
                  key={contact.id}
                  onClick={() => openChat(contact)}
                  className={`p-3 border-b flex items-center cursor-pointer hover:bg-gray-100 ${
                    activeChat && activeChat.chatId === contact.chatId
                      ? theme === "dark" ? "bg-gray-700" : "bg-purple-50"
                      : ""
                  } ${
                    theme === "dark" 
                      ? "border-gray-700 hover:bg-gray-700 text-gray-200" 
                      : "border-gray-100"
                  }`}
                >
                  <div className="w-10 h-10 rounded-full bg-gradient-to-r from-purple-400 to-pink-500 flex items-center justify-center text-white font-bold mr-3">
                    {contact.displayName ? contact.displayName.charAt(0).toUpperCase() : "U"}
                  </div>
                  <div>
                    <div className="font-medium">{contact.displayName}</div>
                    <div className="text-xs text-gray-500">
                      {formatTime(contact.timestamp)}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-4 text-center text-gray-500 text-sm">
                No conversations yet. Search for a user by email to start chatting.
              </div>
            )}
          </div>
        </div>
        
        {/* Chat area */}
        <div className={`w-2/3 flex flex-col ${
          theme === "dark" ? "bg-gray-800 text-white" : "bg-white"
        }`}>
          {activeChat ? (
            <>
              {/* Chat header */}
              <div className={`p-4 border-b flex items-center ${
                theme === "dark" ? "border-gray-700" : "border-gray-200"
              }`}>
                <div className="w-8 h-8 rounded-full bg-gradient-to-r from-purple-400 to-pink-500 flex items-center justify-center text-white font-bold mr-3">
                  {activeChat.displayName.charAt(0).toUpperCase()}
                </div>
                <span className="font-medium">{activeChat.displayName}</span>
              </div>
              
              {/* Messages */}
              <div className={`flex-grow p-4 overflow-y-auto ${
                theme === "dark" ? "bg-gray-800" : "bg-gray-50"
              }`}>
                {messages.length > 0 ? (
                  messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`mb-4 flex ${msg.senderId === user.uid ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-[70%] rounded-xl p-3 ${
                          msg.senderId === user.uid
                            ? theme === "dark"
                              ? "bg-indigo-600 text-white rounded-br-none"
                              : "bg-purple-500 text-white rounded-br-none"
                            : theme === "dark"
                              ? "bg-gray-700 text-gray-200 rounded-bl-none"
                              : "bg-gray-200 text-gray-800 rounded-bl-none"
                        }`}
                      >
                        <p className="break-words">{msg.text}</p>
                        <div className="text-xs mt-1 opacity-70 text-right">
                          {formatTime(msg.timestamp)}
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="h-full flex items-center justify-center text-gray-500">
                    <p>Start a conversation with {activeChat.displayName}</p>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
              
              {/* Message input */}
              <div className="p-3 border-t flex items-center">
                <textarea
                  rows="1"
                  placeholder="Type your message..."
                  className={`flex-grow px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-400 resize-none ${
                    theme === "dark" ? "bg-gray-700 border-gray-600 text-white" : ""
                  }`}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                />
                <button
                  className={`ml-2 p-2 rounded-full ${
                    message.trim()
                      ? "bg-purple-600 text-white"
                      : "bg-gray-300 text-gray-500 cursor-not-allowed"
                  }`}
                  onClick={sendMessage}
                  disabled={!message.trim()}
                >
                  <Send size={20} />
                </button>
              </div>
            </>
          ) : (
            <div className="h-full flex flex-col items-center justify-center p-4 text-center">
              <MessageCircle size={64} className="text-purple-500 mb-4 opacity-50" />
              <h3 className="text-xl font-medium mb-2">Select a conversation</h3>
              <p className={theme === "dark" ? "text-gray-400" : "text-gray-500"}>
                Or start a new one by searching for a user
              </p>
            </div>
          )}
        </div>
      </div>
      
      {/* Error notification */}
      {errorMsg && (
        <div className="fixed top-4 right-4 bg-red-600 text-white px-4 py-2 rounded-lg shadow-lg">
          {errorMsg}
        </div>
      )}
    </div>
  );
};

export default App;
