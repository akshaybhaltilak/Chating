import React, { useState, useEffect, useRef } from "react";
import { 
  getDatabase, ref, push, onChildAdded, get, set, query, orderByChild, equalTo, onValue, update, remove 
} from "firebase/database";
import { 
  getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, onAuthStateChanged, signOut 
} from "firebase/auth";
import { initializeApp } from "firebase/app";
import { MessageCircle, Send, Moon, Sun, UserCircle, LogOut, Users, Check, X, Menu, ArrowLeft } from "lucide-react";

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
  const [usersList, setUsersList] = useState([]);
  const [showUsersList, setShowUsersList] = useState(false);
  const [requestsList, setRequestsList] = useState([]);
  const [showRequests, setShowRequests] = useState(false);
  const [showSidebar, setShowSidebar] = useState(true);
  
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
        // Listen for requests
        listenForRequests(currentUser.uid);
      } else {
        setUser(null);
        setActiveChat(null);
        setMessages([]);
      }
    });
    return () => unsubscribe();
  }, []);

  // Load users
  const loadUsers = async () => {
    if (!user) return;
    
    try {
      const usersRef = ref(database, 'users');
      const snapshot = await get(usersRef);
      
      if (snapshot.exists()) {
        const usersArray = [];
        snapshot.forEach((childSnapshot) => {
          const userId = childSnapshot.key;
          const userData = childSnapshot.val();
          
          // Don't include current user
          if (userId !== user.uid) {
            usersArray.push({
              id: userId,
              ...userData
            });
          }
        });
        setUsersList(usersArray);
      }
    } catch (error) {
      console.error("Error loading users:", error);
    }
  };

  // Listen for friend requests
  const listenForRequests = (userId) => {
    const requestsRef = ref(database, `requests/${userId}`);
    
    onValue(requestsRef, (snapshot) => {
      if (snapshot.exists()) {
        const requestsArray = [];
        snapshot.forEach((childSnapshot) => {
          requestsArray.push({
            id: childSnapshot.key,
            ...childSnapshot.val()
          });
        });
        setRequestsList(requestsArray);
      } else {
        setRequestsList([]);
      }
    });
  };

  // Scroll to bottom when messages update
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Load messages when active chat changes
  useEffect(() => {
    if (activeChat) {
      loadMessages(activeChat.chatId);
      // Hide sidebar on mobile when chat is active
      if (window.innerWidth < 768) {
        setShowSidebar(false);
      }
    }
  }, [activeChat]);

  const loadContacts = async (userId) => {
    try {
      const contactsRef = ref(database, `userChats/${userId}`);
      onValue(contactsRef, (snapshot) => {
        if (snapshot.exists()) {
          const contactsList = [];
          snapshot.forEach((childSnapshot) => {
            contactsList.push({
              id: childSnapshot.key,
              ...childSnapshot.val()
            });
          });
          setContacts(contactsList);
        } else {
          setContacts([]);
        }
      });
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

  const sendFriendRequest = async (targetUserId) => {
    try {
      await set(ref(database, `requests/${targetUserId}/${user.uid}`), {
        senderId: user.uid,
        senderName: displayName || user.email.split('@')[0],
        senderEmail: user.email,
        status: 'pending',
        timestamp: Date.now()
      });
      
      setShowUsersList(false);
      showNotification("Friend request sent");
    } catch (error) {
      console.error("Error sending friend request:", error);
    }
  };

  const handleRequestResponse = async (requestId, accept) => {
    try {
      if (accept) {
        const requestData = requestsList.find(req => req.id === requestId);
        
        // Create chat
        const newChatId = Date.now().toString();
        
        // Add to current user's chats
        await set(ref(database, `userChats/${user.uid}/${requestId}`), {
          userId: requestId,
          displayName: requestData.senderName,
          chatId: newChatId,
          timestamp: Date.now()
        });
        
        // Add to requester's chats
        await set(ref(database, `userChats/${requestId}/${user.uid}`), {
          userId: user.uid,
          displayName: displayName || user.email.split('@')[0],
          chatId: newChatId,
          timestamp: Date.now()
        });
      }
      
      // Remove request
      await remove(ref(database, `requests/${user.uid}/${requestId}`));
      
      showNotification(accept ? "Friend request accepted" : "Friend request declined");
    } catch (error) {
      console.error("Error handling friend request:", error);
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
      
      // Update last message
      await update(ref(database, `userChats/${user.uid}/${activeChat.userId}`), {
        timestamp: Date.now(),
        lastMessage: message.trim()
      });
      
      await update(ref(database, `userChats/${activeChat.userId}/${user.uid}`), {
        timestamp: Date.now(),
        lastMessage: message.trim()
      });
      
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

  const showNotification = (message) => {
    setErrorMsg(message);
    setTimeout(() => setErrorMsg(""), 3000);
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
        theme === "dark" ? "from-gray-900 via-purple-900 to-indigo-900 text-white" : "from-purple-500 via-pink-300 to-white"
      } p-4 transition-colors duration-300`}>
        <div className={`w-full max-w-md p-6 rounded-xl shadow-md ${theme === "dark" ? "bg-gray-800" : "bg-white"}`}>
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
                  className={`w-full px-3 py-2 border rounded-lg ${
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
                className={`w-full px-3 py-2 border rounded-lg ${
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
                className={`w-full px-3 py-2 border rounded-lg ${
                  theme === "dark" ? "bg-gray-700 border-gray-600 text-white" : ""
                }`}
                placeholder="••••••••"
                required
              />
            </div>
            
            <button
              type="submit"
              className="w-full py-2 px-4 bg-purple-600 hover:bg-purple-700 text-white rounded-lg"
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
    <div className={`flex flex-col h-screen bg-gradient-to-br ${
      theme === "dark" ? "from-gray-900 via-purple-900 to-indigo-900" : "from-purple-500 via-pink-300 to-white"
    } transition-colors duration-300`}>
      <div className={`flex flex-grow overflow-hidden ${
        theme === "dark" ? "bg-gray-800 text-white" : "bg-white"
      } m-0 sm:m-4 rounded-none sm:rounded-xl shadow-xl`}>
        {/* Mobile header */}
        <div className={`md:hidden fixed top-0 left-0 right-0 z-10 flex items-center justify-between p-3 border-b ${
          theme === "dark" ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"
        }`}>
          {activeChat && !showSidebar ? (
            <button onClick={() => setShowSidebar(true)} className="p-2">
              <ArrowLeft size={20} />
            </button>
          ) : (
            <div className="flex items-center">
              <MessageCircle size={20} className="text-purple-500 mr-2" />
              <span className="font-medium">Chat App</span>
            </div>
          )}
          
          <div className="flex items-center space-x-2">
            <button onClick={() => { setShowRequests(true); setShowSidebar(true); }} className="relative p-2">
              <Users size={20} />
              {requestsList.length > 0 && (
                <span className="absolute top-0 right-0 w-4 h-4 bg-red-500 rounded-full text-xs flex items-center justify-center">
                  {requestsList.length}
                </span>
              )}
            </button>
            <button onClick={toggleDarkMode} className="p-2">
              {darkMode ? <Sun size={20} /> : <Moon size={20} />}
            </button>
          </div>
        </div>
        
        {/* Sidebar */}
        {(showSidebar || window.innerWidth >= 768) && (
          <div className={`md:w-1/3 w-full border-r ${
            theme === "dark" ? "bg-gray-800 border-gray-700" : "bg-gray-50 border-gray-200"
          }`}>
            {/* User profile */}
            <div className={`p-4 border-b flex justify-between items-center ${
              theme === "dark" ? "border-gray-700" : "border-gray-200"
            } mt-12 md:mt-0`}>
              <div className="flex items-center space-x-2">
                <UserCircle size={24} className="text-purple-500" />
                <span className="font-medium truncate">{displayName || user.email}</span>
              </div>
              <div className="flex space-x-2">
                <button 
                  onClick={() => { loadUsers(); setShowUsersList(true); setShowRequests(false); }}
                  className="p-2 rounded-full"
                >
                  <Users size={20} />
                </button>
                <button 
                  onClick={() => { setShowRequests(true); setShowUsersList(false); }}
                  className="relative p-2 rounded-full"
                >
                  <Users size={20} />
                  {requestsList.length > 0 && (
                    <span className="absolute top-0 right-0 w-4 h-4 bg-red-500 rounded-full text-xs flex items-center justify-center">
                      {requestsList.length}
                    </span>
                  )}
                </button>
                <button onClick={handleLogout} className="p-2 rounded-full">
                  <LogOut size={20} />
                </button>
              </div>
            </div>
            
            {/* Users list */}
            {showUsersList && (
              <div className="overflow-y-auto h-[calc(100vh-132px)] md:h-[calc(100%-64px)]">
                <div className="p-3 border-b flex justify-between items-center">
                  <h2 className="font-semibold">All Users</h2>
                  <button 
                    onClick={() => setShowUsersList(false)}
                    className="p-1 text-sm"
                  >
                    Close
                  </button>
                </div>
                
                {usersList.length > 0 ? (
                  usersList.map((user) => (
                    <div key={user.id} className={`p-3 border-b flex justify-between items-center ${
                      theme === "dark" ? "border-gray-700" : "border-gray-200"
                    }`}>
                      <div className="flex items-center">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-r from-purple-400 to-pink-500 flex items-center justify-center text-white font-bold mr-3">
                          {user.displayName.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-medium">{user.displayName}</div>
                          <div className="text-xs text-gray-500">{user.email}</div>
                        </div>
                      </div>
                      <button 
                        onClick={() => sendFriendRequest(user.id)}
                        className="px-3 py-1 bg-purple-600 text-white text-sm rounded"
                      >
                        Add
                      </button>
                    </div>
                  ))
                ) : (
                  <div className="p-4 text-center text-gray-500">
                    No users found
                  </div>
                )}
              </div>
            )}
            
            {/* Requests list */}
            {showRequests && (
              <div className="overflow-y-auto h-[calc(100vh-132px)] md:h-[calc(100%-64px)]">
                <div className="p-3 border-b flex justify-between items-center">
                  <h2 className="font-semibold">Friend Requests</h2>
                  <button 
                    onClick={() => setShowRequests(false)}
                    className="p-1 text-sm"
                  >
                    Close
                  </button>
                </div>
                
                {requestsList.length > 0 ? (
                  requestsList.map((request) => (
                    <div key={request.id} className={`p-3 border-b ${
                      theme === "dark" ? "border-gray-700" : "border-gray-200"
                    }`}>
                      <div className="flex items-center mb-2">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-r from-purple-400 to-pink-500 flex items-center justify-center text-white font-bold mr-3">
                          {request.senderName.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-medium">{request.senderName}</div>
                          <div className="text-xs text-gray-500">{request.senderEmail}</div>
                        </div>
                      </div>
                      <div className="flex space-x-2">
                        <button 
                          onClick={() => handleRequestResponse(request.id, true)}
                          className="flex-1 py-1 bg-green-600 text-white rounded flex items-center justify-center"
                        >
                          <Check size={16} className="mr-1" />
                          Accept
                        </button>
                        <button 
                          onClick={() => handleRequestResponse(request.id, false)}
                          className="flex-1 py-1 bg-red-600 text-white rounded flex items-center justify-center"
                        >
                          <X size={16} className="mr-1" />
                          Decline
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-4 text-center text-gray-500">
                    No pending requests
                  </div>
                )}
              </div>
            )}
            
            {/* Contacts list */}
            {!showUsersList && !showRequests && (
              <div className="overflow-y-auto h-[calc(100vh-132px)] md:h-[calc(100%-64px)]">
                <div className="p-3 border-b">
                  <h2 className="font-semibold">Conversations</h2>
                </div>
                
                {contacts.length > 0 ? (
                  contacts.map((contact) => (
                    <div
                      key={contact.id}
                      onClick={() => openChat(contact)}
                      className={`p-3 border-b flex items-center cursor-pointer ${
                        activeChat && activeChat.chatId === contact.chatId
                          ? theme === "dark" ? "bg-gray-700" : "bg-purple-50"
                          : ""
                      } ${
                        theme === "dark" 
                          ? "border-gray-700 hover:bg-gray-700" 
                          : "border-gray-200 hover:bg-gray-100"
                      }`}
                    >
                      <div className="w-10 h-10 rounded-full bg-gradient-to-r from-purple-400 to-pink-500 flex items-center justify-center text-white font-bold mr-3">
                        {contact.displayName.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-grow min-w-0">
                        <div className="font-medium">{contact.displayName}</div>
                        {contact.lastMessage && (
                          <div className="text-xs text-gray-500 truncate">{contact.lastMessage}</div>
                        )}
                      </div>
                      <div className="text-xs text-gray-500 ml-2">
                        {formatTime(contact.timestamp)}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-4 text-center text-gray-500">
                    No conversations yet. Find users to start chatting.
                  </div>
                )}
              </div>
            )}
          </div>
        )}
        
        {/* Chat area */}
        <div className={`hidden md:flex md:w-2/3 w-full flex-col ${
          theme === "dark" ? "bg-gray-800" : "bg-white"
        } ${(showSidebar && window.innerWidth < 768) ? "hidden" : "flex"}`}>
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
                  className={`flex-grow px-3 py-2 border rounded-lg resize-none ${
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
                Or find users to start chatting
              </p>
            </div>
          )}
        </div>
        </div>
        </div>
        
  );
};

export default App;
